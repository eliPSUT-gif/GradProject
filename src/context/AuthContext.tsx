/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getInitials,
  SEED_MANAGED_USERS,
  type ManagedUser,
  type Role,
} from '../data/courses';
import { hasSupabaseConfig, supabasePatch, supabaseSelect, supabaseUpsert } from '../lib/supabase';

interface AuthSession {
  id: string;
  name: string;
  role: Role;
  initials: string;
  subtitle: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface PasswordChangeResult {
  success: boolean;
  error?: string;
}

interface UserFormInput {
  id: string;
  name: string;
  role: Role;
  subtitle: string;
  password: string;
  status: ManagedUser['status'];
}

interface AuthContextType {
  user: AuthSession | null;
  users: ManagedUser[];
  login: (credentials: { role: Role; id: string; password: string; rememberMe?: boolean }) => LoginResult;
  logout: () => void;
  isAuthenticated: boolean;
  changePassword: (userId: string, currentPassword: string, nextPassword: string) => PasswordChangeResult;
  upsertUser: (input: UserFormInput) => PasswordChangeResult;
  updateUserStatus: (userId: string, status: ManagedUser['status']) => void;
}

const USERS_KEY = 'smart-advisor-users-v2';
const LOCAL_SESSION_KEY = 'smart-advisor-session-local-v2';
const SESSION_SESSION_KEY = 'smart-advisor-session-session-v2';
const REMEMBER_ME_KEY = 'smart-advisor-remember-me-v2';
const ATTEMPTS_KEY = 'smart-advisor-login-attempts-v2';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000;
const MIN_PASSWORD_LENGTH = 10;
const DEFAULT_PASSWORD = 'ChangeMe@123';

const AuthContext = createContext<AuthContextType>({
  user: null,
  users: [],
  login: () => ({ success: false, error: 'Auth provider not ready.' }),
  logout: () => {},
  isAuthenticated: false,
  changePassword: () => ({ success: false, error: 'Auth provider not ready.' }),
  upsertUser: () => ({ success: false, error: 'Auth provider not ready.' }),
  updateUserStatus: () => {},
});

function mergeManagedUsers(...sources: ManagedUser[][]) {
  const orderedIds: string[] = [];
  const merged = new Map<string, ManagedUser>();

  sources.forEach((source) => {
    source.forEach((account) => {
      if (!merged.has(account.id)) {
        orderedIds.push(account.id);
      }

      merged.set(account.id, account);
    });
  });

  return orderedIds.map((id) => merged.get(id)!);
}

function getPasswordValidationError(password: string) {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }

  if (!/\d/.test(password)) {
    return 'Password must include at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character.';
  }

  return null;
}

function normalizeManagedUser(account: ManagedUser) {
  if (!getPasswordValidationError(account.password)) {
    return account;
  }

  const seedUser = SEED_MANAGED_USERS.find((seedAccount) => seedAccount.id === account.id);
  const fallbackPassword = seedUser?.password ?? DEFAULT_PASSWORD;

  return {
    ...account,
    password: getPasswordValidationError(fallbackPassword) ? DEFAULT_PASSWORD : fallbackPassword,
  };
}

function loadUsers() {
  const normalizedSeedUsers = SEED_MANAGED_USERS.map(normalizeManagedUser);

  if (typeof window === 'undefined') {
    return normalizedSeedUsers;
  }

  const saved = window.localStorage.getItem(USERS_KEY);
  if (!saved) {
    return normalizedSeedUsers;
  }

  try {
    return mergeManagedUsers(normalizedSeedUsers, JSON.parse(saved) as ManagedUser[]).map(normalizeManagedUser);
  } catch {
    return normalizedSeedUsers;
  }
}

function loadSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const persisted = window.localStorage.getItem(LOCAL_SESSION_KEY);
  const sessionOnly = window.sessionStorage.getItem(SESSION_SESSION_KEY);
  const saved = persisted ?? sessionOnly;
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as AuthSession;
  } catch {
    return null;
  }
}

function loadRememberSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.localStorage.getItem(LOCAL_SESSION_KEY)) {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

function loadAttempts() {
  if (typeof window === 'undefined') {
    return {} as Record<string, { count: number; lockedUntil?: string }>;
  }

  const saved = window.localStorage.getItem(ATTEMPTS_KEY);
  if (!saved) {
    return {} as Record<string, { count: number; lockedUntil?: string }>;
  }

  try {
    return JSON.parse(saved) as Record<string, { count: number; lockedUntil?: string }>;
  } catch {
    return {} as Record<string, { count: number; lockedUntil?: string }>;
  }
}

function toSessionUser(user: ManagedUser): AuthSession {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    initials: user.initials,
    subtitle: user.subtitle,
  };
}

function formatRemainingLockout(lockedUntil: string) {
  const diff = new Date(lockedUntil).getTime() - Date.now();
  const seconds = Math.max(Math.ceil(diff / 1000), 1);
  return `Too many failed attempts. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
}

export function getHomeRoute(role: Role) {
  if (role === 'advisor') return '/app/advisor';
  if (role === 'admin') return '/app/admin';
  return '/app/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<ManagedUser[]>(loadUsers);
  const [user, setUser] = useState<AuthSession | null>(loadSession);
  const [rememberSession, setRememberSession] = useState(loadRememberSession);
  const [attempts, setAttempts] = useState<Record<string, { count: number; lockedUntil?: string }>>(loadAttempts);

  useEffect(() => {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users.map(normalizeManagedUser)));
  }, [users]);

  useEffect(() => {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_SESSION_KEY);

    if (user) {
      const target = rememberSession ? window.localStorage : window.sessionStorage;
      target.setItem(rememberSession ? LOCAL_SESSION_KEY : SESSION_SESSION_KEY, JSON.stringify(user));
      window.localStorage.setItem(REMEMBER_ME_KEY, rememberSession ? 'true' : 'false');
    } else {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }, [rememberSession, user]);

  useEffect(() => {
    window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    let cancelled = false;

    const syncUsersFromSupabase = async () => {
      try {
        const remoteUsers = await supabaseSelect<Array<{
          university_id: string;
          role: Role;
          full_name: string;
          initials: string;
          subtitle: string;
          status: ManagedUser['status'];
          last_login_at: string | null;
        }>>(
          'app_users',
          'select=university_id,role,full_name,initials,subtitle,status,last_login_at'
        );

        if (cancelled) {
          return;
        }

        setUsers((current) => {
          const passwordById = new Map(current.map((account) => [account.id, account.password]));
          const remoteMappedUsers = remoteUsers.map((remoteUser) => {
            const seedUser = SEED_MANAGED_USERS.find((account) => account.id === remoteUser.university_id);

            return normalizeManagedUser({
              id: remoteUser.university_id,
              name: remoteUser.full_name,
              role: remoteUser.role,
              subtitle: remoteUser.subtitle,
              initials: remoteUser.initials,
              password: passwordById.get(remoteUser.university_id) ?? seedUser?.password ?? DEFAULT_PASSWORD,
              status: remoteUser.status,
              lastLogin: remoteUser.last_login_at ?? seedUser?.lastLogin ?? 'Never',
            } satisfies ManagedUser);
          });

          return mergeManagedUsers(SEED_MANAGED_USERS.map(normalizeManagedUser), current, remoteMappedUsers).map(normalizeManagedUser);
        });

        if (user) {
          const matchedUser = remoteUsers.find((account) => account.university_id === user.id);
          if (matchedUser) {
            setUser({
              id: matchedUser.university_id,
              name: matchedUser.full_name,
              role: matchedUser.role,
              initials: matchedUser.initials,
              subtitle: matchedUser.subtitle,
            });
          }
        }
      } catch (error) {
        console.error('Unable to sync users from Supabase.', error);
      }
    };

    void syncUsersFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = useCallback(
    ({ role, id, password, rememberMe = false }: { role: Role; id: string; password: string; rememberMe?: boolean }): LoginResult => {
      const normalizedId = id.trim();
      const attemptKey = normalizedId || `role:${role}`;
      const attemptState = attempts[attemptKey];
      if (attemptState?.lockedUntil && new Date(attemptState.lockedUntil).getTime() > Date.now()) {
        return { success: false, error: formatRemainingLockout(attemptState.lockedUntil) };
      }

      if (!normalizedId || !password) {
        return { success: false, error: 'Enter both your ID and password.' };
      }

      const matchedUser = users.find((account) => account.id.toLowerCase() === normalizedId.toLowerCase());
      if (!matchedUser || matchedUser.role !== role || matchedUser.password !== password) {
        const nextCount = (attemptState?.count ?? 0) + 1;
        const nextLockedUntil = nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : undefined;

        setAttempts((current) => ({
          ...current,
          [attemptKey]: {
            count: nextCount >= MAX_ATTEMPTS ? 0 : nextCount,
            lockedUntil: nextLockedUntil,
          },
        }));

        return {
          success: false,
          error: nextLockedUntil
            ? formatRemainingLockout(nextLockedUntil)
            : `Invalid credentials. ${MAX_ATTEMPTS - nextCount} attempt${MAX_ATTEMPTS - nextCount === 1 ? '' : 's'} remaining before temporary lockout.`,
        };
      }

      if (matchedUser.status !== 'active') {
        return { success: false, error: 'This account is inactive. Contact an administrator.' };
      }

      const nextUser = normalizeManagedUser({ ...matchedUser, lastLogin: new Date().toISOString() });
      setUsers((current) => current.map((account) => (account.id === matchedUser.id ? nextUser : account)));
      setRememberSession(Boolean(rememberMe));

      if (hasSupabaseConfig()) {
        void supabasePatch('app_users', `university_id=eq.${encodeURIComponent(matchedUser.id)}`, {
          last_login_at: nextUser.lastLogin,
          status: nextUser.status,
        }).catch((error) => {
          console.error('Unable to update Supabase login metadata.', error);
        });
      }

      setAttempts((current) => {
        const next = { ...current };
        delete next[attemptKey];
        return next;
      });
      setUser(toSessionUser(nextUser));
      return { success: true };
    },
    [attempts, users]
  );

  const logout = useCallback(() => {
    setUser(null);
    setRememberSession(false);
  }, []);

  const changePassword = useCallback(
    (userId: string, currentPassword: string, nextPassword: string): PasswordChangeResult => {
      const matchedUser = users.find((account) => account.id === userId);
      if (!matchedUser) {
        return { success: false, error: 'User account was not found.' };
      }

      if (matchedUser.password !== currentPassword) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      const validationError = getPasswordValidationError(nextPassword);
      if (validationError) {
        return { success: false, error: validationError };
      }

      setUsers((current) =>
        current.map((account) =>
          account.id === userId ? { ...account, password: nextPassword } : account
        )
      );
      return { success: true };
    },
    [users]
  );

  const upsertUser = useCallback((input: UserFormInput): PasswordChangeResult => {
    const validationError = getPasswordValidationError(input.password);
    if (validationError) {
      return { success: false, error: validationError };
    }

    setUsers((current) => {
      const nextUser = normalizeManagedUser({
        ...input,
        initials: getInitials(input.name),
        lastLogin: current.find((account) => account.id === input.id)?.lastLogin ?? 'Never',
      });

      const exists = current.some((account) => account.id === input.id);
      const nextUsers = exists
        ? current.map((account) => (account.id === input.id ? nextUser : account))
        : [nextUser, ...current];

      if (user?.id === input.id) {
        setUser(toSessionUser(nextUser));
      }

      return nextUsers;
    });

    if (hasSupabaseConfig()) {
      void supabaseUpsert(
        'app_users',
        {
          university_id: input.id,
          role: input.role,
          full_name: input.name,
          initials: getInitials(input.name),
          subtitle: input.subtitle,
          status: input.status,
        },
        'university_id'
      ).catch((error) => {
        console.error('Unable to upsert Supabase user.', error);
      });
    }

    return { success: true };
  }, [user?.id]);

  const updateUserStatus = useCallback((userId: string, status: ManagedUser['status']) => {
    setUsers((current) =>
      current.map((account) => (account.id === userId ? { ...account, status } : account))
    );

    if (hasSupabaseConfig()) {
      void supabasePatch('app_users', `university_id=eq.${encodeURIComponent(userId)}`, { status }).catch((error) => {
        console.error('Unable to update Supabase user status.', error);
      });
    }

    if (user?.id === userId && status !== 'active') {
      setUser(null);
      setRememberSession(false);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      users,
      login,
      logout,
      isAuthenticated: !!user,
      changePassword,
      upsertUser,
      updateUserStatus,
    }),
    [changePassword, login, logout, updateUserStatus, upsertUser, user, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export type { AuthSession, LoginResult, PasswordChangeResult, UserFormInput };

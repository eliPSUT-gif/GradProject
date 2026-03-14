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
  login: (credentials: { role: Role; id: string; password: string }) => LoginResult;
  logout: () => void;
  isAuthenticated: boolean;
  changePassword: (userId: string, currentPassword: string, nextPassword: string) => PasswordChangeResult;
  upsertUser: (input: UserFormInput) => void;
  updateUserStatus: (userId: string, status: ManagedUser['status']) => void;
}

const USERS_KEY = 'smart-advisor-users';
const SESSION_KEY = 'smart-advisor-session';
const ATTEMPTS_KEY = 'smart-advisor-login-attempts';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  users: [],
  login: () => ({ success: false, error: 'Auth provider not ready.' }),
  logout: () => {},
  isAuthenticated: false,
  changePassword: () => ({ success: false, error: 'Auth provider not ready.' }),
  upsertUser: () => {},
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

function loadUsers() {
  if (typeof window === 'undefined') {
    return SEED_MANAGED_USERS;
  }

  const saved = window.localStorage.getItem(USERS_KEY);
  if (!saved) {
    return SEED_MANAGED_USERS;
  }

  try {
    return mergeManagedUsers(SEED_MANAGED_USERS, JSON.parse(saved) as ManagedUser[]);
  } catch {
    return SEED_MANAGED_USERS;
  }
}

function loadSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(SESSION_KEY);
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as AuthSession;
  } catch {
    return null;
  }
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
  const [attempts, setAttempts] = useState<Record<string, { count: number; lockedUntil?: string }>>(loadAttempts);

  useEffect(() => {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

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

            return {
              id: remoteUser.university_id,
              name: remoteUser.full_name,
              role: remoteUser.role,
              subtitle: remoteUser.subtitle,
              initials: remoteUser.initials,
              password: passwordById.get(remoteUser.university_id) ?? seedUser?.password ?? 'password123',
              status: remoteUser.status,
              lastLogin: remoteUser.last_login_at ?? seedUser?.lastLogin ?? 'Never',
            } satisfies ManagedUser;
          });

          return mergeManagedUsers(SEED_MANAGED_USERS, current, remoteMappedUsers);
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
    ({ role, id, password }: { role: Role; id: string; password: string }): LoginResult => {
      const normalizedId = id.trim();
      const attemptKey = normalizedId || `role:${role}`;
      const attemptState = attempts[attemptKey];
      if (attemptState?.lockedUntil && new Date(attemptState.lockedUntil).getTime() > Date.now()) {
        return { success: false, error: formatRemainingLockout(attemptState.lockedUntil) };
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

      const nextUser = { ...matchedUser, lastLogin: new Date().toISOString() };
      setUsers((current) => current.map((account) => (account.id === matchedUser.id ? nextUser : account)));
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

      if (nextPassword.trim().length < 8) {
        return { success: false, error: 'New password must be at least 8 characters long.' };
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

  const upsertUser = useCallback((input: UserFormInput) => {
    setUsers((current) => {
      const nextUser: ManagedUser = {
        ...input,
        initials: getInitials(input.name),
        lastLogin: current.find((account) => account.id === input.id)?.lastLogin ?? 'Never',
      };

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
export type { AuthSession, LoginResult, UserFormInput };







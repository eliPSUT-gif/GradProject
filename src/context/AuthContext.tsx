/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getInitials,
  SEED_MANAGED_USERS,
  type ManagedUser,
  type Role,
} from '../data/courses';
import {
  getSupabaseConfigError,
  getSupabaseSession,
  hasSupabaseConfig,
  isLocalDemoModeEnabled,
  onSupabaseAuthStateChange,
  supabaseDelete,
  supabasePatch,
  supabaseSelect,
  supabaseSignInWithPassword,
  supabaseSignOut,
  supabaseUpdateCurrentUserPassword,
  supabaseUpsert,
} from '../lib/supabase';

interface AuthSession {
  id: string;
  name: string;
  role: Role;
  initials: string;
  subtitle: string;
  email?: string;
  appUserId?: string;
  authUserId?: string | null;
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
  email?: string | null;
}

interface RemoteAppUserRow {
  id: string;
  auth_user_id: string | null;
  university_id: string;
  role: Role;
  full_name: string;
  initials: string;
  email: string | null;
  subtitle: string;
  status: ManagedUser['status'];
  last_login_at: string | null;
  last_seen_at: string | null;
}

interface AuthContextType {
  user: AuthSession | null;
  users: ManagedUser[];
  login: (credentials: { role: Role; id: string; password: string; rememberMe?: boolean }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  changePassword: (userId: string, currentPassword: string, nextPassword: string) => Promise<PasswordChangeResult>;
  resetUserPassword: (userId: string, nextPassword: string) => Promise<PasswordChangeResult>;
  upsertUser: (input: UserFormInput) => PasswordChangeResult;
  updateUserStatus: (userId: string, status: ManagedUser['status']) => void;
  deleteUser: (userId: string) => void;
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
const USER_SYNC_INTERVAL_MS = 30000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  users: [],
  login: async () => ({ success: false, error: 'Auth provider not ready.' }),
  logout: async () => {},
  isAuthenticated: false,
  isAuthReady: false,
  changePassword: async () => ({ success: false, error: 'Auth provider not ready.' }),
  resetUserPassword: async () => ({ success: false, error: 'Auth provider not ready.' }),
  upsertUser: () => ({ success: false, error: 'Auth provider not ready.' }),
  updateUserStatus: () => {},
  deleteUser: () => {},
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

function buildManagedEmail(userId: string, role: Role) {
  if (/^\S+@\S+\.\S+$/.test(userId)) {
    return userId;
  }

  const domain = role === 'student' ? 'students.example.edu' : 'staff.example.edu';
  return `${userId.toLowerCase()}@${domain}`;
}

async function callAdminAuthEndpoint(path: string, payload: unknown) {
  const {
    data: { session },
  } = await getSupabaseSession();

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Admin auth request failed with ${response.status}`);
  }
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

  if (hasSupabaseConfig()) {
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
    email: user.email,
    appUserId: user.appUserId,
    authUserId: user.authUserId ?? null,
  };
}

function mapRemoteUser(row: RemoteAppUserRow, passwordById: Map<string, string>) {
  const seedUser = SEED_MANAGED_USERS.find((account) => account.id === row.university_id);

  return normalizeManagedUser({
    id: row.university_id,
    name: row.full_name,
    role: row.role,
    subtitle: row.subtitle,
    initials: row.initials,
    password: passwordById.get(row.university_id) ?? seedUser?.password ?? DEFAULT_PASSWORD,
    status: row.status,
    lastLogin: row.last_login_at ?? seedUser?.lastLogin ?? 'Never',
    email: row.email ?? seedUser?.email,
    appUserId: row.id,
    authUserId: row.auth_user_id,
    lastSeenAt: row.last_seen_at,
  } satisfies ManagedUser);
}

function areManagedUsersEqual(left: ManagedUser[], right: ManagedUser[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((account, index) => {
    const other = right[index];
    return Boolean(other)
      && account.id === other.id
      && account.name === other.name
      && account.role === other.role
      && account.subtitle === other.subtitle
      && account.initials === other.initials
      && account.password === other.password
      && account.status === other.status
      && account.lastLogin === other.lastLogin
      && (account.email ?? null) === (other.email ?? null)
      && (account.appUserId ?? null) === (other.appUserId ?? null)
      && (account.authUserId ?? null) === (other.authUserId ?? null)
      && (account.lastSeenAt ?? null) === (other.lastSeenAt ?? null);
  });
}

function areAuthSessionsEqual(left: AuthSession | null, right: AuthSession | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.id === right.id
    && left.name === right.name
    && left.role === right.role
    && left.initials === right.initials
    && left.subtitle === right.subtitle
    && (left.email ?? null) === (right.email ?? null)
    && (left.appUserId ?? null) === (right.appUserId ?? null)
    && (left.authUserId ?? null) === (right.authUserId ?? null);
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
  const [user, setUser] = useState<AuthSession | null>(() => (isLocalDemoModeEnabled() ? loadSession() : null));
  const [rememberSession, setRememberSession] = useState(loadRememberSession);
  const [attempts, setAttempts] = useState<Record<string, { count: number; lockedUntil?: string }>>(loadAttempts);
  const [isAuthReady, setIsAuthReady] = useState(!hasSupabaseConfig());

  const usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const syncUsersFromSupabase = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      return [] as RemoteAppUserRow[];
    }

    const remoteUsers = await supabaseSelect<RemoteAppUserRow[]>(
      'app_users',
      'select=id,auth_user_id,university_id,role,full_name,initials,email,subtitle,status,last_login_at,last_seen_at'
    );

    setUsers((current) => {
      const passwordById = new Map(current.map((account) => [account.id, account.password]));
      const remoteMappedUsers = remoteUsers.map((remoteUser) => mapRemoteUser(remoteUser, passwordById));
      const nextUsers = mergeManagedUsers(SEED_MANAGED_USERS.map(normalizeManagedUser), current, remoteMappedUsers).map(normalizeManagedUser);
      return areManagedUsersEqual(current, nextUsers) ? current : nextUsers;
    });

    setUser((current) => {
      if (!current) {
        return current;
      }

      const matchedUser = remoteUsers.find((account) => account.university_id === current.id);
      if (!matchedUser) {
        return current;
      }

      const nextUser = {
        id: matchedUser.university_id,
        name: matchedUser.full_name,
        role: matchedUser.role,
        initials: matchedUser.initials,
        subtitle: matchedUser.subtitle,
        email: matchedUser.email ?? current.email,
        appUserId: matchedUser.id,
        authUserId: matchedUser.auth_user_id,
      } satisfies AuthSession;

      return areAuthSessionsEqual(current, nextUser) ? current : nextUser;
    });

    return remoteUsers;
  }, []);

  const fetchRemoteUserByUniversityId = useCallback(async (universityId: string) => {
    if (!hasSupabaseConfig()) {
      return null;
    }

    const encodedUniversityId = encodeURIComponent(universityId);
    const remoteRows = await supabaseSelect<RemoteAppUserRow[]>(
      'app_users',
      `select=id,auth_user_id,university_id,role,full_name,initials,email,subtitle,status,last_login_at,last_seen_at&university_id=eq.${encodedUniversityId}&limit=1`
    );

    const resolved = remoteRows[0];
    if (!resolved) {
      return null;
    }

    const passwordById = new Map(usersRef.current.map((account) => [account.id, account.password]));
    const mapped = mapRemoteUser(resolved, passwordById);
    setUsers((current) => {
      const nextUsers = mergeManagedUsers(SEED_MANAGED_USERS.map(normalizeManagedUser), current, [mapped]).map(normalizeManagedUser);
      return areManagedUsersEqual(current, nextUsers) ? current : nextUsers;
    });
    return mapped;
  }, []);


  const resolveAppUserFromAuth = useCallback(async (authUser: User | null) => {
    if (!authUser || !hasSupabaseConfig()) {
      return null;
    }

    const authUserId = authUser.id;
    const encodedAuthUserId = encodeURIComponent(authUserId);
    let remoteRows = await supabaseSelect<RemoteAppUserRow[]>(
      'app_users',
      `select=id,auth_user_id,university_id,role,full_name,initials,email,subtitle,status,last_login_at,last_seen_at&auth_user_id=eq.${encodedAuthUserId}&limit=1`
    );

    if (remoteRows.length === 0 && authUser.email) {
      const encodedEmail = encodeURIComponent(authUser.email);
      remoteRows = await supabaseSelect<RemoteAppUserRow[]>(
        'app_users',
        `select=id,auth_user_id,university_id,role,full_name,initials,email,subtitle,status,last_login_at,last_seen_at&email=eq.${encodedEmail}&limit=1`
      );

      if (remoteRows.length > 0 && remoteRows[0]?.auth_user_id !== authUserId) {
        await supabasePatch<RemoteAppUserRow[]>(
          'app_users',
          `id=eq.${encodeURIComponent(remoteRows[0].id)}`,
          { auth_user_id: authUserId }
        );
        remoteRows = [{ ...remoteRows[0], auth_user_id: authUserId }];
      }
    }

    const resolved = remoteRows[0];
    if (!resolved) {
      return null;
    }

    const passwordById = new Map(usersRef.current.map((account) => [account.id, account.password]));
    const mapped = mapRemoteUser(resolved, passwordById);

    setUsers((current) => {
      const nextUsers = mergeManagedUsers(SEED_MANAGED_USERS.map(normalizeManagedUser), current, [mapped]).map(normalizeManagedUser);
      return areManagedUsersEqual(current, nextUsers) ? current : nextUsers;
    });

    return toSessionUser(mapped);
  }, []);

  useEffect(() => {
    if (hasSupabaseConfig()) {
      window.localStorage.removeItem(USERS_KEY);
      return;
    }

    window.localStorage.setItem(USERS_KEY, JSON.stringify(users.map(normalizeManagedUser)));
  }, [users]);

  useEffect(() => {
    if (!isLocalDemoModeEnabled()) {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_SESSION_KEY);
      window.localStorage.removeItem(REMEMBER_ME_KEY);
      return;
    }

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

    const hydrate = async () => {
      try {
        await syncUsersFromSupabase();
        const {
          data: { session },
        } = await getSupabaseSession();

        if (cancelled) {
          return;
        }

        if (!session?.user) {
          setUser(null);
          setIsAuthReady(true);
          return;
        }

        const resolved = await resolveAppUserFromAuth(session.user);
        if (cancelled) {
          return;
        }

        setUser(resolved);
        setIsAuthReady(true);
      } catch (error) {
        console.error('Unable to initialize Supabase auth session.', error);
        if (!cancelled) {
          setUser(null);
          setIsAuthReady(true);
        }
      }
    };

    void hydrate();

    const { data: authListener } = onSupabaseAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      // Ignore transient null sessions (e.g. during TOKEN_REFRESHED)
      if (!session?.user) {
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void (async () => {
          if (cancelled) return;
          const resolved = await resolveAppUserFromAuth(session.user);
          if (cancelled) return;
          if (resolved) {
            setUser(resolved);
          }
          setIsAuthReady(true);
        })();
      }
    });

    const syncInterval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void syncUsersFromSupabase();
    }, USER_SYNC_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUsersFromSupabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      window.clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resolveAppUserFromAuth, syncUsersFromSupabase]);

  const login = useCallback(
    async ({ role, id, password, rememberMe = false }: { role: Role; id: string; password: string; rememberMe?: boolean }): Promise<LoginResult> => {
      const normalizedId = id.trim();
      const attemptKey = normalizedId || `role:${role}`;
      const attemptState = attempts[attemptKey];
      if (attemptState?.lockedUntil && new Date(attemptState.lockedUntil).getTime() > Date.now()) {
        return { success: false, error: formatRemainingLockout(attemptState.lockedUntil) };
      }

      if (!normalizedId || !password) {
        return { success: false, error: 'Enter both your ID and password.' };
      }

      const registerFailedAttempt = () => {
        const nextCount = (attemptState?.count ?? 0) + 1;
        const nextLockedUntil = nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : undefined;

        setAttempts((current) => ({
          ...current,
          [attemptKey]: {
            count: nextCount >= MAX_ATTEMPTS ? 0 : nextCount,
            lockedUntil: nextLockedUntil,
          },
        }));

        return nextLockedUntil
          ? formatRemainingLockout(nextLockedUntil)
          : `Invalid credentials. ${MAX_ATTEMPTS - nextCount} attempt${MAX_ATTEMPTS - nextCount === 1 ? '' : 's'} remaining before temporary lockout.`;
      };

      if (!hasSupabaseConfig() && !isLocalDemoModeEnabled()) {
        return {
          success: false,
          error: `${getSupabaseConfigError()} Add the Supabase URL and anon key to the deployment environment and rebuild.`,
        };
      }

      if (hasSupabaseConfig()) {
        let matchedUser = usersRef.current.find((account) => account.id.toLowerCase() === normalizedId.toLowerCase());
        const remoteMatchedUser = await fetchRemoteUserByUniversityId(normalizedId);
        if (remoteMatchedUser) {
          matchedUser = remoteMatchedUser;
        }
        if (!matchedUser || matchedUser.role !== role) {
          return { success: false, error: registerFailedAttempt() };
        }

        if (matchedUser.status !== 'active') {
          return { success: false, error: 'This account is inactive. Contact an administrator.' };
        }

        if (!matchedUser.email) {
          return { success: false, error: 'This account is missing an email address in public.app_users. Add the email in Supabase and try again.' };
        }

        const signInResult = await supabaseSignInWithPassword(matchedUser.email, password);
        if (signInResult.error) {
          setIsAuthReady(true);
          return { success: false, error: registerFailedAttempt() };
        }

        const resolved = await resolveAppUserFromAuth(signInResult.data.user ?? null);
        if (!resolved || resolved.role !== role || resolved.id.toLowerCase() !== normalizedId.toLowerCase()) {
          await supabaseSignOut();
          setIsAuthReady(true);
          return { success: false, error: 'Your authenticated Supabase account is not linked to the selected app user.' };
        }

        const lastLogin = new Date().toISOString();
        setRememberSession(Boolean(rememberMe));
        setUsers((current) =>
          current.map((account) =>
            account.id === resolved.id ? { ...account, lastLogin } : account
          )
        );
        setUser({ ...resolved });
        setAttempts((current) => {
          const next = { ...current };
          delete next[attemptKey];
          return next;
        });
        setIsAuthReady(true);

        void supabasePatch(
          'app_users',
          `university_id=eq.${encodeURIComponent(resolved.id)}`,
          {
            last_login_at: lastLogin,
            status: matchedUser.status,
            auth_user_id: resolved.authUserId,
          }
        ).catch((error) => {
          console.error('Unable to update Supabase login metadata.', error);
        });

        void syncUsersFromSupabase();
        return { success: true };
      }

      const matchedUser = usersRef.current.find((account) => account.id.toLowerCase() === normalizedId.toLowerCase());
      if (!matchedUser || matchedUser.role !== role || matchedUser.password !== password) {
        return { success: false, error: registerFailedAttempt() };
      }

      if (matchedUser.status !== 'active') {
        return { success: false, error: 'This account is inactive. Contact an administrator.' };
      }

      const nextUser = normalizeManagedUser({ ...matchedUser, lastLogin: new Date().toISOString() });
      setUsers((current) => current.map((account) => (account.id === matchedUser.id ? nextUser : account)));
      setRememberSession(Boolean(rememberMe));
      setAttempts((current) => {
        const next = { ...current };
        delete next[attemptKey];
        return next;
      });
      setUser(toSessionUser(nextUser));
      return { success: true };
    },
    [attempts, fetchRemoteUserByUniversityId, resolveAppUserFromAuth, syncUsersFromSupabase]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setRememberSession(false);
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_SESSION_KEY);

    if (hasSupabaseConfig()) {
      const { error } = await supabaseSignOut();
      if (error) {
        console.error('Unable to sign out from Supabase.', error);
      }
    }
  }, []);

  const changePassword = useCallback(
    async (userId: string, currentPassword: string, nextPassword: string): Promise<PasswordChangeResult> => {
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

      if (!hasSupabaseConfig() && !isLocalDemoModeEnabled()) {
        return {
          success: false,
          error: `${getSupabaseConfigError()} Add the Supabase URL and anon key to the deployment environment and rebuild.`,
        };
      }

      if (hasSupabaseConfig()) {
        const result = await supabaseUpdateCurrentUserPassword(nextPassword);
        if (result.error) {
          return { success: false, error: result.error.message };
        }
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

    const existingUser = users.find((account) => account.id === input.id);
    const nextEmail = input.email ?? existingUser?.email ?? buildManagedEmail(input.id, input.role);

    setUsers((current) => {
      const nextUser = normalizeManagedUser({
        ...input,
        initials: getInitials(input.name),
        lastLogin: existingUser?.lastLogin ?? 'Never',
        email: nextEmail,
        appUserId: existingUser?.appUserId,
        authUserId: existingUser?.authUserId ?? null,
        lastSeenAt: existingUser?.lastSeenAt ?? null,
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
      void callAdminAuthEndpoint('/api/admin-create-user', {
        universityId: input.id,
        email: nextEmail,
        password: input.password,
        role: input.role,
        fullName: input.name,
        subtitle: input.subtitle,
        status: input.status,
      }).catch((error) => {
        console.error('Unable to create Supabase auth user through admin endpoint.', error);
      });

      void supabaseUpsert(
        'app_users',
        {
          university_id: input.id,
          role: input.role,
          full_name: input.name,
          initials: getInitials(input.name),
          subtitle: input.subtitle,
          status: input.status,
          email: nextEmail,
        },
        'university_id'
      ).catch((error) => {
        console.error('Unable to upsert Supabase user.', error);
      });
    }

    return { success: true };
  }, [user?.id, users]);

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

  const deleteUser = useCallback((userId: string) => {
    setUsers((current) => current.filter((account) => account.id !== userId));

    if (hasSupabaseConfig()) {
      void supabaseDelete('app_users', `university_id=eq.${encodeURIComponent(userId)}`).catch((error) => {
        console.error('Unable to delete Supabase user.', error);
      });
    }

    if (user?.id === userId) {
      setUser(null);
      setRememberSession(false);
    }
  }, [user?.id]);

  const resetUserPassword = useCallback(
    async (userId: string, nextPassword: string): Promise<PasswordChangeResult> => {
      const validationError = getPasswordValidationError(nextPassword);
      if (validationError) {
        return { success: false, error: validationError };
      }

      if (!users.some((account) => account.id === userId)) {
        return { success: false, error: 'User account was not found.' };
      }

      if (hasSupabaseConfig()) {
        try {
          await callAdminAuthEndpoint('/api/admin-reset-password', {
            universityId: userId,
            password: nextPassword,
          });
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to reset password.',
          };
        }
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

  const value = useMemo(
    () => ({
      user,
      users,
      login,
      logout,
      isAuthenticated: !!user,
      isAuthReady,
      changePassword,
      resetUserPassword,
      upsertUser,
      updateUserStatus,
      deleteUser,
    }),
    [changePassword, deleteUser, isAuthReady, login, logout, resetUserPassword, updateUserStatus, upsertUser, user, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export type { AuthSession, LoginResult, PasswordChangeResult, UserFormInput };





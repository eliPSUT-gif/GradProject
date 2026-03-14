import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const missingSupabaseConfig = [
  !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
].filter(Boolean) as string[];

const supabaseClient: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      },
    })
  : null;

async function getAccessToken() {
  if (!supabaseClient) {
    return null;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  return session?.access_token ?? null;
}

async function buildHeaders(extraHeaders: HeadersInit = {}) {
  const accessToken = await getAccessToken();

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...extraHeaders,
  };
}

function buildSelectUrl(table: string, query: string) {
  return query
    ? `${supabaseUrl}/rest/v1/${table}?${query}`
    : `${supabaseUrl}/rest/v1/${table}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed with ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function hasSupabaseConfig() {
  return missingSupabaseConfig.length === 0;
}

export function isLocalDemoModeEnabled() {
  return import.meta.env.DEV && !hasSupabaseConfig();
}

export function getSupabaseConfigError() {
  if (hasSupabaseConfig()) {
    return null;
  }

  return `Supabase is not configured for this build. Missing ${missingSupabaseConfig.join(' and ')}.`;
}

export function getSupabaseClient() {
  return supabaseClient;
}

export async function getSupabaseSession() {
  if (!supabaseClient) {
    return { data: { session: null as Session | null }, error: null };
  }

  return supabaseClient.auth.getSession();
}

export async function getSupabaseUser() {
  if (!supabaseClient) {
    return { data: { user: null as User | null }, error: null };
  }

  return supabaseClient.auth.getUser();
}

export async function supabaseSignInWithPassword(email: string, password: string) {
  if (!supabaseClient) {
    return {
      data: { session: null as Session | null, user: null as User | null },
      error: new Error('Supabase is not configured.'),
    };
  }

  return supabaseClient.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut() {
  if (!supabaseClient) {
    return { error: null };
  }

  return supabaseClient.auth.signOut();
}

export async function supabaseUpdateCurrentUserPassword(password: string) {
  if (!supabaseClient) {
    return { data: { user: null as User | null }, error: new Error('Supabase is not configured.') };
  }

  return supabaseClient.auth.updateUser({ password });
}

export function onSupabaseAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  if (!supabaseClient) {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
    };
  }

  return supabaseClient.auth.onAuthStateChange(callback);
}

export async function supabaseSelect<T>(table: string, query: string) {
  const response = await fetch(buildSelectUrl(table, query), {
    cache: 'no-store',
    headers: await buildHeaders(),
  });

  return parseResponse<T>(response);
}

export async function supabaseInsert<T>(table: string, payload: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    cache: 'no-store',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}

export async function supabaseUpsert<T>(table: string, payload: unknown, onConflict?: string) {
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    method: 'POST',
    cache: 'no-store',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}

export async function supabasePatch<T>(table: string, query: string, payload: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}

export async function supabaseDelete(table: string, query: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    cache: 'no-store',
    headers: await buildHeaders({ Prefer: 'return=minimal' }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase delete failed with ${response.status}`);
  }
}

export async function supabaseRpc<T>(fn: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    cache: 'no-store',
    headers: await buildHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}



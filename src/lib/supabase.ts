import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const supabaseClient: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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

function buildHeaders(extraHeaders: HeadersInit = {}) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...extraHeaders,
  };
}

function buildSelectUrl(table: string, query: string) {
  const separator = query ? '&' : '';
  return `${supabaseUrl}/rest/v1/${table}?${query}${separator}_ts=${Date.now()}`;
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
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient() {
  return supabaseClient;
}

export async function supabaseSelect<T>(table: string, query: string) {
  const response = await fetch(buildSelectUrl(table, query), {
    cache: 'no-store',
    headers: buildHeaders(),
  });

  return parseResponse<T>(response);
}

export async function supabaseInsert<T>(table: string, payload: unknown) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    cache: 'no-store',
    headers: buildHeaders({
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
    headers: buildHeaders({
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
    headers: buildHeaders({
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
    headers: buildHeaders({ Prefer: 'return=minimal' }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase delete failed with ${response.status}`);
  }
}

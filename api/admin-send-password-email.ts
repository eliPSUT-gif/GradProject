import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendGeneratedPasswordEmail } from './_email.js';

type Role = 'student' | 'advisor' | 'admin';

const MIN_PASSWORD_LENGTH = 10;

function getPasswordValidationError(password: string) {
  if (password.trim().length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return null;
}

function getSupabaseServerClient(request: VercelRequest) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY;
  const token = String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();

  if (!supabaseUrl || !authKey) {
    const missing = [
      !supabaseUrl ? 'SUPABASE_URL' : null,
      !authKey ? 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY' : null,
    ].filter(Boolean).join(' and ');
    throw new Error(`Supabase server environment is not configured. Add ${missing} to Vercel, then redeploy.`);
  }

  if (!token) {
    throw new Error('Missing admin session token.');
  }

  return {
    token,
    supabase: createClient(supabaseUrl, authKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }),
  };
}

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>['supabase'];

async function requireAdmin(
  token: string,
  supabase: SupabaseServerClient
) {
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Error('Invalid admin session token.');
  }

  const { data: adminRows, error: profileError } = await supabase
    .from('app_users')
    .select('id,role')
    .or(`auth_user_id.eq.${authData.user.id},email.eq.${authData.user.email ?? ''}`)
    .eq('role', 'admin')
    .eq('status', 'active')
    .limit(1);

  if (profileError || !adminRows || adminRows.length === 0) {
    throw new Error('Only active admins can perform this operation.');
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body) as {
          universityId?: string;
          password?: string;
          action?: 'created' | 'reset';
          fullName?: string;
          role?: Role;
        }
      : request.body;
    const universityId = String(payload?.universityId ?? '').trim();
    const password = String(payload?.password ?? '');
    const action = payload?.action === 'created' ? 'created' : 'reset';
    const fallbackFullName = String(payload?.fullName ?? '').trim();
    const fallbackRole = payload?.role;

    if (!universityId || !password) {
      response.status(400).json({ success: false, error: 'Missing user ID or temporary password.' });
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      response.status(400).json({ success: false, error: passwordError });
      return;
    }

    const { token, supabase } = getSupabaseServerClient(request);
    await requireAdmin(token, supabase);

    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('full_name,role')
      .eq('university_id', universityId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!appUser && (!fallbackFullName || !fallbackRole)) {
      response.status(404).json({ success: false, error: 'User account was not found.' });
      return;
    }

    await sendGeneratedPasswordEmail({
      fullName: appUser?.full_name ?? fallbackFullName,
      universityId,
      role: (appUser?.role ?? fallbackRole) as Role,
      password,
      action,
    });

    response.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin generated password email failed.', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to send generated password email.',
    });
  }
}

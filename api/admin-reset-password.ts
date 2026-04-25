import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(request: VercelRequest, supabase: ReturnType<typeof getSupabaseAdminClient>) {
  const token = String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new Error('Missing admin session token.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Error('Invalid admin session token.');
  }

  const { data: adminRows, error: profileError } = await supabase
    .from('app_users')
    .select('id,role')
    .or(`auth_user_id.eq.${authData.user.id},email.eq.${authData.user.email ?? ''}`)
    .eq('role', 'admin')
    .limit(1);

  if (profileError || !adminRows || adminRows.length === 0) {
    throw new Error('Only admins can perform this operation.');
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  const payload = typeof request.body === 'string'
    ? JSON.parse(request.body) as { universityId?: string; password?: string }
    : request.body;
  const universityId = String(payload?.universityId ?? '').trim();
  const password = String(payload?.password ?? '');

  if (!universityId || !password) {
    response.status(400).json({ success: false, error: 'Missing user ID or temporary password.' });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    await requireAdmin(request, supabase);

    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('auth_user_id,email')
      .eq('university_id', universityId)
      .maybeSingle();

    if (userError || !appUser?.auth_user_id) {
      throw new Error('Supabase auth user was not found for this account.');
    }

    const { error: resetError } = await supabase.auth.admin.updateUserById(appUser.auth_user_id, {
      password,
      email: appUser.email ?? undefined,
    });

    if (resetError) {
      throw resetError;
    }

    response.status(200).json({ success: true });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to reset password.',
    });
  }
}

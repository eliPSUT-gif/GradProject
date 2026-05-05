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

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  email: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data.users as Array<{ id: string; email?: string | null }>;
    const foundUser = users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (foundUser) {
      return foundUser.id;
    }

    if (users.length < perPage) {
      return null;
    }
  }

  return null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body) as { universityId?: string }
      : request.body;
    const universityId = String(payload?.universityId ?? '').trim();

    if (!universityId) {
      response.status(400).json({ success: false, error: 'Missing user ID.' });
      return;
    }

    const supabase = getSupabaseAdminClient();
    await requireAdmin(request, supabase);

    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('auth_user_id,email')
      .eq('university_id', universityId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const authUserId = appUser?.auth_user_id
      ?? (appUser?.email ? await findAuthUserIdByEmail(supabase, appUser.email) : null);

    if (authUserId) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId);
      if (authDeleteError) {
        throw authDeleteError;
      }
    }

    const { error: appDeleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('university_id', universityId);

    if (appDeleteError) {
      throw appDeleteError;
    }

    response.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin delete user failed.', error);
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to delete user.',
    });
  }
}

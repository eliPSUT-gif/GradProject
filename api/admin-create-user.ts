import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Role = 'student' | 'advisor' | 'admin';

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
    ? JSON.parse(request.body) as {
        universityId?: string;
        email?: string;
        password?: string;
        role?: Role;
        fullName?: string;
        subtitle?: string;
        status?: 'active' | 'inactive';
      }
    : request.body;
  const universityId = String(payload?.universityId ?? '').trim();
  const email = String(payload?.email ?? '').trim();
  const password = String(payload?.password ?? '');
  const role = payload?.role;
  const fullName = String(payload?.fullName ?? '').trim();
  const subtitle = String(payload?.subtitle ?? '').trim();
  const status = payload?.status ?? 'active';

  if (!universityId || !email || !password || !role || !fullName) {
    response.status(400).json({ success: false, error: 'Missing required user fields.' });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    await requireAdmin(request, supabase);

    const { data: existingAppUser } = await supabase
      .from('app_users')
      .select('id,auth_user_id')
      .eq('university_id', universityId)
      .maybeSingle();

    let authUserId = existingAppUser?.auth_user_id ?? null;
    if (authUserId) {
      const { error } = await supabase.auth.admin.updateUserById(authUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: { university_id: universityId, role },
      });
      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { university_id: universityId, role },
      });
      if (error) {
        throw error;
      }
      authUserId = data.user?.id ?? null;
    }

    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    const { error: appUserError } = await supabase
      .from('app_users')
      .upsert({
        university_id: universityId,
        auth_user_id: authUserId,
        role,
        full_name: fullName,
        initials,
        email,
        subtitle,
        status,
      }, { onConflict: 'university_id' });

    if (appUserError) {
      throw appUserError;
    }

    response.status(200).json({ success: true, authUserId });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to create user.',
    });
  }
}

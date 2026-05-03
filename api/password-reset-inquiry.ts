import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type InquiryRole = 'student' | 'advisor';

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

function isInquiryRole(role: unknown): role is InquiryRole {
  return role === 'student' || role === 'advisor';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  const payload = typeof request.body === 'string'
    ? JSON.parse(request.body) as { universityId?: string; role?: InquiryRole }
    : request.body;
  const universityId = String(payload?.universityId ?? '').trim();
  const role = payload?.role;

  if (!universityId || !isInquiryRole(role)) {
    response.status(400).json({ success: false, error: 'Enter a valid student or advisor ID.' });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: requester, error: requesterError } = await supabase
      .from('app_users')
      .select('id,university_id,role,full_name')
      .eq('university_id', universityId)
      .eq('role', role)
      .maybeSingle();

    if (requesterError) {
      throw requesterError;
    }

    if (!requester) {
      response.status(404).json({ success: false, error: `No ${role} account was found for that ID.` });
      return;
    }

    const { data: existingOpen, error: existingError } = await supabase
      .from('password_reset_inquiries')
      .select('id,requester_role,status,created_at,resolved_at')
      .eq('requester_id', requester.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let inquiry = existingOpen;
    if (!inquiry) {
      const { data: createdInquiry, error: createError } = await supabase
        .from('password_reset_inquiries')
        .insert({
          requester_id: requester.id,
          requester_role: role,
          status: 'open',
        })
        .select('id,requester_role,status,created_at,resolved_at')
        .single();

      if (createError || !createdInquiry) {
        throw createError ?? new Error('Unable to create password inquiry.');
      }

      inquiry = createdInquiry;
    }

    response.status(200).json({
      success: true,
      inquiry: {
        id: inquiry.id,
        requesterId: requester.university_id,
        requesterName: requester.full_name,
        requesterRole: inquiry.requester_role,
        status: inquiry.status,
        createdAt: inquiry.created_at,
        resolvedAt: inquiry.resolved_at,
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to submit password inquiry.',
    });
  }
}

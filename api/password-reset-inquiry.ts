import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type InquiryRole = 'student' | 'advisor';

interface PasswordResetInquiryRpcResult {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_role: InquiryRole;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

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

function normalizeInquiryResult(result: PasswordResetInquiryRpcResult | PasswordResetInquiryRpcResult[] | null) {
  return Array.isArray(result) ? result[0] : result;
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
    const { data, error } = await supabase.rpc('submit_password_reset_inquiry', {
      p_university_id: universityId,
      p_requester_role: role,
    });

    if (error) {
      throw error;
    }

    const inquiry = normalizeInquiryResult(data as PasswordResetInquiryRpcResult | PasswordResetInquiryRpcResult[] | null);
    if (!inquiry) {
      throw new Error('Unable to create password inquiry.');
    }

    response.status(200).json({
      success: true,
      inquiry: {
        id: inquiry.id,
        requesterId: inquiry.requester_id,
        requesterName: inquiry.requester_name,
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

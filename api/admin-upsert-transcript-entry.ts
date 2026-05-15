import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type TranscriptStatus = 'passed' | 'failed' | 'withdrawn' | 'in_progress';

const MAX_SEMESTER_CREDITS = 18;
const MAX_SUMMER_CREDITS = 9;

interface TranscriptEntryPayload {
  id?: string;
  existingEntry?: boolean;
  studentId?: string;
  termCode?: string;
  courseCode?: string;
  finalGrade?: number | null;
  status?: TranscriptStatus;
  attemptNo?: number;
}

interface TranscriptEntryCreditRow {
  id: string;
  status: TranscriptStatus;
  course: { credits: number } | { credits: number }[] | null;
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function getTermTypeFromCode(termCode: string) {
  return /summer/i.test(termCode) ? 'summer' : 'regular';
}

function getCreditLimitForTermCode(termCode: string) {
  return getTermTypeFromCode(termCode) === 'summer' ? MAX_SUMMER_CREDITS : MAX_SEMESTER_CREDITS;
}

function formatTermLabel(termCode: string) {
  const match = /^(\d{4})-(fall|spring|summer)$/i.exec(termCode);
  if (!match) {
    return termCode;
  }

  const termName = match[2].toLowerCase();
  const pretty = termName === 'fall' ? 'Fall' : termName === 'spring' ? 'Spring' : 'Summer';
  return `${pretty} ${match[1]}`;
}

function getEntryCredits(row: TranscriptEntryCreditRow) {
  const course = Array.isArray(row.course) ? row.course[0] : row.course;
  return Number(course?.credits ?? 0);
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

function getStatusForGrade(finalGrade: number | null): TranscriptStatus {
  if (finalGrade === null) {
    return 'in_progress';
  }

  return finalGrade >= 50 ? 'passed' : 'failed';
}

function validatePayload(payload: TranscriptEntryPayload) {
  const studentId = String(payload.studentId ?? '').trim();
  const termCode = String(payload.termCode ?? '').trim();
  const courseCode = String(payload.courseCode ?? '').trim();
  const finalGrade = payload.finalGrade ?? null;
  const attemptNo = Number(payload.attemptNo);
  const status = payload.status ?? 'in_progress';

  if (!studentId || !termCode || !courseCode) {
    return { error: 'Missing transcript entry fields.' };
  }

  if (!['passed', 'failed', 'withdrawn', 'in_progress'].includes(status)) {
    return { error: 'Invalid transcript status.' };
  }

  if (finalGrade !== null && (!Number.isInteger(finalGrade) || finalGrade < 35 || finalGrade > 99)) {
    return { error: 'Marks must be whole numbers from 35 to 99, or blank.' };
  }

  if (!Number.isInteger(attemptNo) || attemptNo < 1 || attemptNo > 10) {
    return { error: 'Attempt number must be a whole number from 1 to 10.' };
  }

  return {
    input: {
      id: payload.id ? String(payload.id) : undefined,
      existingEntry: payload.existingEntry === true,
      studentId,
      termCode,
      courseCode,
      finalGrade,
      status: getStatusForGrade(finalGrade),
      attemptNo,
    },
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body) as TranscriptEntryPayload
      : request.body as TranscriptEntryPayload;
    const validation = validatePayload(payload);
    if ('error' in validation) {
      response.status(400).json({ success: false, error: validation.error });
      return;
    }

    const supabase = getSupabaseAdminClient();
    await requireAdmin(request, supabase);

    const { input } = validation;
    const { data: student, error: studentError } = await supabase
      .from('app_users')
      .select('id')
      .eq('university_id', input.studentId)
      .eq('role', 'student')
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      response.status(404).json({ success: false, error: 'Student account was not found.' });
      return;
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id,credits')
      .eq('course_code', input.courseCode)
      .maybeSingle();

    if (courseError) {
      throw courseError;
    }

    if (!course) {
      response.status(404).json({ success: false, error: 'Course was not found.' });
      return;
    }

    let excludedEntryId = input.id;
    if (!excludedEntryId) {
      const { data: existingEntry, error: existingEntryError } = await supabase
        .from('student_transcript_entries')
        .select('id')
        .eq('student_id', student.id)
        .eq('course_id', course.id)
        .eq('term_code', input.termCode)
        .eq('attempt_no', input.attemptNo)
        .maybeSingle();

      if (existingEntryError) {
        throw existingEntryError;
      }

      excludedEntryId = existingEntry?.id;
    }

    let termEntriesQuery = supabase
      .from('student_transcript_entries')
      .select('id,status,course:courses(credits)')
      .eq('student_id', student.id)
      .eq('term_code', input.termCode)
      .neq('status', 'withdrawn');

    if (excludedEntryId) {
      termEntriesQuery = termEntriesQuery.neq('id', excludedEntryId);
    }

    const { data: termEntries, error: termEntriesError } = await termEntriesQuery;
    if (termEntriesError) {
      throw termEntriesError;
    }

    const existingTermHours = ((termEntries ?? []) as TranscriptEntryCreditRow[])
      .reduce((sum, row) => sum + getEntryCredits(row), 0);
    const nextTermHours = existingTermHours + (input.status === 'withdrawn' ? 0 : Number(course.credits));
    const termLimit = getCreditLimitForTermCode(input.termCode);
    if (nextTermHours > termLimit) {
      response.status(400).json({
        success: false,
        error: `${formatTermLabel(input.termCode)} has ${nextTermHours} credit hours. It cannot exceed ${termLimit} hours.`,
      });
      return;
    }

    const transcriptPayload = {
      id: input.id,
      student_id: student.id,
      term_code: input.termCode,
      course_id: course.id,
      final_grade: input.finalGrade,
      status: input.status,
      attempt_no: input.attemptNo,
    };

    const query = input.existingEntry && input.id
      ? supabase
          .from('student_transcript_entries')
          .update(transcriptPayload)
          .eq('id', input.id)
          .select('id')
          .single()
      : supabase
          .from('student_transcript_entries')
          .upsert(transcriptPayload, { onConflict: 'student_id,course_id,term_code,attempt_no' })
          .select('id')
          .single();

    const { data: savedEntry, error: saveError } = await query;
    if (saveError) {
      throw saveError;
    }

    response.status(200).json({ success: true, id: savedEntry.id });
  } catch (error) {
    console.error('Admin transcript upsert failed.', error);
    response.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Unable to save transcript entry.'),
    });
  }
}

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  buildCourses,
  buildSeedDrafts,
  buildStudentInsights,
  COURSES,
  DEFAULT_MODEL_VERSION,
  evaluateSchedule,
  getCourseSelectionStatus,
  MODEL_LAST_CALCULATED_AT,
  SEED_HISTORICAL_STATS,
  STUDENT_PLAN_SEEDS,
  STUDENT_PROFILES,
  type Course,
  type HistoricalCourseStat,
  type ImportJob,
  type ScheduleDraft,
  type ScheduleEvaluation,
  type SelectionStatus,
  type StudentInsight,
} from '../data/courses';
import { hasSupabaseConfig, supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect, supabaseUpsert } from '../lib/supabase';

interface CourseInput {
  code: string;
  name: string;
  department: string;
  type: Course['type'];
  credits: number;
  prerequisites: string[];
  concurrentCourses?: string[];
  minimumCompletedCredits?: number;
  internetDifficulty?: number;
  difficultyBasis?: string;
  passRate: number;
  failRate: number;
  avgGrade: number;
  enrollmentCount: number;
  withdrawals: number;
}

interface AppDataState {
  courses: Course[];
  historicalStats: HistoricalCourseStat[];
  importJobs: ImportJob[];
  scheduleDrafts: ScheduleDraft[];
  recentEvaluations: ScheduleEvaluation[];
  currentEvaluations: Record<string, ScheduleEvaluation | null>;
  plannerSelections: Record<string, string[]>;
  messages: AdvisorMessage[];
  modelVersion: string;
  modelLastCalculatedAt: string;
}

interface ImportResult {
  job: ImportJob;
}

interface SelectionResult {
  success: boolean;
  error?: string;
}

interface AdvisorMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

interface SendMessageInput {
  senderId: string;
  recipientId: string;
  body: string;
}

interface MessageSendResult {
  success: boolean;
  error?: string;
}

interface AppDataContextValue {
  courses: Course[];
  historicalStats: HistoricalCourseStat[];
  importJobs: ImportJob[];
  scheduleDrafts: ScheduleDraft[];
  recentEvaluations: ScheduleEvaluation[];
  studentInsights: StudentInsight[];
  plannerSelections: Record<string, string[]>;
  currentEvaluations: Record<string, ScheduleEvaluation | null>;
  messages: AdvisorMessage[];
  modelVersion: string;
  modelLastCalculatedAt: string;
  modelCoverage: number;
  toggleCourseSelection: (studentId: string, code: string) => SelectionResult;
  getCourseSelectionState: (studentId: string, code: string) => SelectionStatus;
  clearSelection: (studentId: string) => void;
  analyzeSchedule: (studentId: string) => ScheduleEvaluation | null;
  saveScheduleDraft: (studentId: string, name: string) => ScheduleDraft | null;
  loadScheduleDraft: (studentId: string, draftId: string) => void;
  deleteScheduleDraft: (draftId: string) => void;
  importHistoricalData: (fileName: string, text: string) => ImportResult;
  recalculateScores: () => void;
  upsertCourse: (input: CourseInput) => void;
  getStudentDrafts: (studentId: string) => ScheduleDraft[];
  getSelectedCourses: (studentId: string) => Course[];
  getAssignedAdvisorId: (studentId: string) => string | null;
  getAdviseeIds: (advisorId: string) => string[];
  getConversationMessages: (userId: string, otherUserId: string) => AdvisorMessage[];
  getUnreadMessageCount: (userId: string) => number;
  markConversationRead: (viewerId: string, otherUserId: string) => void;
  sendMessage: (input: SendMessageInput) => MessageSendResult;
}

const STORAGE_KEY = 'smart-advisor-app-data-v3';

const AppDataContext = createContext<AppDataContextValue | null>(null);

function getStudentProfile(studentId: string) {
  return STUDENT_PROFILES.find((profile) => profile.id === studentId);
}

function getAssignedAdvisorId(studentId: string) {
  return getStudentProfile(studentId)?.advisorId ?? null;
}

function getAdviseeIds(advisorId: string) {
  return STUDENT_PROFILES.filter((profile) => profile.advisorId === advisorId).map((profile) => profile.id);
}

function isMessagePairAllowed(senderId: string, recipientId: string) {
  const senderAdvisorId = getAssignedAdvisorId(senderId);
  const recipientAdvisorId = getAssignedAdvisorId(recipientId);
  return senderAdvisorId === recipientId || recipientAdvisorId === senderId;
}

function createClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeMessages(...sources: AdvisorMessage[][]) {
  const deduped = new Map<string, AdvisorMessage>();

  sources.forEach((source) => {
    source.forEach((message) => {
      const key = `${message.senderId}|${message.recipientId}|${message.sentAt}|${message.body}`;
      deduped.set(key, message);
    });
  });

  return [...deduped.values()].sort((left, right) => left.sentAt.localeCompare(right.sentAt));
}

function buildSeedMessages(): AdvisorMessage[] {
  return [
    {
      id: 'msg-20231001-1',
      senderId: '20231001',
      recipientId: 'ADV-1001',
      body: 'I am considering Database Systems and Networks together. Could you review that workload?',
      sentAt: '2026-03-12T08:15:00.000Z',
      readAt: '2026-03-12T08:32:00.000Z',
    },
    {
      id: 'msg-20231001-2',
      senderId: 'ADV-1001',
      recipientId: '20231001',
      body: 'Yes. That combination is manageable if you avoid pairing it with another high-difficulty theory course.',
      sentAt: '2026-03-12T08:32:00.000Z',
      readAt: '2026-03-12T09:02:00.000Z',
    },
    {
      id: 'msg-20221188-1',
      senderId: 'ADV-1001',
      recipientId: '20221188',
      body: 'Your latest draft looks theory-heavy. Please consider replacing one hard course before registration closes.',
      sentAt: '2026-03-13T07:45:00.000Z',
      readAt: null,
    },
    {
      id: 'msg-20221302-1',
      senderId: '20221302',
      recipientId: 'ADV-1002',
      body: 'I can take Visual Programming and Webpage Design now. Do you recommend keeping both together?',
      sentAt: '2026-03-13T08:05:00.000Z',
      readAt: '2026-03-13T08:16:00.000Z',
    },
    {
      id: 'msg-20221302-2',
      senderId: 'ADV-1002',
      recipientId: '20221302',
      body: 'Yes, that pairing is reasonable. Keep the rest of the term lighter because Computer Architecture will raise the total load quickly.',
      sentAt: '2026-03-13T08:16:00.000Z',
      readAt: '2026-03-13T08:34:00.000Z',
    },
    {
      id: 'msg-20220665-1',
      senderId: 'ADV-1002',
      recipientId: '20220665',
      body: 'Your current draft still looks systems-heavy. Please consider swapping one theory course before saving your final registration plan.',
      sentAt: '2026-03-13T09:10:00.000Z',
      readAt: null,
    },
  ];
}

function createInitialState(): AppDataState {
  const courses = COURSES;
  const scheduleDrafts = buildSeedDrafts(courses);
  const recentEvaluations = scheduleDrafts.map((draft) => draft.evaluation);
  const currentEvaluations = Object.fromEntries(
    Object.entries(STUDENT_PLAN_SEEDS).map(([studentId, courseCodes]) => {
      const profile = getStudentProfile(studentId);
      const selectedCourses = courses.filter((course) => courseCodes.includes(course.code));
      return [
        studentId,
        evaluateSchedule(
          studentId,
          selectedCourses,
          courses,
          DEFAULT_MODEL_VERSION,
          profile?.completedCourseCodes ?? [],
          profile?.creditsCompleted ?? 0,
          '2026-03-13T07:30:00.000Z'
        ),
      ];
    })
  );

  return {
    courses,
    historicalStats: SEED_HISTORICAL_STATS,
    importJobs: [
      {
        id: 'job-seed-data',
        fileName: 'seed-historical-data.json',
        format: 'json',
        importedRows: SEED_HISTORICAL_STATS.length,
        rejectedRows: 0,
        status: 'completed',
        validationMessages: ['Seed dataset loaded for MVP demo coverage.'],
        errors: [],
        createdAt: '2026-03-12T09:45:00.000Z',
      },
    ],
    scheduleDrafts,
    recentEvaluations,
    currentEvaluations,
    plannerSelections: { ...STUDENT_PLAN_SEEDS },
    messages: buildSeedMessages(),
    modelVersion: DEFAULT_MODEL_VERSION,
    modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
  };
}

function loadInitialState() {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(saved) as Partial<AppDataState>;
    const initialState = createInitialState();

    return {
      ...initialState,
      ...parsed,
      currentEvaluations: parsed.currentEvaluations ?? initialState.currentEvaluations,
      plannerSelections: parsed.plannerSelections ?? initialState.plannerSelections,
      messages: parsed.messages ?? initialState.messages,
    };
  } catch {
    return createInitialState();
  }
}

function parseCsv(fileName: string, text: string, courses: Course[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      stats: [] as HistoricalCourseStat[],
      job: {
        id: `job-${Date.now()}`,
        fileName,
        format: 'csv' as const,
        importedRows: 0,
        rejectedRows: 0,
        status: 'failed' as const,
        validationMessages: ['CSV files must include a header row and at least one data row.'],
        errors: [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  const requiredHeaders = ['courseCode', 'termId', 'avgGrade', 'passRate', 'failRate', 'enrollmentCount', 'withdrawals'];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  const stats: HistoricalCourseStat[] = [];
  const errors: ImportJob['errors'] = [];

  if (missingHeaders.length > 0) {
    return {
      stats,
      job: {
        id: `job-${Date.now()}`,
        fileName,
        format: 'csv' as const,
        importedRows: 0,
        rejectedRows: 0,
        status: 'failed' as const,
        validationMessages: [`Missing required header(s): ${missingHeaders.join(', ')}`],
        errors,
        createdAt: new Date().toISOString(),
      },
    };
  }

  lines.slice(1).forEach((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']));
    const rowNumber = index + 2;
    const matchingCourse = courses.find((course) => course.code === row.courseCode);
    const numericFields = ['avgGrade', 'passRate', 'failRate', 'enrollmentCount', 'withdrawals'];
    const invalidNumericField = numericFields.find((field) => Number.isNaN(Number(row[field])));

    if (!matchingCourse) {
      errors.push({ rowNumber, reason: `Unknown course code ${row.courseCode}.` });
      return;
    }

    if (!row.termId) {
      errors.push({ rowNumber, reason: 'termId is required.' });
      return;
    }

    if (invalidNumericField) {
      errors.push({ rowNumber, reason: `${invalidNumericField} must be numeric.` });
      return;
    }

    const avgGrade = Number(row.avgGrade);
    const passRate = Number(row.passRate);
    const failRate = Number(row.failRate);
    const enrollmentCount = Number(row.enrollmentCount);
    const withdrawals = Number(row.withdrawals);

    if (passRate < 0 || passRate > 100 || avgGrade < 0 || avgGrade > 100 || failRate < 0 || failRate > 100) {
      errors.push({ rowNumber, reason: 'Grade and rate fields must be between 0 and 100.' });
      return;
    }

    if (enrollmentCount <= 0 || withdrawals < 0 || withdrawals > enrollmentCount) {
      errors.push({ rowNumber, reason: 'Enrollment count must be positive and withdrawals cannot exceed enrollment.' });
      return;
    }

    stats.push({
      id: `stat-${row.courseCode.toLowerCase()}-${row.termId.toLowerCase()}-${Date.now()}-${rowNumber}`,
      courseCode: row.courseCode,
      termId: row.termId,
      avgGrade,
      passRate,
      failRate,
      enrollmentCount,
      withdrawals,
    });
  });

  const importedRows = stats.length;
  const rejectedRows = errors.length;
  const status: ImportJob['status'] = rejectedRows > 0 ? (importedRows > 0 ? 'completed_with_errors' : 'failed') : 'completed';

  return {
    stats,
    job: {
      id: `job-${Date.now()}`,
      fileName,
      format: 'csv' as const,
      importedRows,
      rejectedRows,
      status,
      validationMessages: [
        `${importedRows} row(s) imported successfully.`,
        rejectedRows > 0 ? `${rejectedRows} row(s) were rejected during validation.` : 'No validation errors detected.',
      ],
      errors,
      createdAt: new Date().toISOString(),
    },
  };
}

function parseJson(fileName: string, text: string, courses: Course[]) {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return {
        stats: [] as HistoricalCourseStat[],
        job: {
          id: `job-${Date.now()}`,
          fileName,
          format: 'json' as const,
          importedRows: 0,
          rejectedRows: 0,
          status: 'failed' as const,
          validationMessages: ['JSON import must be an array of objects.'],
          errors: [],
          createdAt: new Date().toISOString(),
        },
      };
    }

    const stats: HistoricalCourseStat[] = [];
    const errors: ImportJob['errors'] = [];

    parsed.forEach((row, index) => {
      const rowNumber = index + 1;
      const matchingCourse = courses.find((course) => course.code === row.courseCode);
      if (!matchingCourse) {
        errors.push({ rowNumber, reason: `Unknown course code ${row.courseCode}.` });
        return;
      }

      const numericFields = ['avgGrade', 'passRate', 'failRate', 'enrollmentCount', 'withdrawals'] as const;
      const invalidField = numericFields.find((field) => Number.isNaN(Number(row[field])));
      if (!row.termId || invalidField) {
        errors.push({
          rowNumber,
          reason: invalidField ? `${invalidField} must be numeric.` : 'termId is required.',
        });
        return;
      }

      stats.push({
        id: `stat-${row.courseCode.toLowerCase()}-${row.termId.toLowerCase()}-${Date.now()}-${rowNumber}`,
        courseCode: row.courseCode,
        termId: String(row.termId),
        avgGrade: Number(row.avgGrade),
        passRate: Number(row.passRate),
        failRate: Number(row.failRate),
        enrollmentCount: Number(row.enrollmentCount),
        withdrawals: Number(row.withdrawals),
      });
    });

    const importedRows = stats.length;
    const rejectedRows = errors.length;
    const status: ImportJob['status'] = rejectedRows > 0 ? (importedRows > 0 ? 'completed_with_errors' : 'failed') : 'completed';

    return {
      stats,
      job: {
        id: `job-${Date.now()}`,
        fileName,
        format: 'json' as const,
        importedRows,
        rejectedRows,
        status,
        validationMessages: [
          `${importedRows} row(s) imported successfully.`,
          rejectedRows > 0 ? `${rejectedRows} row(s) were rejected during validation.` : 'No validation errors detected.',
        ],
        errors,
        createdAt: new Date().toISOString(),
      },
    };
  } catch {
    return {
      stats: [] as HistoricalCourseStat[],
      job: {
        id: `job-${Date.now()}`,
        fileName,
        format: 'json' as const,
        importedRows: 0,
        rejectedRows: 0,
        status: 'failed' as const,
        validationMessages: ['The JSON file could not be parsed.'],
        errors: [],
        createdAt: new Date().toISOString(),
      },
    };
  }
}

function bumpModelVersion(currentVersion: string) {
  const match = currentVersion.match(/(\d+)$/);
  if (!match) {
    return `${currentVersion}-1`;
  }

  const next = Number(match[1]) + 1;
  return currentVersion.replace(/(\d+)$/, String(next));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(loadInitialState);
  const [remoteUserIds, setRemoteUserIds] = useState<Record<string, string>>({});
  const [remoteCourseIds, setRemoteCourseIds] = useState<Record<string, string>>({});

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    let cancelled = false;

    const loadRemoteSnapshot = async () => {
      try {
        const [
          userRows,
          courseRows,
          messageRows,
          draftRows,
          draftCourseRows,
          evaluationRows,
          importJobRows,
        ] = await Promise.all([
          supabaseSelect<Array<{ id: string; university_id: string }>>(
            'app_users',
            'select=id,university_id'
          ),
          supabaseSelect<Array<{ id: string; course_code: string }>>(
            'courses',
            'select=id,course_code'
          ),
          supabaseSelect<Array<{ id: string; sender_id: string; recipient_id: string; body: string; sent_at: string; read_at: string | null }>>(
            'messages',
            'select=id,sender_id,recipient_id,body,sent_at,read_at&order=sent_at.asc'
          ),
          supabaseSelect<Array<{ id: string; student_id: string; name: string; saved_at: string }>>(
            'schedule_drafts',
            'select=id,student_id,name,saved_at&order=saved_at.desc'
          ),
          supabaseSelect<Array<{ schedule_id: string; course_id: string }>>(
            'schedule_draft_courses',
            'select=schedule_id,course_id'
          ),
          supabaseSelect<Array<{ id: string; schedule_id: string; student_id: string; total_score: number; risk_label: ScheduleEvaluation['riskLabel']; total_credits: number; model_version: string; explanation: string[]; factors: ScheduleEvaluation['factors']; recommendations: ScheduleEvaluation['recommendations']; top_courses: string[]; evaluated_at: string }>>(
            'schedule_evaluations',
            'select=id,schedule_id,student_id,total_score,risk_label,total_credits,model_version,explanation,factors,recommendations,top_courses,evaluated_at'
          ),
          supabaseSelect<Array<{ id: string; file_name: string; format: ImportJob['format']; imported_rows: number; rejected_rows: number; status: ImportJob['status']; validation_messages: string[]; errors: ImportJob['errors']; created_at: string }>>(
            'import_jobs',
            'select=id,file_name,format,imported_rows,rejected_rows,status,validation_messages,errors,created_at&order=created_at.desc'
          ),
        ]);

        if (cancelled) {
          return;
        }

        const userIdByUniversityId = Object.fromEntries(userRows.map((row) => [row.university_id, row.id]));
        const universityIdByUserId = Object.fromEntries(userRows.map((row) => [row.id, row.university_id]));
        const courseIdByCode = Object.fromEntries(courseRows.map((row) => [row.course_code, row.id]));
        const courseCodeById = Object.fromEntries(courseRows.map((row) => [row.id, row.course_code]));

        const remoteMessages = messageRows
          .map((row) => ({
            id: row.id,
            senderId: universityIdByUserId[row.sender_id],
            recipientId: universityIdByUserId[row.recipient_id],
            body: row.body,
            sentAt: row.sent_at,
            readAt: row.read_at,
          }))
          .filter((message) => message.senderId && message.recipientId) as AdvisorMessage[];

        const courseCodesBySchedule = draftCourseRows.reduce<Record<string, string[]>>((accumulator, row) => {
          const code = courseCodeById[row.course_id];
          if (!code) {
            return accumulator;
          }

          accumulator[row.schedule_id] = [...(accumulator[row.schedule_id] ?? []), code];
          return accumulator;
        }, {});

        const evaluationBySchedule = new Map(evaluationRows.map((row) => [row.schedule_id, row]));
        const remoteDrafts = draftRows
          .map((row) => {
            const studentId = universityIdByUserId[row.student_id];
            if (!studentId) {
              return null;
            }

            const courseCodes = courseCodesBySchedule[row.id] ?? [];
            const selectedCourses = COURSES.filter((course) => courseCodes.includes(course.code));
            const profile = getStudentProfile(studentId);
            const evaluationRow = evaluationBySchedule.get(row.id);
            const fallbackEvaluation = evaluateSchedule(
              studentId,
              selectedCourses,
              COURSES,
              DEFAULT_MODEL_VERSION,
              profile?.completedCourseCodes ?? [],
              profile?.creditsCompleted ?? 0,
              row.saved_at
            );
            const evaluation = evaluationRow
              ? {
                  id: evaluationRow.id,
                  studentId,
                  totalScore: Number(evaluationRow.total_score),
                  riskLabel: evaluationRow.risk_label,
                  totalCredits: Number(evaluationRow.total_credits),
                  evaluatedAt: evaluationRow.evaluated_at,
                  modelVersion: evaluationRow.model_version,
                  explanation: evaluationRow.explanation ?? [],
                  factors: evaluationRow.factors ?? [],
                  recommendations: evaluationRow.recommendations ?? [],
                  topCourses: evaluationRow.top_courses ?? [],
                } satisfies ScheduleEvaluation
              : fallbackEvaluation;

            if (!evaluation) {
              return null;
            }

            return {
              id: row.id,
              studentId,
              name: row.name,
              courseCodes,
              savedAt: row.saved_at,
              evaluation,
            } satisfies ScheduleDraft;
          })
          .filter(Boolean) as ScheduleDraft[];

        setRemoteUserIds(userIdByUniversityId);
        setRemoteCourseIds(courseIdByCode);
        setState((current) => ({
          ...current,
          messages: remoteMessages.length > 0 ? mergeMessages(current.messages, remoteMessages) : current.messages,
          scheduleDrafts: remoteDrafts.length > 0 ? remoteDrafts : current.scheduleDrafts,
          recentEvaluations: remoteDrafts.length > 0
            ? remoteDrafts
                .map((draft) => draft.evaluation)
                .sort((left, right) => right.evaluatedAt.localeCompare(left.evaluatedAt))
            : current.recentEvaluations,
          importJobs: importJobRows.length > 0
            ? importJobRows.map((row) => ({
                id: row.id,
                fileName: row.file_name,
                format: row.format,
                importedRows: row.imported_rows,
                rejectedRows: row.rejected_rows,
                status: row.status,
                validationMessages: row.validation_messages ?? [],
                errors: row.errors ?? [],
                createdAt: row.created_at,
              }))
            : current.importJobs,
        }));
      } catch (error) {
        console.error('Unable to load Supabase app data.', error);
      }
    };

    void loadRemoteSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  const modelCoverage = useMemo(() => {
    if (state.courses.length === 0) {
      return 0;
    }

    return Math.round(
      (state.courses.filter((course) => course.dataPoints > 0).length / state.courses.length) * 100
    );
  }, [state.courses]);

  const studentInsights = useMemo(
    () => buildStudentInsights(STUDENT_PROFILES, state.scheduleDrafts),
    [state.scheduleDrafts]
  );

  const getSelectedCourses = useCallback(
    (studentId: string) => {
      const selectedCodes = state.plannerSelections[studentId] ?? [];
      return state.courses.filter((course) => selectedCodes.includes(course.code));
    },
    [state.courses, state.plannerSelections]
  );

  const getStudentDrafts = useCallback(
    (studentId: string) =>
      state.scheduleDrafts
        .filter((draft) => draft.studentId === studentId)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt)),
    [state.scheduleDrafts]
  );

  const getConversationMessages = useCallback(
    (userId: string, otherUserId: string) =>
      state.messages
        .filter(
          (message) =>
            (message.senderId === userId && message.recipientId === otherUserId) ||
            (message.senderId === otherUserId && message.recipientId === userId)
        )
        .sort((left, right) => left.sentAt.localeCompare(right.sentAt)),
    [state.messages]
  );

  const getUnreadMessageCount = useCallback(
    (userId: string) => state.messages.filter((message) => message.recipientId === userId && !message.readAt).length,
    [state.messages]
  );

  const markConversationRead = useCallback((viewerId: string, otherUserId: string) => {
    const readAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.recipientId === viewerId && message.senderId === otherUserId && !message.readAt
          ? { ...message, readAt }
          : message
      ),
    }));

    const viewerRemoteId = remoteUserIds[viewerId];
    const otherRemoteId = remoteUserIds[otherUserId];
    if (hasSupabaseConfig() && viewerRemoteId && otherRemoteId) {
      void supabasePatch(
        'messages',
        `recipient_id=eq.${encodeURIComponent(viewerRemoteId)}&sender_id=eq.${encodeURIComponent(otherRemoteId)}&read_at=is.null`,
        { read_at: readAt }
      ).catch((error) => {
        console.error('Unable to update read state in Supabase.', error);
      });
    }
  }, [remoteUserIds]);

  const sendMessage = useCallback(({ senderId, recipientId, body }: SendMessageInput): MessageSendResult => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    if (!isMessagePairAllowed(senderId, recipientId)) {
      return { success: false, error: 'Messages can only be exchanged between a student and their assigned advisor.' };
    }

    const nextMessage: AdvisorMessage = {
      id: createClientId('msg'),
      senderId,
      recipientId,
      body: trimmedBody,
      sentAt: new Date().toISOString(),
      readAt: null,
    };

    setState((current) => ({
      ...current,
      messages: [...current.messages, nextMessage],
    }));

    const senderRemoteId = remoteUserIds[senderId];
    const recipientRemoteId = remoteUserIds[recipientId];
    if (hasSupabaseConfig() && senderRemoteId && recipientRemoteId) {
      void supabaseInsert('messages', {
        id: nextMessage.id,
        sender_id: senderRemoteId,
        recipient_id: recipientRemoteId,
        body: nextMessage.body,
        sent_at: nextMessage.sentAt,
        read_at: null,
      }).catch((error) => {
        console.error('Unable to save message to Supabase.', error);
      });
    }

    return { success: true };
  }, [remoteUserIds]);

  const getCourseSelectionState = useCallback(
    (studentId: string, code: string) => {
      const profile = getStudentProfile(studentId);
      const course = state.courses.find((item) => item.code === code);
      if (!course || !profile) {
        return { eligible: false, reasons: ['Course or student profile was not found.'], wouldExceedCredits: false };
      }

      const selection = state.plannerSelections[studentId] ?? [];
      return getCourseSelectionStatus(
        course,
        profile.completedCourseCodes,
        selection,
        profile.creditsCompleted,
        state.courses
      );
    },
    [state.courses, state.plannerSelections]
  );

  const toggleCourseSelection = useCallback(
    (studentId: string, code: string) => {
      const profile = getStudentProfile(studentId);
      const selection = state.plannerSelections[studentId] ?? [];
      if (selection.includes(code)) {
        setState((current) => ({
          ...current,
          plannerSelections: {
            ...current.plannerSelections,
            [studentId]: current.plannerSelections[studentId].filter((selectedCode) => selectedCode !== code),
          },
          currentEvaluations: {
            ...current.currentEvaluations,
            [studentId]: null,
          },
        }));
        return { success: true };
      }

      const course = state.courses.find((item) => item.code === code);
      if (!course || !profile) {
        return { success: false, error: 'Course or student profile was not found.' };
      }

      const status = getCourseSelectionStatus(
        course,
        profile.completedCourseCodes,
        selection,
        profile.creditsCompleted,
        state.courses
      );
      if (!status.eligible) {
        return { success: false, error: status.reasons.join(' ') };
      }

      setState((current) => ({
        ...current,
        plannerSelections: {
          ...current.plannerSelections,
          [studentId]: [...(current.plannerSelections[studentId] ?? []), code],
        },
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: null,
        },
      }));

      return { success: true };
    },
    [state.courses, state.plannerSelections]
  );

  const clearSelection = useCallback((studentId: string) => {
    setState((current) => ({
      ...current,
      plannerSelections: {
        ...current.plannerSelections,
        [studentId]: [],
      },
      currentEvaluations: {
        ...current.currentEvaluations,
        [studentId]: null,
      },
    }));
  }, []);

  const analyzeSchedule = useCallback(
    (studentId: string) => {
      const profile = getStudentProfile(studentId);
      const selectedCodes = state.plannerSelections[studentId] ?? [];
      const selectedCourses = state.courses.filter((course) => selectedCodes.includes(course.code));
      const evaluation = evaluateSchedule(
        studentId,
        selectedCourses,
        state.courses,
        state.modelVersion,
        profile?.completedCourseCodes ?? [],
        profile?.creditsCompleted ?? 0,
        new Date().toISOString()
      );

      if (!evaluation) {
        return null;
      }

      setState((current) => ({
        ...current,
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: evaluation,
        },
        recentEvaluations: [evaluation, ...current.recentEvaluations].slice(0, 20),
      }));

      return evaluation;
    },
    [state.courses, state.modelVersion, state.plannerSelections]
  );

  const saveScheduleDraft = useCallback(
    (studentId: string, name: string) => {
      const selectedCodes = state.plannerSelections[studentId] ?? [];
      const selectedCourses = state.courses.filter((course) => selectedCodes.includes(course.code));
      const evaluation =
        state.currentEvaluations[studentId] ??
        evaluateSchedule(
          studentId,
          selectedCourses,
          state.courses,
          state.modelVersion,
          getStudentProfile(studentId)?.completedCourseCodes ?? [],
          getStudentProfile(studentId)?.creditsCompleted ?? 0,
          new Date().toISOString()
        );

      if (!evaluation || selectedCodes.length === 0) {
        return null;
      }

      const persistedEvaluation = { ...evaluation, id: createClientId('eval') };
      const draft: ScheduleDraft = {
        id: createClientId('draft'),
        studentId,
        name,
        courseCodes: selectedCodes,
        savedAt: new Date().toISOString(),
        evaluation: persistedEvaluation,
      };

      setState((current) => ({
        ...current,
        scheduleDrafts: [draft, ...current.scheduleDrafts],
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: persistedEvaluation,
        },
        recentEvaluations: [persistedEvaluation, ...current.recentEvaluations].slice(0, 20),
      }));

      const studentRemoteId = remoteUserIds[studentId];
      const draftCoursePayload = selectedCodes
        .map((code) => ({ schedule_id: draft.id, course_id: remoteCourseIds[code] }))
        .filter((item) => item.course_id);

      if (hasSupabaseConfig() && studentRemoteId) {
        void supabaseInsert('schedule_drafts', {
          id: draft.id,
          student_id: studentRemoteId,
          name: draft.name,
          term_code: '2026-Spring',
          status: 'draft',
          saved_at: draft.savedAt,
        })
          .then(() => Promise.all([
            draftCoursePayload.length > 0 ? supabaseInsert('schedule_draft_courses', draftCoursePayload) : Promise.resolve(null),
            supabaseUpsert('schedule_evaluations', {
              id: persistedEvaluation.id,
              schedule_id: draft.id,
              student_id: studentRemoteId,
              total_score: persistedEvaluation.totalScore,
              risk_label: persistedEvaluation.riskLabel,
              total_credits: persistedEvaluation.totalCredits,
              model_version: persistedEvaluation.modelVersion,
              explanation: persistedEvaluation.explanation,
              factors: persistedEvaluation.factors,
              recommendations: persistedEvaluation.recommendations,
              top_courses: persistedEvaluation.topCourses,
              evaluated_at: persistedEvaluation.evaluatedAt,
            }, 'id'),
          ]))
          .catch((error) => {
            console.error('Unable to save draft to Supabase.', error);
          });
      }

      return draft;
    },
    [remoteCourseIds, remoteUserIds, state.courses, state.currentEvaluations, state.modelVersion, state.plannerSelections]
  );

  const loadScheduleDraft = useCallback((studentId: string, draftId: string) => {
    setState((current) => {
      const draft = current.scheduleDrafts.find((item) => item.id === draftId && item.studentId === studentId);
      if (!draft) {
        return current;
      }

      return {
        ...current,
        plannerSelections: {
          ...current.plannerSelections,
          [studentId]: draft.courseCodes,
        },
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: draft.evaluation,
        },
      };
    });
  }, []);

  const deleteScheduleDraft = useCallback((draftId: string) => {
    setState((current) => ({
      ...current,
      scheduleDrafts: current.scheduleDrafts.filter((draft) => draft.id !== draftId),
    }));

    if (hasSupabaseConfig()) {
      void Promise.all([
        supabaseDelete('schedule_evaluations', `schedule_id=eq.${encodeURIComponent(draftId)}`),
        supabaseDelete('schedule_drafts', `id=eq.${encodeURIComponent(draftId)}`),
      ]).catch((error) => {
        console.error('Unable to delete Supabase draft.', error);
      });
    }
  }, []);

  const importHistoricalData = useCallback(
    (fileName: string, text: string) => {
      const lowerName = fileName.toLowerCase();
      const result = lowerName.endsWith('.json')
        ? parseJson(fileName, text, state.courses)
        : parseCsv(fileName, text, state.courses);

      setState((current) => ({
        ...current,
        historicalStats: [...result.stats, ...current.historicalStats],
        importJobs: [result.job, ...current.importJobs].slice(0, 15),
      }));

      return { job: result.job };
    },
    [state.courses]
  );

  const recalculateScores = useCallback(() => {
    setState((current) => {
      const nextVersion = bumpModelVersion(current.modelVersion);
      const nextCalculatedAt = new Date().toISOString();
      const nextCourses = buildCourses(
        current.historicalStats,
        nextVersion,
        nextCalculatedAt,
        current.courses
      );

      const remappedDrafts = current.scheduleDrafts.map((draft) => {
        const profile = getStudentProfile(draft.studentId);
        const selectedCourses = nextCourses.filter((course) => draft.courseCodes.includes(course.code));
        const evaluation =
          evaluateSchedule(
            draft.studentId,
            selectedCourses,
            nextCourses,
            nextVersion,
            profile?.completedCourseCodes ?? [],
            profile?.creditsCompleted ?? 0,
            draft.savedAt
          ) ?? draft.evaluation;

        return {
          ...draft,
          evaluation,
        };
      });

      const remappedCurrentEvaluations = Object.fromEntries(
        Object.entries(current.plannerSelections).map(([studentId, selectedCodes]) => {
          const selectedCourses = nextCourses.filter((course) => selectedCodes.includes(course.code));
          return [
            studentId,
            evaluateSchedule(
              studentId,
              selectedCourses,
              nextCourses,
              nextVersion,
              getStudentProfile(studentId)?.completedCourseCodes ?? [],
              getStudentProfile(studentId)?.creditsCompleted ?? 0,
              nextCalculatedAt
            ),
          ];
        })
      );

      return {
        ...current,
        courses: nextCourses,
        scheduleDrafts: remappedDrafts,
        currentEvaluations: remappedCurrentEvaluations,
        recentEvaluations: remappedDrafts.map((draft) => draft.evaluation),
        modelVersion: nextVersion,
        modelLastCalculatedAt: nextCalculatedAt,
      };
    });
  }, []);

  const upsertCourse = useCallback((input: CourseInput) => {
    setState((current) => {
      const course: Course = {
        ...input,
        diffScore: 0,
        difficultyLabel: 'Balanced',
        modelVersion: current.modelVersion,
        lastCalculatedAt: current.modelLastCalculatedAt,
        dataPoints: 1,
      } as Course;

      const nextHistoricalStats = [
        {
          id: `stat-${input.code.toLowerCase()}-manual-${Date.now()}`,
          courseCode: input.code,
          termId: '2026-Manual',
          avgGrade: input.avgGrade,
          passRate: input.passRate,
          failRate: input.failRate,
          enrollmentCount: input.enrollmentCount,
          withdrawals: input.withdrawals,
        },
        ...current.historicalStats.filter((stat) => !(stat.courseCode === input.code && stat.termId === '2026-Manual')),
      ];

      const recalculated = buildCourses(
        nextHistoricalStats,
        current.modelVersion,
        current.modelLastCalculatedAt,
        current.courses.some((item) => item.code === input.code)
          ? current.courses.map((item) => (item.code === input.code ? course : item))
          : [...current.courses, course]
      );

      return {
        ...current,
        historicalStats: nextHistoricalStats,
        courses: recalculated,
      };
    });
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      courses: state.courses,
      historicalStats: state.historicalStats,
      importJobs: state.importJobs,
      scheduleDrafts: state.scheduleDrafts,
      recentEvaluations: state.recentEvaluations,
      studentInsights,
      plannerSelections: state.plannerSelections,
      currentEvaluations: state.currentEvaluations,
      messages: state.messages,
      modelVersion: state.modelVersion,
      modelLastCalculatedAt: state.modelLastCalculatedAt,
      modelCoverage,
      toggleCourseSelection,
      getCourseSelectionState,
      clearSelection,
      analyzeSchedule,
      saveScheduleDraft,
      loadScheduleDraft,
      deleteScheduleDraft,
      importHistoricalData,
      recalculateScores,
      upsertCourse,
      getStudentDrafts,
      getSelectedCourses,
      getAssignedAdvisorId,
      getAdviseeIds,
      getConversationMessages,
      getUnreadMessageCount,
      markConversationRead,
      sendMessage,
    }),
    [
      analyzeSchedule,
      clearSelection,
      deleteScheduleDraft,
      getConversationMessages,
      getCourseSelectionState,
      getSelectedCourses,
      getStudentDrafts,
      getUnreadMessageCount,
      importHistoricalData,
      loadScheduleDraft,
      markConversationRead,
      modelCoverage,
      recalculateScores,
      saveScheduleDraft,
      sendMessage,
      state.courses,
      state.currentEvaluations,
      state.historicalStats,
      state.importJobs,
      state.messages,
      state.modelLastCalculatedAt,
      state.modelVersion,
      state.plannerSelections,
      state.recentEvaluations,
      state.scheduleDrafts,
      studentInsights,
      toggleCourseSelection,
      upsertCourse,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }

  return context;
}





















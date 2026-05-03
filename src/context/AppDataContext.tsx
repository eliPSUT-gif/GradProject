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
  buildAvailableTerms,
  buildRegisterableTerms,
  buildCourses,
  buildMockPlannerAiEvaluation,
  buildSeedHistoricalStats,
  buildStudentInsights,
  compareTermCodesNewestFirst,
  computeCourseDifficulty,
  DEFAULT_MODEL_VERSION,
  formatCompactTermLabel,
  formatRequirementText,
  formatTermLabel,
  getCreditLimitForTermCode,
  getCourseSelectionStatus,
  getDiffLabel,
  getInitials,
  MODEL_LAST_CALCULATED_AT,
  STUDENT_PROFILES,
  type AdmissionTerm,
  type Course,
  type HistoricalCourseStat,
  type Role,
  type ScheduleDraft,
  type ScheduleEvaluation,
  type SelectionStatus,
  type StudentInsight,
  type StudentProfile,
  type TermType,
} from '../data/courses';
import {
  hasSupabaseConfig,
  supabaseDelete,
  supabaseInsert,
  supabasePatch,
  supabaseRpc,
  supabaseSelect,
  supabaseUpsert,
} from '../lib/supabase';
import { useAuth, type UserFormInput } from './AuthContext';

type PlannerActionResult = { success: boolean; error?: string };
type PasswordInquiryRole = Extract<Role, 'student' | 'advisor'>;

interface CourseFormInput {
  code: string;
  name: string;
  department: string;
  type: Course['type'];
  credits: number;
  prerequisites: string[];
  passRate: number;
  failRate: number;
  avgGrade: number;
  enrollmentCount: number;
  withdrawals: number;
}

export interface StudentTranscriptRow {
  id?: string;
  studentId: string;
  termCode: string;
  termLabel: string;
  termType: TermType;
  courseCode: string;
  courseName: string;
  credits: number;
  finalGrade: number | null;
  status: 'passed' | 'failed' | 'withdrawn' | 'in_progress' | 'not_taken';
  attemptNo: number;
}

export interface StudentTermMetric {
  studentId: string;
  termCode: string;
  termLabel: string;
  termType: TermType;
  courseCount: number;
  completedCredits: number;
  gpa: number | null;
}

export interface StudentTranscriptSemester {
  studentId: string;
  termCode: string;
  termLabel: string;
  termType: TermType;
  courseCount: number;
  completedCredits: number;
  gpa: number | null;
  rows: StudentTranscriptRow[];
}

export interface CoursePrerequisiteGrade {
  code: string;
  name: string;
  grade: number | null;
}

export interface TranscriptEntryInput {
  id?: string;
  studentId: string;
  termCode: string;
  courseCode: string;
  finalGrade: number | null;
  status: Exclude<StudentTranscriptRow['status'], 'not_taken'>;
  attemptNo: number;
}

export interface StudentAccountInput {
  id: string;
  name: string;
  enrollmentYear: number;
  admissionTerm: AdmissionTerm;
  department: string;
  advisorId: string;
  temporaryPassword: string;
}

export interface PasswordResetInquiry {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRole: PasswordInquiryRole;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string | null;
}

interface PasswordResetInquiryRpcResult {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_role: PasswordInquiryRole;
  status: PasswordResetInquiry['status'];
  created_at: string;
  resolved_at: string | null;
}

interface AppDataContextType {
  analyzeSchedule: (studentId: string) => ScheduleEvaluation | null;
  clearSelection: (studentId: string) => void;
  assignAdvisor: (studentId: string, advisorId: string) => Promise<PlannerActionResult>;
  createStudentAccount: (input: StudentAccountInput) => Promise<PlannerActionResult & { studentId?: string }>;
  createTranscriptFromDraft: (studentId: string, termCode: string) => Promise<PlannerActionResult>;
  courses: Course[];
  currentEvaluations: Record<string, ScheduleEvaluation | null>;
  deleteScheduleDraft: (draftId: string) => void;
  getCourseSelectionState: (studentId: string, courseCode: string) => SelectionStatus;
  getCoursePrerequisitesWithGrades: (studentId: string, courseCode: string) => CoursePrerequisiteGrade[];
  getPlannerTermCode: (studentId: string) => string;
  getSelectedCourses: (studentId: string) => Course[];
  getStudentDrafts: (studentId: string) => ScheduleDraft[];
  getStudentTranscriptSemesters: (studentId: string) => StudentTranscriptSemester[];
  getStudentTermMetrics: (studentId: string) => StudentTermMetric[];
  getStudentTranscript: (studentId: string) => StudentTranscriptRow[];
  getStudentAvailableTerms: (studentId: string) => { termCode: string; termType: TermType }[];
  getTermCreditLimit: (studentId: string) => number;
  historicalStats: HistoricalCourseStat[];
  isAppDataReady: boolean;
  deleteTranscriptEntry: (entryId: string) => Promise<PlannerActionResult>;
  loadScheduleDraft: (studentId: string, draftId: string) => void;
  modelCoverage: number;
  modelLastCalculatedAt: string;
  modelVersion: string;
  plannerSelections: Record<string, string[]>;
  plannerTermCodes: Record<string, string>;
  passwordResetInquiries: PasswordResetInquiry[];
  requestPlannerAnalysis: (studentId: string) => ScheduleEvaluation | null;
  recentEvaluations: ScheduleEvaluation[];
  saveScheduleDraft: (studentId: string, name: string) => ScheduleDraft | null;
  setPlannerTermCode: (studentId: string, termCode: string) => void;
  studentInsights: StudentInsight[];
  submitPasswordResetInquiry: (role: PasswordInquiryRole, universityId: string) => Promise<PlannerActionResult>;
  toggleCourseSelection: (studentId: string, courseCode: string) => PlannerActionResult;
  transcriptRows: StudentTranscriptRow[];
  termMetrics: StudentTermMetric[];
  resolvePasswordResetInquiry: (inquiryId: string) => Promise<PlannerActionResult>;
  updateCourseDifficulty: (courseCode: string, difficultyScore: number) => Promise<PlannerActionResult>;
  upsertTranscriptEntry: (input: TranscriptEntryInput) => Promise<PlannerActionResult>;
  upsertCourse: (input: CourseFormInput) => void;
}

interface AppDataState {
  academicTerms: {
    termCode: string;
    academicYear: number;
    termName: AdmissionTerm;
    termType: TermType;
    maxCredits: number;
  }[];
  courses: Course[];
  currentEvaluations: Record<string, ScheduleEvaluation | null>;
  historicalStats: HistoricalCourseStat[];
  modelLastCalculatedAt: string;
  modelVersion: string;
  plannerSelections: Record<string, string[]>;
  plannerTermCodes: Record<string, string>;
  passwordResetInquiries: PasswordResetInquiry[];
  recentEvaluations: ScheduleEvaluation[];
  scheduleDrafts: ScheduleDraft[];
  studentProfiles: StudentProfile[];
  termMetrics: StudentTermMetric[];
  transcriptRows: StudentTranscriptRow[];
}

interface DepartmentRow {
  id: string;
  name: string;
}

interface AppSettingRow {
  key: string;
  value_json: unknown;
}

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  department_id: string;
  credits: number;
  course_type: Course['type'];
  is_plannable: boolean;
  internet_difficulty: number;
  difficulty_score: number;
  difficulty_basis: string;
  updated_at?: string | null;
}

interface CoursePrerequisiteRow {
  course_id: string;
  prerequisite_course_id: string;
}

interface CourseCorequisiteRow {
  course_id: string;
  corequisite_course_id: string;
}

interface CourseRuleRow {
  course_id: string;
  rule_type: string;
  rule_value_int: number | null;
}

interface HistoricalStatRow {
  id: string;
  course_id: string;
  term_code: string;
  avg_grade: number;
  pass_rate: number;
  fail_rate: number;
  enrollment_count: number;
  withdrawals: number;
}

interface StudentProfileRow {
  student_id: string;
  student_name: string;
  department_name: string;
  advisor_id: string | null;
  gpa: number;
  admission_year: number | null;
  admission_term: AdmissionTerm | null;
  completed_credits: number;
}

interface StudentCompletedCourseRow {
  id: string;
  student_id: string;
  term_code: string;
  term_type: TermType;
  course_code: string;
  course_name: string;
  credits: number;
  final_grade: number | null;
  status: 'passed' | 'failed' | 'withdrawn' | 'in_progress';
  attempt_no: number;
}

interface ScheduleDraftRow {
  id: string;
  student_id: string;
  name: string;
  term_code: string | null;
  status: ScheduleDraft['status'];
  saved_at: string;
}

interface ScheduleDraftCourseRow {
  schedule_id: string;
  course_id: string;
}

interface ScheduleEvaluationRow {
  id: string;
  schedule_id: string;
  student_id: string;
  total_score: number;
  risk_label: ScheduleEvaluation['riskLabel'];
  total_credits: number;
  model_version: string;
  explanation: string[] | null;
  factors: ScheduleEvaluation['factors'] | null;
  recommendations: ScheduleEvaluation['recommendations'] | null;
  top_courses: string[] | null;
  evaluated_at: string;
}

interface StudentTermMetricRow {
  student_id: string;
  term_code: string;
  term_type: TermType;
  course_count: number;
  completed_credits: number;
  gpa: number | null;
}

interface PasswordResetInquiryRow {
  id: string;
  requester_id: string;
  requester_role: PasswordInquiryRole;
  status: PasswordResetInquiry['status'];
  created_at: string;
  resolved_at: string | null;
}

interface AcademicTermRow {
  term_code: string;
  academic_year: number;
  term_name: AdmissionTerm;
  term_type: TermType;
  max_credits: number;
}

const EMPTY_SELECTION_STATUS: SelectionStatus = {
  eligible: false,
  reasons: ['Course was not found in the catalog.'],
  wouldExceedCredits: false,
};

const AppDataContext = createContext<AppDataContextType>({
  analyzeSchedule: () => null,
  clearSelection: () => {},
  assignAdvisor: async () => ({ success: false, error: 'App data is not ready.' }),
  createStudentAccount: async () => ({ success: false, error: 'App data is not ready.' }),
  createTranscriptFromDraft: async () => ({ success: false, error: 'App data is not ready.' }),
  courses: [],
  currentEvaluations: {},
  deleteTranscriptEntry: async () => ({ success: false, error: 'App data is not ready.' }),
  deleteScheduleDraft: () => {},
  getCourseSelectionState: () => EMPTY_SELECTION_STATUS,
  getCoursePrerequisitesWithGrades: () => [],
  getPlannerTermCode: () => '',
  getSelectedCourses: () => [],
  getStudentDrafts: () => [],
  getStudentTranscriptSemesters: () => [],
  getStudentTermMetrics: () => [],
  getStudentTranscript: () => [],
  getStudentAvailableTerms: () => [],
  getTermCreditLimit: () => 18,
  historicalStats: [],
  isAppDataReady: false,
  loadScheduleDraft: () => {},
  modelCoverage: 0,
  modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
  modelVersion: DEFAULT_MODEL_VERSION,
  plannerSelections: {},
  plannerTermCodes: {},
  passwordResetInquiries: [],
  requestPlannerAnalysis: () => null,
  recentEvaluations: [],
  saveScheduleDraft: () => null,
  setPlannerTermCode: () => {},
  studentInsights: [],
  submitPasswordResetInquiry: async () => ({ success: false, error: 'App data is not ready.' }),
  toggleCourseSelection: () => ({ success: false, error: 'App data is not ready.' }),
  transcriptRows: [],
  termMetrics: [],
  resolvePasswordResetInquiry: async () => ({ success: false, error: 'App data is not ready.' }),
  updateCourseDifficulty: async () => ({ success: false, error: 'App data is not ready.' }),
  upsertTranscriptEntry: async () => ({ success: false, error: 'App data is not ready.' }),
  upsertCourse: () => {},
});

function createId(_prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const nextValue = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return nextValue.toString(16);
  });
}

function sortDraftsNewestFirst(left: ScheduleDraft, right: ScheduleDraft) {
  return right.savedAt.localeCompare(left.savedAt);
}

function sortEvaluationsNewestFirst(left: ScheduleEvaluation, right: ScheduleEvaluation) {
  return right.evaluatedAt.localeCompare(left.evaluatedAt);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashSeed(seed: string) {
  return seed.split('').reduce((sum, character, index) => (
    sum + character.charCodeAt(0) * (index + 1)
  ), 0);
}

function seededUnit(seed: string) {
  const value = Math.sin(hashSeed(seed)) * 10000;
  return value - Math.floor(value);
}

function normalizeTranscriptMark(mark: number | null) {
  if (mark === null) {
    return null;
  }

  return mark < 35 ? 35 : mark;
}

function getCourseFillPriority(course: Course) {
  if (/^(311|312|313|EUNI)/.test(course.code)) {
    return 0;
  }

  if (/^(11102|11151|20132|20133|20200|20233|20234)$/.test(course.code)) {
    return 100;
  }

  if (/^EPRG/.test(course.code)) {
    return 200;
  }

  return 300;
}

function fillCompletedCoursesToTarget(profile: StudentProfile, courses: Course[]) {
  const completedCourses = profile.completedCourseCodes
    .map((code) => courses.find((course) => course.code === code))
    .filter((course): course is Course => Boolean(course));
  const completedCodes = new Set(completedCourses.map((course) => course.code));
  const currentHours = completedCourses.reduce((sum, course) => sum + course.credits, 0);
  const remainingHours = profile.creditsCompleted - currentHours;

  if (remainingHours <= 0) {
    return completedCourses;
  }

  const candidates = courses
    .filter((course) => course.credits > 0 && !completedCodes.has(course.code))
    .sort((left, right) => {
      const priorityDiff = getCourseFillPriority(left) - getCourseFillPriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.diffScore - right.diffScore;
    });

  const bestByHours: Array<{ courses: Course[]; priority: number } | null> = Array(remainingHours + 1).fill(null);
  bestByHours[0] = { courses: [], priority: 0 };

  candidates.forEach((candidate) => {
    const candidatePriority = getCourseFillPriority(candidate) + candidate.diffScore / 100;
    for (let hours = remainingHours; hours >= candidate.credits; hours -= 1) {
      const previous = bestByHours[hours - candidate.credits];
      if (!previous) {
        continue;
      }

      const next = {
        courses: [...previous.courses, candidate],
        priority: previous.priority + candidatePriority,
      };
      const existing = bestByHours[hours];
      if (!existing || next.priority < existing.priority) {
        bestByHours[hours] = next;
      }
    }
  });

  return bestByHours[remainingHours]
    ? [...completedCourses, ...bestByHours[remainingHours].courses]
    : completedCourses;
}

function allocateCoursesAcrossTerms<TCourse extends { credits: number }>(
  courses: TCourse[],
  terms: { termCode: string; termType: TermType }[]
) {
  const assignments = new Map<number, number>();
  let currentTermIndex = 0;
  let currentTermHours = 0;

  courses.forEach((course, courseIndex) => {
    while (
      currentTermIndex < terms.length - 1
      && currentTermHours + course.credits > getCreditLimitForTermCode(terms[currentTermIndex].termCode)
    ) {
      currentTermIndex += 1;
      currentTermHours = 0;
    }

    assignments.set(courseIndex, currentTermIndex);
    currentTermHours += course.credits;
  });

  return assignments;
}

function buildDemoTranscriptData(studentProfiles: StudentProfile[], courses: Course[]) {
  const nextRegisterableTermByStudent = new Map(
    studentProfiles.map((profile) => [
      profile.id,
      buildRegisterableTerms(profile.admissionYear, profile.admissionTerm)[0]?.termCode ?? `${new Date().getFullYear()}-Spring`,
    ])
  );

  const transcriptRows: StudentTranscriptRow[] = [];

  studentProfiles.forEach((profile) => {
    const nextRegisterableTermCode = nextRegisterableTermByStudent.get(profile.id) ?? `${new Date().getFullYear()}-Spring`;
    const eligibleTerms = buildAvailableTerms(
      profile.admissionYear,
      profile.admissionTerm,
      Number(nextRegisterableTermCode.split('-')[0] ?? new Date().getFullYear())
    ).filter((term) => compareTermCodesNewestFirst(term.termCode, nextRegisterableTermCode) > 0);

    const completedCourses = fillCompletedCoursesToTarget(profile, courses);

    if (completedCourses.length === 0 || eligibleTerms.length === 0) {
      return;
    }

    const termAssignments = allocateCoursesAcrossTerms(completedCourses, eligibleTerms);

    completedCourses.forEach((course, index) => {
      const termIndex = termAssignments.get(index) ?? 0;
      const term = eligibleTerms[termIndex] ?? eligibleTerms[eligibleTerms.length - 1];
      const studentStrength = clamp((profile.gpa - 3) * 14, -8, 8);
      const termMomentum = (termIndex / Math.max(eligibleTerms.length - 1, 1)) * 4;
      const randomOffset = Math.round((seededUnit(`${profile.id}:${course.code}:grade`) - 0.5) * 12);
      const grade = Math.round(clamp(
        89
        + studentStrength
        + termMomentum
        - (course.diffScore * 0.24)
        + randomOffset,
        61,
        96
      ));

      transcriptRows.push({
        id: `demo-transcript-${profile.id}-${term.termCode}-${course.code}-1`,
        studentId: profile.id,
        termCode: term.termCode,
        termLabel: formatTermLabel(term.termCode),
        termType: term.termType,
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        finalGrade: grade,
        status: 'passed',
        attemptNo: 1,
      });
    });
  });

  transcriptRows.sort((left, right) => {
    const termCompare = compareTermCodesNewestFirst(left.termCode, right.termCode);
    if (termCompare !== 0) {
      return termCompare;
    }

    return left.courseCode.localeCompare(right.courseCode);
  });

  const termMetricMap = new Map<string, StudentTermMetric>();
  transcriptRows.forEach((row) => {
    const key = `${row.studentId}:${row.termCode}`;
    const existing = termMetricMap.get(key) ?? {
      studentId: row.studentId,
      termCode: row.termCode,
      termLabel: formatTermLabel(row.termCode),
      termType: row.termType,
      courseCount: 0,
      completedCredits: 0,
      gpa: null,
    };

    termMetricMap.set(key, {
      ...existing,
      courseCount: existing.courseCount + 1,
      completedCredits: existing.completedCredits + (row.status === 'passed' ? row.credits : 0),
    });
  });

  const groupedRows = new Map<string, StudentTranscriptRow[]>();
  transcriptRows.forEach((row) => {
    const key = `${row.studentId}:${row.termCode}`;
    groupedRows.set(key, [...(groupedRows.get(key) ?? []), row]);
  });

  const termMetrics = [...termMetricMap.values()]
    .map((metric) => {
      const rows = groupedRows.get(`${metric.studentId}:${metric.termCode}`) ?? [];
      const normalizedMarks = rows
        .map((row) => normalizeTranscriptMark(row.finalGrade))
        .filter((mark): mark is number => mark !== null);
      const gpa = normalizedMarks.length > 0
        ? Math.round((normalizedMarks.reduce((sum, mark) => sum + mark, 0) * 4 / 100 / normalizedMarks.length) * 100) / 100
        : null;

      return {
        ...metric,
        gpa,
      } satisfies StudentTermMetric;
    })
    .sort((left, right) => compareTermCodesNewestFirst(left.termCode, right.termCode));

  return { transcriptRows, termMetrics };
}

function buildTranscriptSemesters(
  studentId: string,
  transcriptRows: StudentTranscriptRow[],
  termMetrics: StudentTermMetric[]
) {
  const rowsByTermCode = new Map<string, StudentTranscriptRow[]>();
  transcriptRows
    .filter((row) => row.studentId === studentId && row.termCode)
    .forEach((row) => {
      rowsByTermCode.set(row.termCode, [...(rowsByTermCode.get(row.termCode) ?? []), row]);
    });

  return termMetrics
    .filter((metric) => metric.studentId === studentId)
    .map((metric) => ({
      studentId,
      termCode: metric.termCode,
      termLabel: metric.termLabel,
      termType: metric.termType,
      courseCount: metric.courseCount,
      completedCredits: metric.completedCredits,
      gpa: metric.gpa,
      rows: [...(rowsByTermCode.get(metric.termCode) ?? [])].sort((left, right) => left.courseCode.localeCompare(right.courseCode)),
    }) satisfies StudentTranscriptSemester)
    .filter((semester) => semester.rows.length > 0);
}

function sortTranscriptRows(rows: StudentTranscriptRow[]) {
  return [...rows].sort((left, right) => {
    const termCompare = compareTermCodesNewestFirst(left.termCode, right.termCode);
    if (termCompare !== 0) {
      return termCompare;
    }

    const attemptCompare = (right.attemptNo ?? 1) - (left.attemptNo ?? 1);
    if (attemptCompare !== 0) {
      return attemptCompare;
    }

    return left.courseCode.localeCompare(right.courseCode);
  });
}

function deriveTermMetrics(transcriptRows: StudentTranscriptRow[]) {
  const rowsByTerm = new Map<string, StudentTranscriptRow[]>();
  transcriptRows
    .filter((row) => row.termCode && row.status !== 'not_taken')
    .forEach((row) => {
      const key = `${row.studentId}:${row.termCode}`;
      rowsByTerm.set(key, [...(rowsByTerm.get(key) ?? []), row]);
    });

  return [...rowsByTerm.entries()].map(([key, rows]) => {
    const [studentId, termCode] = key.split(':');
    const normalizedMarks = rows
      .map((row) => normalizeTranscriptMark(row.finalGrade))
      .filter((mark): mark is number => mark !== null);
    const gpa = normalizedMarks.length > 0
      ? Math.round((normalizedMarks.reduce((sum, mark) => sum + mark, 0) * 4 / 100 / normalizedMarks.length) * 100) / 100
      : null;

    return {
      studentId,
      termCode,
      termLabel: formatTermLabel(termCode),
      termType: rows[0]?.termType ?? 'regular',
      courseCount: rows.length,
      completedCredits: rows.reduce((sum, row) => sum + (row.status === 'passed' ? row.credits : 0), 0),
      gpa,
    } satisfies StudentTermMetric;
  }).sort((left, right) => compareTermCodesNewestFirst(left.termCode, right.termCode));
}

function syncDerivedTranscriptState(state: AppDataState, transcriptRows: StudentTranscriptRow[]) {
  const sortedRows = sortTranscriptRows(transcriptRows);
  const termMetrics = deriveTermMetrics(sortedRows);
  const studentProfiles = state.studentProfiles.map((profile) => {
    const studentRows = sortedRows.filter((row) => row.studentId === profile.id);
    const passedByCourse = new Map<string, StudentTranscriptRow>();
    studentRows
      .filter((row) => row.status === 'passed')
      .forEach((row) => {
        if (!passedByCourse.has(row.courseCode)) {
          passedByCourse.set(row.courseCode, row);
        }
      });
    const gradedMarks = studentRows
      .map((row) => normalizeTranscriptMark(row.finalGrade))
      .filter((mark): mark is number => mark !== null);

    return {
      ...profile,
      completedCourseCodes: [...passedByCourse.keys()],
      creditsCompleted: [...passedByCourse.values()].reduce((sum, row) => sum + row.credits, 0),
      gpa: gradedMarks.length > 0
        ? Math.round((gradedMarks.reduce((sum, mark) => sum + mark, 0) * 4 / 100 / gradedMarks.length) * 100) / 100
        : profile.gpa,
    } satisfies StudentProfile;
  });

  return {
    ...state,
    studentProfiles,
    termMetrics,
    transcriptRows: sortedRows,
  } satisfies AppDataState;
}

function getTranscriptStatusForGrade(grade: number | null, fallback: TranscriptEntryInput['status']) {
  if (fallback === 'withdrawn' || fallback === 'in_progress') {
    return fallback;
  }

  if (grade === null) {
    return 'in_progress';
  }

  return grade >= 60 ? 'passed' : 'failed';
}

function buildDemoState(): AppDataState {
  const historicalStats = buildSeedHistoricalStats();
  const courses = buildCourses(historicalStats);
  const studentProfiles = STUDENT_PROFILES;
  const { transcriptRows, termMetrics } = buildDemoTranscriptData(studentProfiles, courses);

  return {
    academicTerms: [],
    courses,
    currentEvaluations: {},
    historicalStats,
    modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
    modelVersion: DEFAULT_MODEL_VERSION,
    plannerSelections: {},
    plannerTermCodes: {},
    passwordResetInquiries: [],
    recentEvaluations: [],
    scheduleDrafts: [],
    studentProfiles,
    termMetrics,
    transcriptRows,
  };
}

function buildEmptyRemoteState(): AppDataState {
  return {
    academicTerms: [],
    courses: [],
    currentEvaluations: {},
    historicalStats: [],
    modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
    modelVersion: DEFAULT_MODEL_VERSION,
    plannerSelections: {},
    plannerTermCodes: {},
    passwordResetInquiries: [],
    recentEvaluations: [],
    scheduleDrafts: [],
    studentProfiles: [],
    termMetrics: [],
    transcriptRows: [],
  };
}

function getCourseCoverage(courses: Course[]) {
  if (courses.length === 0) {
    return 0;
  }

  const covered = courses.filter(
    (course) =>
      Number.isFinite(course.diffScore) &&
      Number.isFinite(course.avgGrade) &&
      Number.isFinite(course.passRate) &&
      Number.isFinite(course.failRate) &&
      Boolean(course.modelVersion)
  ).length;

  return Math.round((covered / courses.length) * 100);
}

async function loadRemoteSnapshot(users: ReturnType<typeof useAuth>['users']) {
  const [
    academicTermRows,
    departments,
    settings,
    courseRows,
    prerequisiteRows,
    corequisiteRows,
    ruleRows,
    statRows,
    profileRows,
    transcriptViewRows,
    draftRows,
    draftCourseRows,
    evaluationRows,
    termMetricRows,
    passwordInquiryRows,
  ] = await Promise.all([
    supabaseSelect<AcademicTermRow[]>('academic_terms', 'select=term_code,academic_year,term_name,term_type,max_credits'),
    supabaseSelect<DepartmentRow[]>('departments', 'select=id,name'),
    supabaseSelect<AppSettingRow[]>('app_settings', 'select=key,value_json'),
    supabaseSelect<CourseRow[]>(
      'courses',
      'select=id,course_code,title,department_id,credits,course_type,is_plannable,internet_difficulty,difficulty_score,difficulty_basis,updated_at&order=course_code.asc'
    ),
    supabaseSelect<CoursePrerequisiteRow[]>('course_prerequisites', 'select=course_id,prerequisite_course_id'),
    supabaseSelect<CourseCorequisiteRow[]>('course_corequisites', 'select=course_id,corequisite_course_id'),
    supabaseSelect<CourseRuleRow[]>('course_rules', 'select=course_id,rule_type,rule_value_int'),
    supabaseSelect<HistoricalStatRow[]>(
      'historical_course_stats',
      'select=id,course_id,term_code,avg_grade,pass_rate,fail_rate,enrollment_count,withdrawals'
    ),
    supabaseSelect<StudentProfileRow[]>('student_dashboard_summary_v', 'select=student_id,student_name,department_name,advisor_id,gpa,admission_year,admission_term,completed_credits'),
    supabaseSelect<StudentCompletedCourseRow[]>('student_transcript_v', 'select=id,student_id,term_code,term_type,course_code,course_name,credits,final_grade,status,attempt_no'),
    supabaseSelect<ScheduleDraftRow[]>('schedule_drafts', 'select=id,student_id,name,term_code,status,saved_at&order=saved_at.desc'),
    supabaseSelect<ScheduleDraftCourseRow[]>('schedule_draft_courses', 'select=schedule_id,course_id'),
    supabaseSelect<ScheduleEvaluationRow[]>(
      'schedule_evaluations',
      'select=id,schedule_id,student_id,total_score,risk_label,total_credits,model_version,explanation,factors,recommendations,top_courses,evaluated_at&order=evaluated_at.desc'
    ),
    supabaseSelect<StudentTermMetricRow[]>('student_term_metrics_v', 'select=student_id,term_code,term_type,course_count,completed_credits,gpa&order=term_code.desc'),
    supabaseSelect<PasswordResetInquiryRow[]>('password_reset_inquiries', 'select=id,requester_id,requester_role,status,created_at,resolved_at&order=created_at.desc'),
  ]);

  const departmentById = new Map(departments.map((department) => [department.id, department.name]));
  const courseCodeById = new Map(courseRows.map((course) => [course.id, course.course_code]));

  const prerequisiteCodesByCourseId = new Map<string, string[]>();
  prerequisiteRows.forEach((row) => {
    const prerequisiteCode = courseCodeById.get(row.prerequisite_course_id);
    if (!prerequisiteCode) {
      return;
    }

    prerequisiteCodesByCourseId.set(row.course_id, [
      ...(prerequisiteCodesByCourseId.get(row.course_id) ?? []),
      prerequisiteCode,
    ]);
  });

  const corequisiteCodesByCourseId = new Map<string, string[]>();
  corequisiteRows.forEach((row) => {
    const corequisiteCode = courseCodeById.get(row.corequisite_course_id);
    if (!corequisiteCode) {
      return;
    }

    corequisiteCodesByCourseId.set(row.course_id, [
      ...(corequisiteCodesByCourseId.get(row.course_id) ?? []),
      corequisiteCode,
    ]);
  });

  const minimumCreditsByCourseId = new Map<string, number>();
  ruleRows.forEach((row) => {
    if (row.rule_type === 'minimum_completed_credits' && typeof row.rule_value_int === 'number') {
      minimumCreditsByCourseId.set(row.course_id, row.rule_value_int);
    }
  });

  const historicalStats: HistoricalCourseStat[] = statRows.map((row) => ({
    id: row.id,
    courseCode: courseCodeById.get(row.course_id) ?? row.course_id,
    termId: row.term_code,
    avgGrade: Number(row.avg_grade),
    passRate: Number(row.pass_rate),
    failRate: Number(row.fail_rate),
    enrollmentCount: row.enrollment_count,
    withdrawals: row.withdrawals,
  }));

  const courses = courseRows.map((row) => {
    const aggregatedStats = historicalStats.filter((item) => item.courseCode === row.course_code);
    const avgGrade = aggregatedStats.length > 0
      ? Math.round(aggregatedStats.reduce((sum, item) => sum + item.avgGrade, 0) / aggregatedStats.length)
      : 75;
    const passRate = aggregatedStats.length > 0
      ? Math.round(aggregatedStats.reduce((sum, item) => sum + item.passRate, 0) / aggregatedStats.length)
      : 78;
    const failRate = aggregatedStats.length > 0
      ? Math.round(aggregatedStats.reduce((sum, item) => sum + item.failRate, 0) / aggregatedStats.length)
      : 12;
    const enrollmentCount = aggregatedStats.length > 0
      ? Math.round(aggregatedStats.reduce((sum, item) => sum + item.enrollmentCount, 0) / aggregatedStats.length)
      : 60;
    const withdrawals = aggregatedStats.length > 0
      ? Math.round(aggregatedStats.reduce((sum, item) => sum + item.withdrawals, 0) / aggregatedStats.length)
      : 2;
    const blueprint = {
      code: row.course_code,
      name: row.title,
      department: departmentById.get(row.department_id) ?? 'Computer Science',
      type: row.course_type,
      isPlannable: row.is_plannable,
      credits: row.credits,
      prerequisites: prerequisiteCodesByCourseId.get(row.id) ?? [],
      concurrentCourses: corequisiteCodesByCourseId.get(row.id) ?? [],
      minimumCompletedCredits: minimumCreditsByCourseId.get(row.id),
      internetDifficulty: row.internet_difficulty,
      difficultyBasis: row.difficulty_basis || 'Difficulty score imported from the catalog.',
    };
    const stats = { avgGrade, passRate, failRate, enrollmentCount, withdrawals };
    const diffScore = Number(row.difficulty_score) > 0
      ? Math.round(Number(row.difficulty_score))
      : computeCourseDifficulty(blueprint, stats);

    return {
      ...blueprint,
      ...stats,
      requirementText: formatRequirementText(blueprint),
      diffScore,
      difficultyLabel: getDiffLabel(diffScore).label,
      modelVersion: DEFAULT_MODEL_VERSION,
      lastCalculatedAt: row.updated_at ?? MODEL_LAST_CALCULATED_AT,
      dataPoints: aggregatedStats.length,
    } satisfies Course;
  });

  const latestCalculatedAt = courses
    .map((course) => course.lastCalculatedAt)
    .sort((left, right) => right.localeCompare(left))[0] ?? MODEL_LAST_CALCULATED_AT;

  const appUsersByAppId = new Map(users.filter((account) => account.appUserId).map((account) => [account.appUserId!, account]));
  const academicTerms = academicTermRows
    .map((row) => ({
      termCode: row.term_code,
      academicYear: row.academic_year,
      termName: row.term_name,
      termType: row.term_type,
      maxCredits: row.max_credits,
    }))
    .sort((left, right) => compareTermCodesNewestFirst(right.termCode, left.termCode));

  const completedCourseCodesByStudentId = new Map<string, Set<string>>();
  const transcriptRows: StudentTranscriptRow[] = [];
  transcriptViewRows.forEach((row) => {
    const studentUniversityId = appUsersByAppId.get(row.student_id)?.id;
    if (!studentUniversityId) {
      return;
    }

    if (row.status === 'passed') {
      const existingCompleted = completedCourseCodesByStudentId.get(studentUniversityId) ?? new Set<string>();
      existingCompleted.add(row.course_code);
      completedCourseCodesByStudentId.set(studentUniversityId, existingCompleted);
    }

    const termCode = row.term_code;
    transcriptRows.push({
      id: row.id,
      studentId: studentUniversityId,
      termCode,
      termLabel: formatTermLabel(termCode),
      termType: row.term_type,
      courseCode: row.course_code,
      courseName: row.course_name,
      credits: row.credits,
      finalGrade: row.final_grade === null ? null : Number(row.final_grade),
      status: row.status,
      attemptNo: row.attempt_no,
    });
  });
  transcriptRows.sort((left, right) => {
    const termCompare = compareTermCodesNewestFirst(left.termCode, right.termCode);
    if (termCompare !== 0) {
      return termCompare;
    }

    const attemptCompare = (right.attemptNo ?? 1) - (left.attemptNo ?? 1);
    if (attemptCompare !== 0) {
      return attemptCompare;
    }

    return left.courseCode.localeCompare(right.courseCode);
  });

  const remoteProfiles = profileRows.flatMap((row) => {
    const student = appUsersByAppId.get(row.student_id);
    if (!student) {
      return [];
    }

    const advisor = row.advisor_id ? appUsersByAppId.get(row.advisor_id) : null;

    return [{
      id: student.id,
      name: row.student_name,
      gpa: Number(row.gpa ?? 0),
      creditsCompleted: row.completed_credits,
      department: row.department_name,
      advisorId: advisor?.id ?? '',
      completedCourseCodes: [...(completedCourseCodesByStudentId.get(student.id) ?? new Set<string>())],
      admissionYear: row.admission_year ?? (Number(student.id.slice(0, 4)) || new Date().getFullYear()),
      admissionTerm: row.admission_term ?? 'fall',
    } satisfies StudentProfile];
  });

  const studentProfiles = users
    .filter((account) => account.role === 'student')
    .map((account) => remoteProfiles.find((profile) => profile.id === account.id))
    .filter(Boolean) as StudentProfile[];

  const evaluationByScheduleId = new Map<string, ScheduleEvaluation>();
  evaluationRows.forEach((row) => {
    evaluationByScheduleId.set(row.schedule_id, {
      id: row.id,
      studentId: appUsersByAppId.get(row.student_id)?.id ?? row.student_id,
      totalScore: Math.round(Number(row.total_score)),
      riskLabel: row.risk_label,
      totalCredits: row.total_credits,
      evaluatedAt: row.evaluated_at,
      modelVersion: row.model_version,
      explanation: row.explanation ?? [],
      factors: row.factors ?? [],
      recommendations: row.recommendations ?? [],
      topCourses: row.top_courses ?? [],
    });
  });

  const courseCodesByDraftId = new Map<string, string[]>();
  draftCourseRows.forEach((row) => {
    const code = courseCodeById.get(row.course_id);
    if (!code) {
      return;
    }

    courseCodesByDraftId.set(row.schedule_id, [
      ...(courseCodesByDraftId.get(row.schedule_id) ?? []),
      code,
    ]);
  });

  const scheduleDrafts = draftRows.flatMap((row) => {
    const studentId = appUsersByAppId.get(row.student_id)?.id;
    const evaluation = evaluationByScheduleId.get(row.id);
    if (!studentId || !evaluation) {
      return [];
    }

    return [{
      id: row.id,
      studentId,
      name: row.name,
      courseCodes: courseCodesByDraftId.get(row.id) ?? [],
      termCode: row.term_code ?? '2026-Spring',
      status: row.status,
      syncStatus: 'synced',
      syncError: null,
      savedAt: row.saved_at,
      evaluation,
    } satisfies ScheduleDraft];
  }).sort(sortDraftsNewestFirst);

  const latestDraftByStudentId = new Map<string, ScheduleDraft>();
  scheduleDrafts.forEach((draft) => {
    if (!latestDraftByStudentId.has(draft.studentId)) {
      latestDraftByStudentId.set(draft.studentId, draft);
    }
  });

  const plannerSelections = Object.fromEntries(
    [...latestDraftByStudentId.entries()].map(([studentId, draft]) => [studentId, draft.courseCodes])
  ) as Record<string, string[]>;
  const plannerTermCodes = Object.fromEntries(
    studentProfiles.map((profile) => {
      const latestDraft = latestDraftByStudentId.get(profile.id);
      const availableTerms = buildRegisterableTerms(profile.admissionYear, profile.admissionTerm);
      const registerableTermCode = availableTerms[0]?.termCode ?? `${new Date().getFullYear()}-Spring`;
      return [profile.id, latestDraft?.termCode === registerableTermCode ? latestDraft.termCode : registerableTermCode];
    })
  ) as Record<string, string>;

  const currentEvaluations = Object.fromEntries(
    [...latestDraftByStudentId.entries()].map(([studentId, draft]) => [studentId, draft.evaluation])
  ) as Record<string, ScheduleEvaluation | null>;

  const recentEvaluations = [...evaluationByScheduleId.values()].sort(sortEvaluationsNewestFirst);
  const modelVersionSetting = settings.find((setting) => setting.key === 'model_version');
  const modelVersion = typeof modelVersionSetting?.value_json === 'string'
    ? modelVersionSetting.value_json
    : DEFAULT_MODEL_VERSION;

  const termMetrics = termMetricRows.flatMap((row) => {
    const studentUniversityId = appUsersByAppId.get(row.student_id)?.id;
    if (!studentUniversityId) {
      return [];
    }

    return [{
      studentId: studentUniversityId,
      termCode: row.term_code,
      termLabel: formatTermLabel(row.term_code),
      termType: row.term_type,
      courseCount: row.course_count,
      completedCredits: row.completed_credits,
      gpa: row.gpa === null ? null : Number(row.gpa),
    } satisfies StudentTermMetric];
  }).sort((left, right) => compareTermCodesNewestFirst(left.termCode, right.termCode));

  const passwordResetInquiries = passwordInquiryRows.flatMap((row) => {
    const requester = appUsersByAppId.get(row.requester_id);
    if (!requester) {
      return [];
    }

    return [{
      id: row.id,
      requesterId: requester.id,
      requesterName: requester.name,
      requesterRole: row.requester_role,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    } satisfies PasswordResetInquiry];
  });

  return {
    academicTerms,
    courses,
    currentEvaluations,
    historicalStats,
    modelLastCalculatedAt: latestCalculatedAt,
    modelVersion,
    plannerSelections,
    plannerTermCodes,
    passwordResetInquiries,
    recentEvaluations,
    scheduleDrafts,
    studentProfiles,
    termMetrics,
    transcriptRows,
  } satisfies AppDataState;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthReady, upsertUser, user, users } = useAuth();
  const [state, setState] = useState<AppDataState>(() => (
    hasSupabaseConfig() ? buildEmptyRemoteState() : buildDemoState()
  ));
  const [isAppDataReady, setIsAppDataReady] = useState(!hasSupabaseConfig());

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    if (!isAuthReady) {
      return;
    }

    let cancelled = false;

    void loadRemoteSnapshot(users)
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setState(snapshot);
        setIsAppDataReady(true);
      })
      .catch((error) => {
        console.error('Unable to load app data from Supabase.', error);
        if (!cancelled) {
          setState(buildEmptyRemoteState());
          setIsAppDataReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, user?.id, users]);

  const studentInsights = useMemo(
    () => buildStudentInsights(state.studentProfiles, state.scheduleDrafts),
    [state.scheduleDrafts, state.studentProfiles]
  );

  const getStudentProfile = useCallback(
    (studentId: string) =>
      state.studentProfiles.find((profile) => profile.id === studentId)
      ?? null,
    [state.studentProfiles]
  );

  const getStudentTranscript = useCallback(
    (studentId: string) => {
      const profile = getStudentProfile(studentId);
      const recordedRows = state.transcriptRows.filter((row) => row.studentId === studentId);

      if (!profile) {
        return recordedRows;
      }

      const latestRecordedByCode = new Map<string, StudentTranscriptRow>();
      recordedRows.forEach((row) => {
        if (!latestRecordedByCode.has(row.courseCode)) {
          latestRecordedByCode.set(row.courseCode, row);
        }
      });

      const transcriptRows = state.courses.map((course) => {
        const recorded = latestRecordedByCode.get(course.code);
        if (recorded) {
          return {
            ...recorded,
            termLabel: formatCompactTermLabel(recorded.termCode),
          } satisfies StudentTranscriptRow;
        }

        return {
          studentId,
          termCode: '',
          termLabel: '-',
          termType: 'regular',
          courseCode: course.code,
          courseName: course.name,
          credits: course.credits,
          finalGrade: null,
          status: 'not_taken',
          attemptNo: 0,
        } satisfies StudentTranscriptRow;
      });

      return transcriptRows.sort((left, right) => {
        const leftTaken = left.termCode ? 1 : 0;
        const rightTaken = right.termCode ? 1 : 0;
        if (leftTaken !== rightTaken) {
          return rightTaken - leftTaken;
        }

        if (left.termCode && right.termCode) {
          const termCompare = compareTermCodesNewestFirst(right.termCode, left.termCode);
          if (termCompare !== 0) {
            return termCompare;
          }
        }

        return left.courseCode.localeCompare(right.courseCode);
      });
    },
    [getStudentProfile, state.courses, state.transcriptRows]
  );

  const getStudentTermMetrics = useCallback(
    (studentId: string) => state.termMetrics.filter((row) => row.studentId === studentId),
    [state.termMetrics]
  );

  const getStudentTranscriptSemesters = useCallback(
    (studentId: string) => buildTranscriptSemesters(studentId, state.transcriptRows, state.termMetrics),
    [state.termMetrics, state.transcriptRows]
  );

  const getStudentAvailableTerms = useCallback(
    (studentId: string) => {
      const profile = getStudentProfile(studentId);
      if (!profile) {
        return [];
      }

      return buildRegisterableTerms(profile.admissionYear, profile.admissionTerm);
    },
    [getStudentProfile]
  );

  const getPlannerTermCode = useCallback(
    (studentId: string) => state.plannerTermCodes[studentId] ?? '',
    [state.plannerTermCodes]
  );

  const getTermCreditLimit = useCallback(
    (studentId: string) => {
      const termCode = getPlannerTermCode(studentId);
      const matchingTerm = state.academicTerms.find((term) => term.termCode === termCode);
      return matchingTerm?.maxCredits ?? getCreditLimitForTermCode(termCode);
    },
    [getPlannerTermCode, state.academicTerms]
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
      state.scheduleDrafts.filter((draft) => draft.studentId === studentId).sort(sortDraftsNewestFirst),
    [state.scheduleDrafts]
  );

  const getCourseSelectionState = useCallback(
    (studentId: string, courseCode: string) => {
      const course = state.courses.find((item) => item.code === courseCode);
      if (!course) {
        return EMPTY_SELECTION_STATUS;
      }

      const profile = getStudentProfile(studentId);
      const maxCredits = getTermCreditLimit(studentId);
      return getCourseSelectionStatus(
        course,
        profile?.completedCourseCodes ?? [],
        state.plannerSelections[studentId] ?? [],
        profile?.creditsCompleted ?? 0,
        state.courses,
        maxCredits
      );
    },
    [getStudentProfile, getTermCreditLimit, state.courses, state.plannerSelections]
  );

  const getCoursePrerequisitesWithGrades = useCallback(
    (studentId: string, courseCode: string) => {
      const course = state.courses.find((item) => item.code === courseCode);
      if (!course || course.prerequisites.length === 0) {
        return [];
      }

      const transcript = getStudentTranscript(studentId);
      const latestTranscriptByCode = new Map<string, StudentTranscriptRow>();
      transcript.forEach((row) => {
        if (!latestTranscriptByCode.has(row.courseCode)) {
          latestTranscriptByCode.set(row.courseCode, row);
        }
      });

      return course.prerequisites.map((code) => ({
        code,
        name: state.courses.find((item) => item.code === code)?.name ?? code,
        grade: latestTranscriptByCode.get(code)?.finalGrade ?? null,
      }));
    },
    [getStudentTranscript, state.courses]
  );

  const toggleCourseSelection = useCallback(
    (studentId: string, courseCode: string) => {
      const course = state.courses.find((item) => item.code === courseCode);
      if (!course) {
        return { success: false, error: 'Course was not found.' };
      }

      const currentSelection = state.plannerSelections[studentId] ?? [];
      const isSelected = currentSelection.includes(courseCode);
      if (!isSelected) {
        const selectionState = getCourseSelectionState(studentId, courseCode);
        if (!selectionState.eligible) {
          return {
            success: false,
            error: selectionState.reasons[0] ?? 'This course cannot be added yet.',
          };
        }
      }

      setState((current) => {
        const selectedCodes = current.plannerSelections[studentId] ?? [];
        const nextSelection = selectedCodes.includes(courseCode)
          ? selectedCodes.filter((code) => code !== courseCode)
          : [...selectedCodes, courseCode];

        return {
          ...current,
          plannerSelections: {
            ...current.plannerSelections,
            [studentId]: nextSelection,
          },
          currentEvaluations: {
            ...current.currentEvaluations,
            [studentId]: null,
          },
        };
      });

      return { success: true };
    },
    [getCourseSelectionState, state.courses, state.plannerSelections]
  );

  const setPlannerTermCode = useCallback((studentId: string, termCode: string) => {
    setState((current) => ({
      ...current,
      plannerTermCodes: {
        ...current.plannerTermCodes,
        [studentId]: termCode,
      },
    }));
  }, []);

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

  const requestPlannerAnalysis = useCallback(
    (studentId: string) => {
      const profile = getStudentProfile(studentId);
      const selectedCourses = getSelectedCourses(studentId);
      // TODO: Replace this placeholder orchestration with an API request that
      // sends studentId, planner term, selected courses, and transcript context,
      // then maps the trained model response into ScheduleEvaluation.
      const evaluation = buildMockPlannerAiEvaluation(
        studentId,
        selectedCourses,
        state.courses,
        state.modelVersion,
        profile?.completedCourseCodes ?? [],
        profile?.creditsCompleted ?? 0
      );

      setState((current) => ({
        ...current,
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: evaluation,
        },
        recentEvaluations: evaluation
          ? [evaluation, ...current.recentEvaluations.filter((item) => item.id !== evaluation.id)].sort(sortEvaluationsNewestFirst)
          : current.recentEvaluations,
      }));

      return evaluation;
    },
    [getSelectedCourses, getStudentProfile, state.courses, state.modelVersion]
  );

  const analyzeSchedule = useCallback(
    (studentId: string) => requestPlannerAnalysis(studentId),
    [requestPlannerAnalysis]
  );

  const loadScheduleDraft = useCallback(
    (studentId: string, draftId: string) => {
      const draft = state.scheduleDrafts.find((item) => item.id === draftId && item.studentId === studentId);
      const profile = getStudentProfile(studentId);
      if (!draft) {
        return;
      }

      const registerableTermCode = profile
        ? buildRegisterableTerms(profile.admissionYear, profile.admissionTerm)[0]?.termCode ?? draft.termCode
        : draft.termCode;

      setState((current) => ({
        ...current,
        plannerSelections: {
          ...current.plannerSelections,
          [studentId]: draft.courseCodes,
        },
        plannerTermCodes: {
          ...current.plannerTermCodes,
          [studentId]: draft.termCode === registerableTermCode ? draft.termCode : registerableTermCode,
        },
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: draft.evaluation,
        },
      }));
    },
    [getStudentProfile, state.scheduleDrafts]
  );

  const saveScheduleDraft = useCallback(
    (studentId: string, name: string) => {
      const evaluation = state.currentEvaluations[studentId];
      const courseCodes = state.plannerSelections[studentId] ?? [];
      const termCode = state.plannerTermCodes[studentId] ?? getStudentAvailableTerms(studentId)[0]?.termCode ?? '2026-Spring';
      if (!evaluation || courseCodes.length === 0) {
        return null;
      }

      const now = new Date().toISOString();
      const draftId = createId('draft');
      const evaluationId = createId('eval');
      const nextEvaluation = {
        ...evaluation,
        id: evaluationId,
        evaluatedAt: now,
      };
      const studentAppUserId = users.find((account) => account.id === studentId)?.appUserId;
      const shouldPersistRemotely = hasSupabaseConfig() && Boolean(studentAppUserId);
      const nextDraft = {
        id: draftId,
        studentId,
        name,
        courseCodes,
        savedAt: now,
        termCode,
        status: 'draft',
        syncStatus: shouldPersistRemotely ? 'pending' : 'synced',
        syncError: null,
        evaluation: nextEvaluation,
      } satisfies ScheduleDraft;

      setState((current) => ({
        ...current,
        currentEvaluations: {
          ...current.currentEvaluations,
          [studentId]: nextEvaluation,
        },
        recentEvaluations: [nextEvaluation, ...current.recentEvaluations.filter((item) => item.id !== nextEvaluation.id)].sort(sortEvaluationsNewestFirst),
        scheduleDrafts: [nextDraft, ...current.scheduleDrafts.filter((draft) => draft.id !== draftId)].sort(sortDraftsNewestFirst),
      }));

      if (shouldPersistRemotely && studentAppUserId) {
        void (async () => {
          try {
            const remoteCourseRows = await supabaseSelect<CourseRow[]>(
              'courses',
              `select=id,course_code,title,department_id,credits,course_type,is_plannable,internet_difficulty,difficulty_score,difficulty_basis&course_code=in.(${courseCodes.map(encodeURIComponent).join(',')})`
            );
            const courseIdByCode = new Map(remoteCourseRows.map((course) => [course.course_code, course.id]));

            await supabaseInsert('schedule_drafts', {
              id: draftId,
              student_id: studentAppUserId,
              name,
              term_code: termCode,
              status: 'draft',
              saved_at: now,
            });

            const scheduleCourseRows = courseCodes
              .map((code) => courseIdByCode.get(code))
              .filter(Boolean)
              .map((courseId) => ({
                id: createId('draft-course'),
                schedule_id: draftId,
                course_id: courseId,
              }));

            if (scheduleCourseRows.length > 0) {
              await supabaseInsert('schedule_draft_courses', scheduleCourseRows);
            }

            await supabaseInsert('schedule_evaluations', {
              id: evaluationId,
              schedule_id: draftId,
              student_id: studentAppUserId,
              total_score: nextEvaluation.totalScore,
              risk_label: nextEvaluation.riskLabel,
              total_credits: nextEvaluation.totalCredits,
              model_version: nextEvaluation.modelVersion,
              explanation: nextEvaluation.explanation,
              factors: nextEvaluation.factors,
              recommendations: nextEvaluation.recommendations,
              top_courses: nextEvaluation.topCourses,
              evaluated_at: now,
            });

            setState((current) => ({
              ...current,
              scheduleDrafts: current.scheduleDrafts.map((draft): ScheduleDraft =>
                draft.id === draftId
                  ? { ...draft, syncStatus: 'synced', syncError: null }
                  : draft
              ).sort(sortDraftsNewestFirst),
            }));
          } catch (error) {
            console.error('Unable to persist schedule draft to Supabase.', error);
            setState((current) => ({
              ...current,
              scheduleDrafts: current.scheduleDrafts.map((draft): ScheduleDraft =>
                draft.id === draftId
                  ? {
                      ...draft,
                      syncStatus: 'error',
                      syncError: error instanceof Error ? error.message : 'Unable to persist this draft to Supabase.',
                    }
                  : draft
              ).sort(sortDraftsNewestFirst),
            }));
          }
        })();
      }

      return nextDraft;
    },
    [getStudentAvailableTerms, state.currentEvaluations, state.plannerSelections, state.plannerTermCodes, users]
  );

  const deleteScheduleDraft = useCallback((draftId: string) => {
    setState((current) => ({
      ...current,
      scheduleDrafts: current.scheduleDrafts.filter((draft) => draft.id !== draftId),
    }));

    if (hasSupabaseConfig()) {
      void supabaseDelete('schedule_drafts', `id=eq.${encodeURIComponent(draftId)}`).catch((error) => {
        console.error('Unable to delete schedule draft from Supabase.', error);
      });
    }
  }, []);

  const assignAdvisor = useCallback(async (studentId: string, advisorId: string): Promise<PlannerActionResult> => {
    if (!users.some((account) => account.id === advisorId && account.role === 'advisor')) {
      return { success: false, error: 'Advisor account was not found.' };
    }

    setState((current) => ({
      ...current,
      studentProfiles: current.studentProfiles.map((profile) =>
        profile.id === studentId ? { ...profile, advisorId } : profile
      ),
    }));

    if (hasSupabaseConfig()) {
      const studentAppUserId = users.find((account) => account.id === studentId)?.appUserId;
      const advisorAppUserId = users.find((account) => account.id === advisorId)?.appUserId;
      if (studentAppUserId && advisorAppUserId) {
        try {
          await supabasePatch('student_profiles', `user_id=eq.${encodeURIComponent(studentAppUserId)}`, {
            advisor_id: advisorAppUserId,
          });
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to assign advisor.',
          };
        }
      }
    }

    return { success: true };
  }, [users]);

  const createStudentAccount = useCallback(async (input: StudentAccountInput): Promise<PlannerActionResult & { studentId?: string }> => {
    const userInput: UserFormInput = {
      id: input.id,
      name: input.name,
      role: 'student',
      subtitle: `Student | ${input.department}`,
      password: input.temporaryPassword,
      status: 'active',
    };
    const userResult = upsertUser(userInput);
    if (!userResult.success) {
      return userResult;
    }

    const nextProfile = {
      id: input.id,
      name: input.name,
      gpa: 0,
      creditsCompleted: 0,
      department: input.department,
      advisorId: input.advisorId,
      completedCourseCodes: [],
      admissionYear: input.enrollmentYear,
      admissionTerm: input.admissionTerm,
    } satisfies StudentProfile;

    setState((current) => ({
      ...current,
      studentProfiles: [
        nextProfile,
        ...current.studentProfiles.filter((profile) => profile.id !== input.id),
      ],
    }));

    if (hasSupabaseConfig()) {
      try {
        const email = `${input.id.toLowerCase()}@students.example.edu`;
        const appUserRows = await supabaseUpsert<Array<{ id: string }>>(
          'app_users',
          {
            university_id: input.id,
            role: 'student',
            full_name: input.name,
            initials: getInitials(input.name),
            email,
            subtitle: `Student | ${input.department}`,
            status: 'active',
          },
          'university_id'
        );
        const studentAppUserId = appUserRows[0]?.id;
        const departmentRows = await supabaseSelect<DepartmentRow[]>(
          'departments',
          `select=id,name&name=eq.${encodeURIComponent(input.department)}&limit=1`
        );
        const advisorAppUserId = users.find((account) => account.id === input.advisorId)?.appUserId ?? null;
        const departmentId = departmentRows[0]?.id;

        if (studentAppUserId && departmentId) {
          await supabaseUpsert(
            'student_profiles',
            {
              user_id: studentAppUserId,
              department_id: departmentId,
              advisor_id: advisorAppUserId,
              gpa: 0,
              completed_credits: 0,
              admission_year: input.enrollmentYear,
              admission_term: input.admissionTerm,
            },
            'user_id'
          );
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to persist student account.',
          studentId: input.id,
        };
      }
    }

    return { success: true, studentId: input.id };
  }, [upsertUser, users]);

  const validateTranscriptInput = useCallback((input: TranscriptEntryInput, currentRows: StudentTranscriptRow[]) => {
    const course = state.courses.find((item) => item.code === input.courseCode);
    if (!course) {
      return 'Course was not found.';
    }

    if (input.finalGrade !== null && (!Number.isFinite(input.finalGrade) || input.finalGrade < 0 || input.finalGrade > 100)) {
      return 'Marks must be between 0 and 100.';
    }

    if (input.attemptNo < 1) {
      return 'Attempt number must be at least 1.';
    }

    const termRows = currentRows.filter((row) =>
      row.studentId === input.studentId
      && row.termCode === input.termCode
      && row.id !== input.id
      && row.status !== 'withdrawn'
    );
    const nextTermHours = termRows.reduce((sum, row) => sum + row.credits, 0) + (input.status === 'withdrawn' ? 0 : course.credits);
    const termLimit = getCreditLimitForTermCode(input.termCode);
    if (nextTermHours > termLimit) {
      return `${formatTermLabel(input.termCode)} cannot exceed ${termLimit} hours.`;
    }

    const duplicatePassed = currentRows.some((row) =>
      row.studentId === input.studentId
      && row.courseCode === input.courseCode
      && row.status === 'passed'
      && row.id !== input.id
    );
    if (input.status === 'passed' && duplicatePassed && input.attemptNo <= 1) {
      return 'This course was already passed. Use attempt number 2 or higher for an intentional retake.';
    }

    return null;
  }, [state.courses]);

  const createTranscriptFromDraft = useCallback(async (studentId: string, termCode: string): Promise<PlannerActionResult> => {
    const draft = getStudentDrafts(studentId).find((item) => item.termCode === termCode);
    if (!draft) {
      return { success: false, error: 'No saved course plan exists for this student and semester.' };
    }

    const draftCourses = state.courses.filter((course) => draft.courseCodes.includes(course.code));
    const totalHours = draftCourses.reduce((sum, course) => sum + course.credits, 0);
    const termLimit = getCreditLimitForTermCode(termCode);
    if (totalHours > termLimit) {
      return { success: false, error: `${formatTermLabel(termCode)} cannot exceed ${termLimit} hours.` };
    }

    const existingRows = state.transcriptRows.filter((row) => row.studentId === studentId && row.termCode === termCode);
    const existingCourseCodes = new Set(existingRows.map((row) => row.courseCode));
    const rowsToCreate = draftCourses
      .filter((course) => !existingCourseCodes.has(course.code))
      .map((course) => ({
        id: createId('transcript'),
        studentId,
        termCode,
        termLabel: formatTermLabel(termCode),
        termType: /summer/i.test(termCode) ? 'summer' : 'regular',
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        finalGrade: null,
        status: 'in_progress',
        attemptNo: 1,
      }) satisfies StudentTranscriptRow);

    if (rowsToCreate.length === 0) {
      return { success: true };
    }

    setState((current) => syncDerivedTranscriptState(current, [...current.transcriptRows, ...rowsToCreate]));

    if (hasSupabaseConfig()) {
      const studentAppUserId = users.find((account) => account.id === studentId)?.appUserId;
      if (studentAppUserId) {
        try {
          const courseRows = await supabaseSelect<CourseRow[]>(
            'courses',
            `select=id,course_code,title,department_id,credits,course_type,is_plannable,internet_difficulty,difficulty_score,difficulty_basis&course_code=in.(${rowsToCreate.map((row) => encodeURIComponent(row.courseCode)).join(',')})`
          );
          const courseIdByCode = new Map(courseRows.map((course) => [course.course_code, course.id]));
          await supabaseInsert(
            'student_transcript_entries',
            rowsToCreate.flatMap((row) => {
              const courseId = courseIdByCode.get(row.courseCode);
              return courseId
                ? [{
                    id: row.id,
                    student_id: studentAppUserId,
                    term_code: row.termCode,
                    course_id: courseId,
                    final_grade: null,
                    status: 'in_progress',
                    attempt_no: row.attemptNo,
                  }]
                : [];
            })
          );
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to create transcript sheet.',
          };
        }
      }
    }

    return { success: true };
  }, [getStudentDrafts, state.courses, state.transcriptRows, users]);

  const upsertTranscriptEntry = useCallback(async (input: TranscriptEntryInput): Promise<PlannerActionResult> => {
    const normalizedStatus = getTranscriptStatusForGrade(input.finalGrade, input.status);
    const normalizedInput = { ...input, status: normalizedStatus } satisfies TranscriptEntryInput;
    const validationError = validateTranscriptInput(normalizedInput, state.transcriptRows);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const course = state.courses.find((item) => item.code === normalizedInput.courseCode);
    if (!course) {
      return { success: false, error: 'Course was not found.' };
    }

    const entryId = normalizedInput.id ?? createId('transcript');
    const nextRow = {
      id: entryId,
      studentId: normalizedInput.studentId,
      termCode: normalizedInput.termCode,
      termLabel: formatTermLabel(normalizedInput.termCode),
      termType: /summer/i.test(normalizedInput.termCode) ? 'summer' : 'regular',
      courseCode: course.code,
      courseName: course.name,
      credits: course.credits,
      finalGrade: normalizedInput.finalGrade,
      status: normalizedStatus,
      attemptNo: normalizedInput.attemptNo,
    } satisfies StudentTranscriptRow;

    setState((current) => syncDerivedTranscriptState(current, [
      ...current.transcriptRows.filter((row) => row.id !== entryId),
      nextRow,
    ]));

    if (hasSupabaseConfig()) {
      const studentAppUserId = users.find((account) => account.id === normalizedInput.studentId)?.appUserId;
      try {
        const courseRows = await supabaseSelect<CourseRow[]>(
          'courses',
          `select=id,course_code,title,department_id,credits,course_type,is_plannable,internet_difficulty,difficulty_score,difficulty_basis&course_code=eq.${encodeURIComponent(course.code)}&limit=1`
        );
        const courseId = courseRows[0]?.id;
        if (studentAppUserId && courseId) {
          const payload = {
            id: entryId,
            student_id: studentAppUserId,
            term_code: normalizedInput.termCode,
            course_id: courseId,
            final_grade: normalizedInput.finalGrade,
            status: normalizedStatus,
            attempt_no: normalizedInput.attemptNo,
          };

          if (normalizedInput.id) {
            await supabasePatch('student_transcript_entries', `id=eq.${encodeURIComponent(normalizedInput.id)}`, payload);
          } else {
            await supabaseInsert('student_transcript_entries', payload);
          }
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to save transcript entry.',
        };
      }
    }

    return { success: true };
  }, [state.courses, state.transcriptRows, users, validateTranscriptInput]);

  const deleteTranscriptEntry = useCallback(async (entryId: string): Promise<PlannerActionResult> => {
    setState((current) => syncDerivedTranscriptState(
      current,
      current.transcriptRows.filter((row) => row.id !== entryId)
    ));

    if (hasSupabaseConfig()) {
      try {
        await supabaseDelete('student_transcript_entries', `id=eq.${encodeURIComponent(entryId)}`);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to delete transcript entry.',
        };
      }
    }

    return { success: true };
  }, []);

  const submitPasswordResetInquiry = useCallback(async (role: PasswordInquiryRole, universityId: string): Promise<PlannerActionResult> => {
    const normalizedId = universityId.trim();
    if (!normalizedId) {
      return { success: false, error: 'Enter your student or advisor ID.' };
    }

    if (role !== 'student' && role !== 'advisor') {
      return { success: false, error: 'Password inquiries are available for student and advisor accounts only.' };
    }

    if (hasSupabaseConfig()) {
      try {
        const inquiry = await supabaseRpc<PasswordResetInquiryRpcResult>('submit_password_reset_inquiry', {
          p_university_id: normalizedId,
          p_requester_role: role,
        });

        if (!inquiry?.id) {
          return { success: false, error: 'Unable to send this request.' };
        }

        setState((current) => ({
          ...current,
          passwordResetInquiries: [
            {
              id: inquiry.id,
              requesterId: inquiry.requester_id,
              requesterName: inquiry.requester_name,
              requesterRole: inquiry.requester_role,
              status: inquiry.status,
              createdAt: inquiry.created_at,
              resolvedAt: inquiry.resolved_at,
            },
            ...current.passwordResetInquiries.filter((existingInquiry) => existingInquiry.id !== inquiry.id),
          ],
        }));
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to send this request.',
        };
      }
    }

    const requester = users.find((account) =>
      account.id.toLowerCase() === normalizedId.toLowerCase()
      && account.role === role
    );
    if (!requester) {
      return { success: false, error: `No ${role} account was found for that ID.` };
    }

    const now = new Date().toISOString();
    const inquiry = {
      id: createId('password-inquiry'),
      requesterId: requester.id,
      requesterName: requester.name,
      requesterRole: role,
      status: 'open',
      createdAt: now,
      resolvedAt: null,
    } satisfies PasswordResetInquiry;

    setState((current) => ({
      ...current,
      passwordResetInquiries: [inquiry, ...current.passwordResetInquiries],
    }));

    return { success: true };
  }, [users]);

  const resolvePasswordResetInquiry = useCallback(async (inquiryId: string): Promise<PlannerActionResult> => {
    const existingInquiry = state.passwordResetInquiries.find((inquiry) => inquiry.id === inquiryId);
    if (!existingInquiry) {
      return { success: false, error: 'Password inquiry was not found.' };
    }

    const resolvedAt = new Date().toISOString();
    if (hasSupabaseConfig()) {
      try {
        await supabasePatch('password_reset_inquiries', `id=eq.${encodeURIComponent(inquiryId)}`, {
          status: 'resolved',
          resolved_at: resolvedAt,
        });
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to resolve inquiry.',
        };
      }
    }

    setState((current) => ({
      ...current,
      passwordResetInquiries: current.passwordResetInquiries.map((inquiry) =>
        inquiry.id === inquiryId ? { ...inquiry, status: 'resolved', resolvedAt } : inquiry
      ),
    }));

    return { success: true };
  }, [state.passwordResetInquiries]);

  const updateCourseDifficulty = useCallback(async (courseCode: string, difficultyScore: number): Promise<PlannerActionResult> => {
    const normalizedCode = courseCode.trim().toUpperCase();
    const roundedDifficulty = Math.round(difficultyScore);

    if (!normalizedCode) {
      return { success: false, error: 'Course code is required.' };
    }

    if (!Number.isFinite(difficultyScore) || difficultyScore < 0 || difficultyScore > 100) {
      return { success: false, error: 'Difficulty must be between 0 and 100.' };
    }

    const existingCourse = state.courses.find((course) => course.code === normalizedCode);
    if (!existingCourse) {
      return { success: false, error: 'Course was not found.' };
    }

    const now = new Date().toISOString();
    const nextLabel = getDiffLabel(roundedDifficulty).label;

    if (hasSupabaseConfig()) {
      try {
        await supabasePatch('courses', `course_code=eq.${encodeURIComponent(normalizedCode)}`, {
          difficulty_score: roundedDifficulty,
          internet_difficulty: roundedDifficulty,
          difficulty_basis: 'Admin override.',
        });
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unable to save course difficulty.',
        };
      }
    }

    setState((current) => ({
      ...current,
      courses: current.courses.map((course) => (
        course.code === normalizedCode
          ? {
              ...course,
              diffScore: roundedDifficulty,
              internetDifficulty: roundedDifficulty,
              difficultyLabel: nextLabel,
              difficultyBasis: 'Admin override.',
              lastCalculatedAt: now,
            }
          : course
      )),
      modelLastCalculatedAt: now,
    }));

    return { success: true };
  }, [state.courses]);

  const upsertCourse = useCallback((input: CourseFormInput) => {
    const now = new Date().toISOString();

    setState((current) => {
      const nextHistoricalStat: HistoricalCourseStat = {
        id: createId('stat'),
        courseCode: input.code,
        termId: 'manual-entry',
        avgGrade: input.avgGrade,
        passRate: input.passRate,
        failRate: input.failRate,
        enrollmentCount: input.enrollmentCount,
        withdrawals: input.withdrawals,
      };

      const nextHistoricalStats = [
        nextHistoricalStat,
        ...current.historicalStats.filter(
          (stat) => !(stat.courseCode === input.code && stat.termId === 'manual-entry')
        ),
      ];

      return {
        ...current,
        courses: buildCourses(nextHistoricalStats, current.modelVersion, now, [
          ...current.courses.filter((course) => course.code !== input.code),
          {
            code: input.code,
            name: input.name,
            department: input.department,
            type: input.type,
            credits: input.credits,
            prerequisites: input.prerequisites,
            concurrentCourses: [],
            minimumCompletedCredits: undefined,
            isPlannable: true,
            internetDifficulty: 50,
            difficultyBasis: 'Manual course entry.',
            requirementText: formatRequirementText({
              prerequisites: input.prerequisites,
              concurrentCourses: [],
              minimumCompletedCredits: undefined,
            }),
            passRate: input.passRate,
            failRate: input.failRate,
            avgGrade: input.avgGrade,
            enrollmentCount: input.enrollmentCount,
            withdrawals: input.withdrawals,
            diffScore: 50,
            difficultyLabel: 'Balanced',
            modelVersion: current.modelVersion,
            lastCalculatedAt: now,
            dataPoints: 1,
          },
        ]),
        historicalStats: nextHistoricalStats,
        modelLastCalculatedAt: now,
      };
    });

    if (hasSupabaseConfig()) {
      void (async () => {
        try {
          const departments = await supabaseSelect<DepartmentRow[]>(
            'departments',
            `select=id,name&name=eq.${encodeURIComponent(input.department)}&limit=1`
          );
          const departmentId = departments[0]?.id;
          if (!departmentId) {
            return;
          }

          const existingRows = await supabaseSelect<CourseRow[]>(
            'courses',
            `select=id,course_code,title,department_id,credits,course_type,is_plannable,internet_difficulty,difficulty_score,difficulty_basis&course_code=eq.${encodeURIComponent(input.code)}&limit=1`
          );

          const payload = {
            course_code: input.code,
            title: input.name,
            department_id: departmentId,
            credits: input.credits,
            course_type: input.type,
            is_plannable: existingRows[0]?.is_plannable ?? true,
            difficulty_basis: 'Manual course entry.',
          };

          if (existingRows[0]?.id) {
            await supabasePatch('courses', `id=eq.${encodeURIComponent(existingRows[0].id)}`, payload);
          } else {
            await supabaseInsert('courses', payload);
          }
        } catch (error) {
          console.error('Unable to persist course changes to Supabase.', error);
        }
      })();
    }
  }, []);

  const value = useMemo(
    () => ({
      analyzeSchedule,
      clearSelection,
      assignAdvisor,
      createStudentAccount,
      createTranscriptFromDraft,
      courses: state.courses,
      currentEvaluations: state.currentEvaluations,
      deleteTranscriptEntry,
      deleteScheduleDraft,
      getCourseSelectionState,
      getCoursePrerequisitesWithGrades,
      getPlannerTermCode,
      getSelectedCourses,
      getStudentDrafts,
      getStudentTranscriptSemesters,
      getStudentTermMetrics,
      getStudentTranscript,
      getStudentAvailableTerms,
      getTermCreditLimit,
      historicalStats: state.historicalStats,
      isAppDataReady,
      loadScheduleDraft,
      modelCoverage: getCourseCoverage(state.courses),
      modelLastCalculatedAt: state.modelLastCalculatedAt,
      modelVersion: state.modelVersion,
      plannerSelections: state.plannerSelections,
      plannerTermCodes: state.plannerTermCodes,
      passwordResetInquiries: state.passwordResetInquiries,
      requestPlannerAnalysis,
      recentEvaluations: state.recentEvaluations,
      resolvePasswordResetInquiry,
      saveScheduleDraft,
      setPlannerTermCode,
      studentInsights,
      submitPasswordResetInquiry,
      termMetrics: state.termMetrics,
      transcriptRows: state.transcriptRows,
      toggleCourseSelection,
      updateCourseDifficulty,
      upsertTranscriptEntry,
      upsertCourse,
    }),
    [
      analyzeSchedule,
      assignAdvisor,
      clearSelection,
      createStudentAccount,
      createTranscriptFromDraft,
      deleteTranscriptEntry,
      deleteScheduleDraft,
      getCourseSelectionState,
      getCoursePrerequisitesWithGrades,
      getPlannerTermCode,
      getSelectedCourses,
      getStudentDrafts,
      getStudentTranscriptSemesters,
      getStudentTermMetrics,
      getStudentTranscript,
      getStudentAvailableTerms,
      getTermCreditLimit,
      isAppDataReady,
      loadScheduleDraft,
      requestPlannerAnalysis,
      resolvePasswordResetInquiry,
      saveScheduleDraft,
      setPlannerTermCode,
      state.courses,
      state.currentEvaluations,
      state.historicalStats,
      state.modelLastCalculatedAt,
      state.modelVersion,
      state.plannerSelections,
      state.plannerTermCodes,
      state.passwordResetInquiries,
      state.recentEvaluations,
      state.termMetrics,
      state.transcriptRows,
      studentInsights,
      submitPasswordResetInquiry,
      toggleCourseSelection,
      updateCourseDifficulty,
      upsertTranscriptEntry,
      upsertCourse,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}

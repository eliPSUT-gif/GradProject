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
  buildSeedHistoricalStats,
  buildStudentInsights,
  compareTermCodesNewestFirst,
  computeCourseDifficulty,
  DEFAULT_MODEL_VERSION,
  evaluateSchedule,
  formatCompactTermLabel,
  formatRequirementText,
  formatTermLabel,
  getCreditLimitForTermCode,
  getCourseSelectionStatus,
  getDiffLabel,
  MODEL_LAST_CALCULATED_AT,
  STUDENT_PROFILES,
  type AdmissionTerm,
  type Course,
  type HistoricalCourseStat,
  type ImportError,
  type ImportJob,
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
  supabaseSelect,
} from '../lib/supabase';
import { useAuth } from './AuthContext';

type PlannerActionResult = { success: boolean; error?: string };

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

interface ImportHistoricalDataResult {
  job: ImportJob;
}

export interface StudentTranscriptRow {
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

interface AppDataContextType {
  analyzeSchedule: (studentId: string) => ScheduleEvaluation | null;
  clearSelection: (studentId: string) => void;
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
  importHistoricalData: (fileName: string, raw: string) => ImportHistoricalDataResult;
  importJobs: ImportJob[];
  isAppDataReady: boolean;
  loadScheduleDraft: (studentId: string, draftId: string) => void;
  modelCoverage: number;
  modelLastCalculatedAt: string;
  modelVersion: string;
  plannerSelections: Record<string, string[]>;
  plannerTermCodes: Record<string, string>;
  recentEvaluations: ScheduleEvaluation[];
  recalculateScores: () => void;
  saveScheduleDraft: (studentId: string, name: string) => ScheduleDraft | null;
  setPlannerTermCode: (studentId: string, termCode: string) => void;
  studentInsights: StudentInsight[];
  toggleCourseSelection: (studentId: string, courseCode: string) => PlannerActionResult;
  transcriptRows: StudentTranscriptRow[];
  termMetrics: StudentTermMetric[];
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
  importJobs: ImportJob[];
  modelLastCalculatedAt: string;
  modelVersion: string;
  plannerSelections: Record<string, string[]>;
  plannerTermCodes: Record<string, string>;
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

interface ImportJobRow {
  id: string;
  file_name: string;
  format: ImportJob['format'];
  imported_rows: number;
  rejected_rows: number;
  status: ImportJob['status'];
  validation_messages: string[] | null;
  errors: ImportError[] | null;
  created_at: string;
}

interface StudentTermMetricRow {
  student_id: string;
  term_code: string;
  term_type: TermType;
  course_count: number;
  completed_credits: number;
  gpa: number | null;
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
  courses: [],
  currentEvaluations: {},
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
  importHistoricalData: () => ({
    job: {
      id: '',
      fileName: '',
      format: 'json',
      importedRows: 0,
      rejectedRows: 0,
      status: 'failed',
      validationMessages: [],
      errors: [],
      createdAt: new Date().toISOString(),
    },
  }),
  importJobs: [],
  isAppDataReady: false,
  loadScheduleDraft: () => {},
  modelCoverage: 0,
  modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
  modelVersion: DEFAULT_MODEL_VERSION,
  plannerSelections: {},
  plannerTermCodes: {},
  recentEvaluations: [],
  recalculateScores: () => {},
  saveScheduleDraft: () => null,
  setPlannerTermCode: () => {},
  studentInsights: [],
  toggleCourseSelection: () => ({ success: false, error: 'App data is not ready.' }),
  transcriptRows: [],
  termMetrics: [],
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

function allocateCoursesAcrossTerms<TCourse extends { credits: number }>(
  courses: TCourse[],
  termCodes: string[],
  targetHoursPerTerm: number
) {
  const assignments = new Map<number, number>();
  let currentTermIndex = 0;
  let currentTermHours = 0;

  courses.forEach((course, courseIndex) => {
    const remainingCourses = courses.length - courseIndex;
    const remainingTerms = termCodes.length - currentTermIndex;
    const shouldAdvance =
      currentTermHours > 0
      && currentTermIndex < termCodes.length - 1
      && currentTermHours + course.credits > targetHoursPerTerm
      && remainingTerms > 1
      && remainingCourses >= remainingTerms;

    if (shouldAdvance) {
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

    const completedCourses = profile.completedCourseCodes
      .map((code) => courses.find((course) => course.code === code))
      .filter((course): course is Course => Boolean(course));

    if (completedCourses.length === 0 || eligibleTerms.length === 0) {
      return;
    }

    const totalHours = completedCourses.reduce((sum, course) => sum + course.credits, 0);
    const termsToUse = clamp(
      Math.ceil(totalHours / 14),
      1,
      Math.min(eligibleTerms.length, completedCourses.length)
    );
    const plannedTerms = eligibleTerms.slice(0, termsToUse);
    const termAssignments = allocateCoursesAcrossTerms(completedCourses, plannedTerms.map((term) => term.termCode), 14);

    completedCourses.forEach((course, index) => {
      const termIndex = termAssignments.get(index) ?? 0;
      const term = plannedTerms[termIndex] ?? plannedTerms[plannedTerms.length - 1];
      const studentStrength = clamp((profile.gpa - 3) * 14, -8, 8);
      const termMomentum = (termIndex / Math.max(plannedTerms.length - 1, 1)) * 4;
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
    importJobs: [],
    modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
    modelVersion: DEFAULT_MODEL_VERSION,
    plannerSelections: {},
    plannerTermCodes: {},
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
    importJobs: [],
    modelLastCalculatedAt: MODEL_LAST_CALCULATED_AT,
    modelVersion: DEFAULT_MODEL_VERSION,
    plannerSelections: {},
    plannerTermCodes: {},
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

function mapImportJob(row: ImportJobRow): ImportJob {
  return {
    id: row.id,
    fileName: row.file_name,
    format: row.format,
    importedRows: row.imported_rows,
    rejectedRows: row.rejected_rows,
    status: row.status,
    validationMessages: row.validation_messages ?? [],
    errors: row.errors ?? [],
    createdAt: row.created_at,
  };
}

function parseCsvStats(raw: string) {
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/).filter(Boolean);
  const headers = headerLine?.split(',').map((value) => value.trim().toLowerCase()) ?? [];

  return lines.map((line, index) => {
    const cells = line.split(',').map((value) => value.trim());
    const get = (name: string) => cells[headers.indexOf(name)] ?? '';

    return {
      rowNumber: index + 2,
      courseCode: get('course_code') || get('code'),
      termCode: get('term_code') || get('term'),
      avgGrade: Number(get('avg_grade') || get('average_grade')),
      passRate: Number(get('pass_rate')),
      failRate: Number(get('fail_rate')),
      enrollmentCount: Number(get('enrollment_count')),
      withdrawals: Number(get('withdrawals')),
    };
  });
}

function normalizeImportRows(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return parseCsvStats(trimmed);
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
    importJobRows,
    termMetricRows,
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
    supabaseSelect<StudentCompletedCourseRow[]>('student_transcript_v', 'select=student_id,term_code,term_type,course_code,course_name,credits,final_grade,status,attempt_no'),
    supabaseSelect<ScheduleDraftRow[]>('schedule_drafts', 'select=id,student_id,name,term_code,status,saved_at&order=saved_at.desc'),
    supabaseSelect<ScheduleDraftCourseRow[]>('schedule_draft_courses', 'select=schedule_id,course_id'),
    supabaseSelect<ScheduleEvaluationRow[]>(
      'schedule_evaluations',
      'select=id,schedule_id,student_id,total_score,risk_label,total_credits,model_version,explanation,factors,recommendations,top_courses,evaluated_at&order=evaluated_at.desc'
    ),
    supabaseSelect<ImportJobRow[]>(
      'import_jobs',
      'select=id,file_name,format,imported_rows,rejected_rows,status,validation_messages,errors,created_at&order=created_at.desc'
    ),
    supabaseSelect<StudentTermMetricRow[]>('student_term_metrics_v', 'select=student_id,term_code,term_type,course_count,completed_credits,gpa&order=term_code.desc'),
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
  const importJobs = importJobRows.map(mapImportJob);
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

  return {
    academicTerms,
    courses,
    currentEvaluations,
    historicalStats,
    importJobs,
    modelLastCalculatedAt: latestCalculatedAt,
    modelVersion,
    plannerSelections,
    plannerTermCodes,
    recentEvaluations,
    scheduleDrafts,
    studentProfiles,
    termMetrics,
    transcriptRows,
  } satisfies AppDataState;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthReady, user, users } = useAuth();
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

  const analyzeSchedule = useCallback(
    (studentId: string) => {
      const profile = getStudentProfile(studentId);
      const selectedCourses = getSelectedCourses(studentId);
      const evaluation = evaluateSchedule(
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

  const recalculateScores = useCallback(() => {
    setState((current) => {
      const now = new Date().toISOString();
      const recalculatedCourses = buildCourses(
        current.historicalStats,
        current.modelVersion,
        now,
        current.courses
      );

      const recalculatedDrafts = current.scheduleDrafts.flatMap((draft) => {
        const profile = current.studentProfiles.find((item) => item.id === draft.studentId);
        const selectedCourses = recalculatedCourses.filter((course) => draft.courseCodes.includes(course.code));
        const evaluation = evaluateSchedule(
          draft.studentId,
          selectedCourses,
          recalculatedCourses,
          current.modelVersion,
          profile?.completedCourseCodes ?? [],
          profile?.creditsCompleted ?? 0,
          draft.savedAt
        );

        if (!evaluation) {
          return [];
        }

        return [{
          ...draft,
          evaluation: {
            ...evaluation,
            id: draft.evaluation.id,
          },
        }];
      });

      return {
        ...current,
        courses: recalculatedCourses,
        currentEvaluations: Object.fromEntries(
          recalculatedDrafts.map((draft) => [draft.studentId, draft.evaluation])
        ) as Record<string, ScheduleEvaluation | null>,
        modelLastCalculatedAt: now,
        recentEvaluations: recalculatedDrafts.map((draft) => draft.evaluation).sort(sortEvaluationsNewestFirst),
        scheduleDrafts: recalculatedDrafts.sort(sortDraftsNewestFirst),
      };
    });
  }, []);

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

  const importHistoricalData = useCallback((fileName: string, raw: string) => {
    const rows = normalizeImportRows(raw);
    const now = new Date().toISOString();
    const validationMessages: string[] = [];
    const errors: ImportError[] = [];
    const importedStats: HistoricalCourseStat[] = [];

    rows.forEach((row, index) => {
      const rowNumber = typeof row.rowNumber === 'number' ? row.rowNumber : index + 1;
      const courseCode = String(row.courseCode ?? row.course_code ?? '').trim().toUpperCase();
      const termCode = String(row.termCode ?? row.term_code ?? '').trim();
      const avgGrade = Number(row.avgGrade ?? row.avg_grade);
      const passRate = Number(row.passRate ?? row.pass_rate);
      const failRate = Number(row.failRate ?? row.fail_rate);
      const enrollmentCount = Number(row.enrollmentCount ?? row.enrollment_count);
      const withdrawals = Number(row.withdrawals ?? 0);

      if (!courseCode || !termCode || !Number.isFinite(avgGrade) || !Number.isFinite(passRate) || !Number.isFinite(failRate) || !Number.isFinite(enrollmentCount)) {
        errors.push({ rowNumber, reason: 'Missing required course statistics fields.' });
        return;
      }

      importedStats.push({
        id: createId('stat'),
        courseCode,
        termId: termCode,
        avgGrade,
        passRate,
        failRate,
        enrollmentCount,
        withdrawals,
      });
    });

    validationMessages.push(
      importedStats.length > 0
        ? `Imported ${importedStats.length} historical row(s).`
        : 'No valid historical rows were imported.'
    );

    const job: ImportJob = {
      id: createId('job'),
      fileName,
      format: fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
      importedRows: importedStats.length,
      rejectedRows: errors.length,
      status: errors.length > 0 ? (importedStats.length > 0 ? 'completed_with_errors' : 'failed') : 'completed',
      validationMessages,
      errors,
      createdAt: now,
    };

    setState((current) => {
      const nextHistoricalStats = [...importedStats, ...current.historicalStats];
      return {
        ...current,
        courses: buildCourses(nextHistoricalStats, current.modelVersion, now, current.courses),
        historicalStats: nextHistoricalStats,
        importJobs: [job, ...current.importJobs],
        modelLastCalculatedAt: now,
      };
    });

    if (hasSupabaseConfig()) {
      void supabaseInsert('import_jobs', {
        id: job.id,
        created_by: user?.appUserId ?? null,
        file_name: job.fileName,
        format: job.format,
        imported_rows: job.importedRows,
        rejected_rows: job.rejectedRows,
        status: job.status,
        validation_messages: job.validationMessages,
        errors: job.errors,
        created_at: job.createdAt,
      }).catch((error) => {
        console.error('Unable to persist import job to Supabase.', error);
      });
    }

    return { job };
  }, [user?.appUserId]);

  const value = useMemo(
    () => ({
      analyzeSchedule,
      clearSelection,
      courses: state.courses,
      currentEvaluations: state.currentEvaluations,
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
      importHistoricalData,
      importJobs: state.importJobs,
      isAppDataReady,
      loadScheduleDraft,
      modelCoverage: getCourseCoverage(state.courses),
      modelLastCalculatedAt: state.modelLastCalculatedAt,
      modelVersion: state.modelVersion,
      plannerSelections: state.plannerSelections,
      plannerTermCodes: state.plannerTermCodes,
      recentEvaluations: state.recentEvaluations,
      recalculateScores,
      saveScheduleDraft,
      setPlannerTermCode,
      studentInsights,
      termMetrics: state.termMetrics,
      transcriptRows: state.transcriptRows,
      toggleCourseSelection,
      upsertCourse,
    }),
    [
      analyzeSchedule,
      clearSelection,
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
      importHistoricalData,
      isAppDataReady,
      loadScheduleDraft,
      recalculateScores,
      saveScheduleDraft,
      setPlannerTermCode,
      state.courses,
      state.currentEvaluations,
      state.historicalStats,
      state.importJobs,
      state.modelLastCalculatedAt,
      state.modelVersion,
      state.plannerSelections,
      state.plannerTermCodes,
      state.recentEvaluations,
      state.termMetrics,
      state.transcriptRows,
      studentInsights,
      toggleCourseSelection,
      upsertCourse,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}

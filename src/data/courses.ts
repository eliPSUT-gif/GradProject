export type Role = 'student' | 'advisor' | 'admin';
export type CourseType = 'theoretical' | 'practical' | 'hybrid' | 'project';
export type RiskLabel = 'Easy' | 'Balanced' | 'Hard';
export type RiskStatus = 'at-risk' | 'monitor' | 'good';

export interface CourseBlueprint {
  code: string;
  name: string;
  department: string;
  type: CourseType;
  credits: number;
  prerequisites: string[];
  concurrentCourses: string[];
  minimumCompletedCredits?: number;
  internetDifficulty: number;
  difficultyBasis: string;
}

export interface Course extends CourseBlueprint {
  requirementText: string[];
  passRate: number;
  failRate: number;
  avgGrade: number;
  enrollmentCount: number;
  withdrawals: number;
  diffScore: number;
  difficultyLabel: RiskLabel;
  modelVersion: string;
  lastCalculatedAt: string;
  dataPoints: number;
}

export interface HistoricalCourseStat { id: string; courseCode: string; termId: string; avgGrade: number; passRate: number; failRate: number; enrollmentCount: number; withdrawals: number; }
export interface Recommendation { id: string; title: string; reason: string; action: string; expectedImpact: string; impactDelta: number; }
export interface EvaluationFactor { label: string; score: number; detail: string; }
export interface ScheduleEvaluation { id: string; studentId: string; totalScore: number; riskLabel: RiskLabel; totalCredits: number; evaluatedAt: string; modelVersion: string; explanation: string[]; factors: EvaluationFactor[]; recommendations: Recommendation[]; topCourses: string[]; }
export interface ScheduleDraft { id: string; studentId: string; name: string; courseCodes: string[]; savedAt: string; evaluation: ScheduleEvaluation; }
export interface StudentProfile { id: string; name: string; gpa: number; creditsCompleted: number; department: string; advisorId: string; completedCourseCodes: string[]; }
export interface ManagedUser { id: string; name: string; role: Role; subtitle: string; initials: string; password: string; status: 'active' | 'inactive'; lastLogin: string; }
export interface ImportError { rowNumber: number; reason: string; }
export interface ImportJob { id: string; fileName: string; format: 'csv' | 'json'; importedRows: number; rejectedRows: number; status: 'completed' | 'completed_with_errors' | 'failed'; validationMessages: string[]; errors: ImportError[]; createdAt: string; }
export interface StudentInsight extends StudentProfile { difficulty: number; status: RiskStatus; latestEvaluation: ScheduleEvaluation | null; activeDraft: ScheduleDraft | null; }
export interface SelectionStatus { eligible: boolean; reasons: string[]; wouldExceedCredits: boolean; }

export const DEFAULT_MODEL_VERSION = 'internet-weighted-v2.0.0';
export const MODEL_LAST_CALCULATED_AT = '2026-03-13T10:30:00.000Z';
export const MAX_SEMESTER_CREDITS = 18;
export const EXTERNAL_PREREQUISITES: Record<string, string> = { '11103': 'Structured Programming', '20133': 'Calculus (2)', '20134': 'Discrete Mathematics (1)', '20233': 'Statistical Methods' };
export const COURSE_TRENDS: Record<string, { direction: 'up' | 'stable' | 'down'; label: string }> = { '11206': { direction: 'stable', label: 'Stable' }, '11212': { direction: 'up', label: 'Harder' }, '11253': { direction: 'stable', label: 'Stable' }, '11313': { direction: 'up', label: 'Harder' }, '11316': { direction: 'up', label: 'Harder' }, '11323': { direction: 'stable', label: 'Stable' }, '11335': { direction: 'up', label: 'Harder' }, '11354': { direction: 'stable', label: 'Stable' }, '11355': { direction: 'up', label: 'Harder' }, '11391': { direction: 'stable', label: 'Stable' }, '11435': { direction: 'stable', label: 'Stable' }, '11449': { direction: 'down', label: 'Easier' }, '11464': { direction: 'up', label: 'Harder' }, '11493': { direction: 'stable', label: 'Stable' }, '11494': { direction: 'stable', label: 'Stable' }, '12242': { direction: 'down', label: 'Easier' }, '12243': { direction: 'down', label: 'Easier' }, '12343': { direction: 'stable', label: 'Stable' }, '13477': { direction: 'stable', label: 'Stable' }, '14330': { direction: 'up', label: 'Harder' }, '20135': { direction: 'stable', label: 'Stable' }, '20141': { direction: 'stable', label: 'Stable' }, '20142': { direction: 'stable', label: 'Stable' }, '20147': { direction: 'down', label: 'Easier' }, '20333': { direction: 'stable', label: 'Stable' }, '20336': { direction: 'up', label: 'Harder' }, '22241': { direction: 'stable', label: 'Stable' }, '22342': { direction: 'up', label: 'Harder' }, '22541': { direction: 'up', label: 'Harder' } };
export const KNOWN_HARD_COMBINATIONS = [['11313', '11316'], ['11335', '22541'], ['11335', '11464'], ['14330', '20336'], ['11313', '14330']] as const;

const BASE_COURSES: CourseBlueprint[] = [
  { code: '11206', name: 'Object Oriented Programming', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['11103'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 52, difficultyBasis: 'Moderate OOP abstraction.' },
  { code: '11212', name: 'Data Structures and Introduction to Algorithms', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20134', '11206'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 78, difficultyBasis: 'Common CS gatekeeper course.' },
  { code: '11253', name: 'Object Oriented Programming Lab', department: 'Computer Science', type: 'practical', credits: 1, prerequisites: [], concurrentCourses: ['11206'], minimumCompletedCredits: undefined, internetDifficulty: 34, difficultyBasis: 'Hands-on lab.' },
  { code: '11313', name: 'Algorithms Design and Analysis', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['11212'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 88, difficultyBasis: 'Very hard algorithmic reasoning.' },
  { code: '11316', name: 'Theory of Computation', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20135', '11206'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 91, difficultyBasis: 'Highly abstract and proof-heavy.' },
  { code: '11323', name: 'Database Systems', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['11212'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 62, difficultyBasis: 'Medium database theory.' },
  { code: '11335', name: 'Operating Systems', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['22342', '11212'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 93, difficultyBasis: 'One of the hardest core CS courses.' },
  { code: '11354', name: 'Database Systems Lab', department: 'Computer Science', type: 'practical', credits: 1, prerequisites: [], concurrentCourses: ['11323'], minimumCompletedCredits: undefined, internetDifficulty: 41, difficultyBasis: 'Focused practical lab.' },
  { code: '11355', name: 'Operating Systems Lab', department: 'Computer Science', type: 'practical', credits: 1, prerequisites: [], concurrentCourses: ['11335'], minimumCompletedCredits: undefined, internetDifficulty: 72, difficultyBasis: 'OS implementation load.' },
  { code: '11391', name: 'Practical Training', department: 'Computer Science', type: 'practical', credits: 3, prerequisites: [], concurrentCourses: [], minimumCompletedCredits: 90, internetDifficulty: 18, difficultyBasis: 'Experience-based.' },
  { code: '11435', name: 'Data Communications & Computer Networks', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['11212'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 67, difficultyBasis: 'Medium-hard networking.' },
  { code: '11449', name: 'Computer and Society', department: 'Computer Science', type: 'theoretical', credits: 1, prerequisites: [], concurrentCourses: [], minimumCompletedCredits: 70, internetDifficulty: 22, difficultyBasis: 'Lighter than technical courses.' },
  { code: '11464', name: 'Information Systems Security', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['11435'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 73, difficultyBasis: 'Moderately hard security concepts.' },
  { code: '11493', name: 'Graduation Project 1', department: 'Computer Science', type: 'project', credits: 1, prerequisites: [], concurrentCourses: [], minimumCompletedCredits: 90, internetDifficulty: 57, difficultyBasis: 'Project planning load.' },
  { code: '11494', name: 'Graduation Project 2', department: 'Computer Science', type: 'project', credits: 2, prerequisites: ['11493'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 68, difficultyBasis: 'Delivery and integration pressure.' },
  { code: '12242', name: 'Webpage Design and Internet programming LAB', department: 'Computer Science', type: 'practical', credits: 1, prerequisites: [], concurrentCourses: ['12243'], minimumCompletedCredits: undefined, internetDifficulty: 37, difficultyBasis: 'Implementation-focused web lab.' },
  { code: '12243', name: 'Webpage Design and Internet programming', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: ['11206'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 49, difficultyBasis: 'Conceptual plus practical web course.' },
  { code: '12343', name: 'Visual Programming', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: ['11206'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 56, difficultyBasis: 'Moderate UI and implementation work.' },
  { code: '13477', name: 'Software Engineering', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: ['11323'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 64, difficultyBasis: 'Process and design overhead.' },
  { code: '14330', name: 'Artificial Intelligence', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: ['11212'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 82, difficultyBasis: 'Search, logic, and probability make it hard.' },
  { code: '20135', name: 'Discrete Mathematics (2)', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20134'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 74, difficultyBasis: 'Proof and logic heavy.' },
  { code: '20141', name: 'Physics (1)', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: [], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 61, difficultyBasis: 'Moderate problem-solving science course.' },
  { code: '20142', name: 'Physics (2)', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20141'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 68, difficultyBasis: 'Harder continuation of Physics 1.' },
  { code: '20147', name: 'Physics Lab', department: 'Computer Science', type: 'practical', credits: 0, prerequisites: [], concurrentCourses: ['20141'], minimumCompletedCredits: undefined, internetDifficulty: 24, difficultyBasis: 'Procedural science lab.' },
  { code: '20333', name: 'Numerical Analysis', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20133'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 72, difficultyBasis: 'Applied math and approximation.' },
  { code: '20336', name: 'Principles of Probability', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['20133', '20233'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 76, difficultyBasis: 'Symbolic probability is often hard.' },
  { code: '22241', name: 'Digital Logic Design', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: [], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 66, difficultyBasis: 'Binary and hardware reasoning.' },
  { code: '22342', name: 'Computer Organization and Assembly Language', department: 'Computer Science', type: 'hybrid', credits: 3, prerequisites: ['22241'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 84, difficultyBasis: 'Low-level systems thinking and assembly.' },
  { code: '22541', name: 'Computer Architecture', department: 'Computer Science', type: 'theoretical', credits: 3, prerequisites: ['22342'], concurrentCourses: [], minimumCompletedCredits: undefined, internetDifficulty: 89, difficultyBasis: 'Deep hardware and performance reasoning.' }
];

export const SEED_MANAGED_USERS: ManagedUser[] = [
  { id: '20231001', name: 'Ahmad Hassan', role: 'student', subtitle: 'Student | Computer Science', initials: 'AH', password: 'student123', status: 'active', lastLogin: '2026-03-13T07:55:00.000Z' },
  { id: '20221045', name: 'Omar Al-Rashid', role: 'student', subtitle: 'Student | Computer Science', initials: 'OR', password: 'student123', status: 'active', lastLogin: '2026-03-12T10:22:00.000Z' },
  { id: '20221188', name: 'Sara Khalil', role: 'student', subtitle: 'Student | Computer Science', initials: 'SK', password: 'student123', status: 'active', lastLogin: '2026-03-12T08:18:00.000Z' },
  { id: '20220877', name: 'Lina Nasser', role: 'student', subtitle: 'Student | Computer Science', initials: 'LN', password: 'student123', status: 'active', lastLogin: '2026-03-11T11:10:00.000Z' },
  { id: 'ADV-1001', name: 'Prof. Layla Hamdan', role: 'advisor', subtitle: 'Academic Advisor | CS Department', initials: 'LH', password: 'advisor123', status: 'active', lastLogin: '2026-03-13T08:50:00.000Z' },
  { id: 'ADV-1002', name: 'Dr. Mona Issa', role: 'advisor', subtitle: 'Academic Advisor | CS Department', initials: 'MI', password: 'advisor123', status: 'active', lastLogin: '2026-03-12T13:32:00.000Z' },
  { id: 'ADM-1001', name: 'Dr. Anas Abu Taleb', role: 'admin', subtitle: 'System Administrator', initials: 'AT', password: 'admin123', status: 'active', lastLogin: '2026-03-13T09:14:00.000Z' },
  { id: 'ADM-1002', name: 'Eng. Rana Shoman', role: 'admin', subtitle: 'Registrar Operations Admin', initials: 'RS', password: 'admin123', status: 'active', lastLogin: '2026-03-12T14:08:00.000Z' }
];

export const STUDENT_PROFILES: StudentProfile[] = [
  { id: '20231001', name: 'Ahmad Hassan', gpa: 3.42, creditsCompleted: 74, department: 'Computer Science', advisorId: 'ADV-1001', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '20135', '20141', '20147', '20333', '20336', '22241', '22342'] },
  { id: '20221045', name: 'Omar Al-Rashid', gpa: 2.9, creditsCompleted: 88, department: 'Computer Science', advisorId: 'ADV-1001', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11313', '11316', '11323', '11354', '11435', '12243', '12242', '12343', '14330', '20135', '20141', '20142', '20147', '20333', '22241', '22342', '22541'] },
  { id: '20221188', name: 'Sara Khalil', gpa: 3.05, creditsCompleted: 84, department: 'Computer Science', advisorId: 'ADV-1001', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11323', '11435', '12243', '20135', '20141', '20142', '20147', '20333', '22241', '22342'] },
  { id: '20220877', name: 'Lina Nasser', gpa: 3.2, creditsCompleted: 92, department: 'Computer Science', advisorId: 'ADV-1001', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11313', '11316', '11323', '11335', '11354', '11355', '11435', '11449', '12243', '12242', '12343', '13477', '14330', '20135', '20141', '20142', '20147', '20333', '20336', '22241', '22342', '22541'] },
  { id: '20220432', name: 'Karim Haddad', gpa: 3.58, creditsCompleted: 101, department: 'Computer Science', advisorId: 'ADV-1002', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11313', '11316', '11323', '11335', '11354', '11355', '11391', '11435', '11449', '11464', '11493', '12243', '12242', '12343', '13477', '14330', '20135', '20141', '20142', '20147', '20333', '20336', '22241', '22342', '22541'] },
  { id: '20221302', name: 'Nour Saleh', gpa: 3.81, creditsCompleted: 76, department: 'Computer Science', advisorId: 'ADV-1002', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11323', '11435', '12243', '20135', '20141', '20147', '22241', '22342'] },
  { id: '20220665', name: 'Yousef Barakat', gpa: 3.12, creditsCompleted: 82, department: 'Computer Science', advisorId: 'ADV-1002', completedCourseCodes: ['11103', '20134', '11206', '11253', '11212', '11313', '11323', '11435', '12243', '20135', '20141', '20142', '20147', '20333', '22241', '22342'] }
];

const DEMO_PROFILE_TEMPLATES = STUDENT_PROFILES.map((profile) => ({
  gpa: profile.gpa,
  creditsCompleted: profile.creditsCompleted,
  department: profile.department,
  completedCourseCodes: [...profile.completedCourseCodes],
}));

export const STUDENT_PLAN_SEEDS: Record<string, string[]> = {
  '20231001': ['11323', '11435', '12243', '12242', '22541', '11449'],
  '20221045': ['11335', '11355', '11464', '13477', '22541', '20336'],
  '20221188': ['11313', '11316', '14330', '22541', '20336', '11435'],
  '20220877': ['11391', '11493', '13477', '11464', '12343'],
  '20220432': ['11494', '11464', '13477', '11449'],
  '20221302': ['12243', '12242', '12343', '11449', '22541'],
  '20220665': ['11335', '11435', '14330', '20336', '22541']
};

export const PAST_SEMESTER_GPA = [{ label: 'S21', gpa: 3.1 }, { label: 'F21', gpa: 3.25 }, { label: 'S22', gpa: 3.18 }, { label: 'F22', gpa: 3.34 }, { label: 'S23', gpa: 3.38 }, { label: 'F23', gpa: 3.42 }];
const TYPE_WEIGHT: Record<CourseType, number> = { theoretical: 66, practical: 36, hybrid: 54, project: 74 };
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const createId = (prefix: string, seed: string) => `${prefix}-${seed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
function getTrendAdjustment(courseCode: string) { const trend = COURSE_TRENDS[courseCode]; if (!trend) return 0; if (trend.direction === 'up') return 3; if (trend.direction === 'down') return -3; return 0; }
export function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join(''); }
function hashSeedToIndex(seed: string, size: number) { if (size <= 0) return 0; const hash = seed.split('').reduce((sum, character, index) => sum + character.charCodeAt(0) * (index + 1), 0); return hash % size; }
export function buildDemoStudentProfile(student: Pick<ManagedUser, 'id' | 'name'>, advisorId: string | null, templateIndex?: number): StudentProfile {
  const template = DEMO_PROFILE_TEMPLATES[templateIndex ?? hashSeedToIndex(student.id, DEMO_PROFILE_TEMPLATES.length)] ?? DEMO_PROFILE_TEMPLATES[0];
  return { id: student.id, name: student.name, gpa: template.gpa, creditsCompleted: template.creditsCompleted, department: template.department, advisorId: advisorId ?? '', completedCourseCodes: [...template.completedCourseCodes] };
}
export function getCourseName(code: string) { return BASE_COURSES.find((course) => course.code === code)?.name ?? EXTERNAL_PREREQUISITES[code] ?? code; }
export function formatRequirementText(course: Pick<CourseBlueprint, 'prerequisites' | 'concurrentCourses' | 'minimumCompletedCredits'>) { const lines: string[] = []; course.prerequisites.forEach((code) => lines.push(`Prerequisite: ${getCourseName(code)}`)); course.concurrentCourses.forEach((code) => lines.push(`Concurrent: ${getCourseName(code)}`)); if (course.minimumCompletedCredits) lines.push(`Complete ${course.minimumCompletedCredits} credit hours`); return lines; }
export function getDiffLabel(score: number) {
  if (score >= 70) return { label: 'Hard' as const, cls: 'bg-red-100 text-red-700', color: '#dc2626', barColor: 'bg-red-500' };
  if (score >= 45) return { label: 'Balanced' as const, cls: 'bg-amber-100 text-amber-700', color: '#d97706', barColor: 'bg-amber-500' };
  return { label: 'Easy' as const, cls: 'bg-emerald-100 text-emerald-700', color: '#059669', barColor: 'bg-emerald-500' };
}
export function getStatusStyle(status: RiskStatus) { if (status === 'at-risk') return 'bg-red-100 text-red-700'; if (status === 'monitor') return 'bg-amber-100 text-amber-700'; return 'bg-emerald-100 text-emerald-700'; }
export function getStatusLabel(status: RiskStatus) { if (status === 'at-risk') return 'At Risk'; if (status === 'monitor') return 'Monitor'; return 'Good'; }

function deriveMetricsFromInternetDifficulty(course: CourseBlueprint, termShift: number) {
  const avgGrade = clamp(94 - course.internetDifficulty * 0.34 + termShift, 52, 95);
  const passRate = clamp(97 - course.internetDifficulty * 0.44 + termShift, 44, 98);
  const withdrawalBase = Math.round(course.internetDifficulty / 12) + (course.type === 'project' ? 2 : 0);
  const enrollmentBase = course.type === 'theoretical' ? 120 : course.type === 'hybrid' ? 96 : 78;
  const failRate = clamp(100 - passRate - (course.type === 'practical' ? 7 : 9), 2, 34);
  return { avgGrade: Math.round(avgGrade), passRate: Math.round(passRate), failRate: Math.round(failRate), enrollmentCount: enrollmentBase + termShift * 3, withdrawals: clamp(withdrawalBase + termShift, 0, 18) };
}

export function buildSeedHistoricalStats() {
  return BASE_COURSES.flatMap((course, index) => {
    const shifts = [-2 + (index % 3), 2 - (index % 2)];
    return ['2024-Fall', '2025-Spring'].map((termId, termIndex) => ({ id: createId('stat', `${course.code}-${termId}`), courseCode: course.code, termId, ...deriveMetricsFromInternetDifficulty(course, shifts[termIndex] ?? 0) }));
  });
}
export const SEED_HISTORICAL_STATS = buildSeedHistoricalStats();

function aggregateStats(courseCode: string, stats: HistoricalCourseStat[], fallback?: Course) {
  const rows = stats.filter((item) => item.courseCode === courseCode);
  if (rows.length === 0 && fallback) return { avgGrade: fallback.avgGrade, passRate: fallback.passRate, failRate: fallback.failRate, enrollmentCount: fallback.enrollmentCount, withdrawals: fallback.withdrawals, dataPoints: fallback.dataPoints };
  if (rows.length === 0) return { avgGrade: 75, passRate: 78, failRate: 12, enrollmentCount: 60, withdrawals: 2, dataPoints: 0 };
  return { avgGrade: Math.round(average(rows.map((item) => item.avgGrade))), passRate: Math.round(average(rows.map((item) => item.passRate))), failRate: Math.round(average(rows.map((item) => item.failRate))), enrollmentCount: Math.round(average(rows.map((item) => item.enrollmentCount))), withdrawals: Math.round(average(rows.map((item) => item.withdrawals))), dataPoints: rows.length };
}

export function computeCourseDifficulty(course: CourseBlueprint, stats: Pick<Course, 'avgGrade' | 'passRate' | 'failRate' | 'enrollmentCount' | 'withdrawals'>) {
  const gradeFactor = 100 - stats.avgGrade;
  const passFactor = 100 - stats.passRate;
  const withdrawalRate = stats.enrollmentCount === 0 ? 0 : (stats.withdrawals / stats.enrollmentCount) * 100;
  const withdrawalFactor = clamp(withdrawalRate * 2.1, 0, 22);
  const creditFactor = clamp((course.credits / 4) * 100, 0, 100);
  const typeFactor = TYPE_WEIGHT[course.type];
  const statsDerived = clamp(gradeFactor * 0.32 + passFactor * 0.3 + withdrawalFactor * 0.12 + creditFactor * 0.12 + typeFactor * 0.14, 0, 100);
  return Math.round(clamp(course.internetDifficulty * 0.72 + statsDerived * 0.25 + getTrendAdjustment(course.code), 0, 100));
}

export function buildCourses(stats: HistoricalCourseStat[], modelVersion = DEFAULT_MODEL_VERSION, lastCalculatedAt = MODEL_LAST_CALCULATED_AT, existingCourses: Course[] = []) {
  const extraBlueprints = existingCourses.filter((course) => !BASE_COURSES.some((baseCourse) => baseCourse.code === course.code)).map((course) => ({ code: course.code, name: course.name, department: course.department, type: course.type, credits: course.credits, prerequisites: course.prerequisites ?? [], concurrentCourses: course.concurrentCourses ?? [], minimumCompletedCredits: course.minimumCompletedCredits, internetDifficulty: course.internetDifficulty ?? course.diffScore ?? 50, difficultyBasis: course.difficultyBasis ?? 'Manual course entry.' }));
  return [...BASE_COURSES, ...extraBlueprints].map((course) => {
    const previous = existingCourses.find((item) => item.code === course.code);
    const aggregated = aggregateStats(course.code, stats, previous);
    const diffScore = computeCourseDifficulty(course, aggregated);
    return { ...course, requirementText: formatRequirementText(course), ...aggregated, diffScore, difficultyLabel: getDiffLabel(diffScore).label, modelVersion, lastCalculatedAt } satisfies Course;
  });
}
export const COURSES = buildCourses(SEED_HISTORICAL_STATS);

export function getCourseSelectionStatus(course: Course, completedCourseCodes: string[], selectedCourseCodes: string[], completedCredits: number, allCourses: Course[]): SelectionStatus {
  const reasons: string[] = [];
  const selectedSet = new Set(selectedCourseCodes);
  const completedSet = new Set(completedCourseCodes);
  const totalSelectedCredits = allCourses.filter((item) => selectedSet.has(item.code)).reduce((sum, item) => sum + item.credits, 0);
  const missingPrerequisites = course.prerequisites.filter((code) => !completedSet.has(code));
  if (missingPrerequisites.length > 0) reasons.push(`Missing prerequisite${missingPrerequisites.length > 1 ? 's' : ''}: ${missingPrerequisites.map(getCourseName).join(', ')}.`);
  const missingConcurrent = course.concurrentCourses.filter((code) => !completedSet.has(code) && !selectedSet.has(code));
  if (missingConcurrent.length > 0) reasons.push(`Requires concurrent course${missingConcurrent.length > 1 ? 's' : ''}: ${missingConcurrent.map(getCourseName).join(', ')}.`);
  if (course.minimumCompletedCredits && completedCredits < course.minimumCompletedCredits) reasons.push(`Requires ${course.minimumCompletedCredits} completed credit hours. You currently have ${completedCredits}.`);
  const wouldExceedCredits = totalSelectedCredits + course.credits > MAX_SEMESTER_CREDITS;
  if (wouldExceedCredits) reasons.push(`Maximum semester load is ${MAX_SEMESTER_CREDITS} credit hours.`);
  return { eligible: reasons.length === 0, reasons, wouldExceedCredits };
}
function buildTopCourseStrings(selectedCourses: Course[]) { return [...selectedCourses].sort((left, right) => right.diffScore - left.diffScore).slice(0, 3).map((course) => `${course.code} ${course.name}`); }
function isEligibleAlternative(candidate: Course, completedCourseCodes: string[], selectedCourseCodes: string[], completedCredits: number, allCourses: Course[]) { return getCourseSelectionStatus(candidate, completedCourseCodes, selectedCourseCodes, completedCredits, allCourses).eligible; }
function findAlternativeCourse(sourceCourse: Course, allCourses: Course[], selectedCodes: Set<string>, completedCourseCodes: string[], completedCredits: number, selectedCourses: Course[]) {
  const currentWithoutSource = selectedCourses.filter((course) => course.code !== sourceCourse.code).map((course) => course.code);
  return allCourses.filter((candidate) => candidate.code !== sourceCourse.code && !selectedCodes.has(candidate.code)).filter((candidate) => candidate.type === sourceCourse.type || candidate.type === 'hybrid' || sourceCourse.type === 'hybrid').filter((candidate) => isEligibleAlternative(candidate, completedCourseCodes, [...currentWithoutSource, candidate.code], completedCredits, allCourses)).sort((left, right) => left.diffScore - right.diffScore)[0];
}

export function evaluateSchedule(studentId: string, selectedCourses: Course[], allCourses: Course[], modelVersion: string, completedCourseCodes: string[] = [], completedCredits = 0, evaluatedAt = new Date().toISOString()): ScheduleEvaluation | null {
  if (selectedCourses.length === 0) return null;
  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);
  const averageDifficulty = average(selectedCourses.map((course) => course.diffScore));
  const hardCourses = selectedCourses.filter((course) => course.diffScore >= 70);
  const theoryCourses = selectedCourses.filter((course) => course.type === 'theoretical').length;
  const practicalCourses = selectedCourses.filter((course) => course.type === 'practical').length;
  const hybridCourses = selectedCourses.filter((course) => course.type === 'hybrid').length;
  const projectCourses = selectedCourses.filter((course) => course.type === 'project').length;
  const comboHits = KNOWN_HARD_COMBINATIONS.filter((pair) => pair.every((courseCode) => selectedCourses.some((course) => course.code === courseCode)));
  const creditPenalty = clamp((totalCredits - 12) * 4.8, 0, 26);
  const hardPenalty = clamp(hardCourses.length * 6.5, 0, 24);
  const mixPenalty = clamp(Math.abs(theoryCourses - (practicalCourses + hybridCourses)) * 3 + projectCourses * 3, 0, 18);
  const comboPenalty = comboHits.length * 6;
  const totalScore = Math.round(clamp(averageDifficulty * 0.68 + creditPenalty + hardPenalty + mixPenalty + comboPenalty, 0, 100));
  const riskLabel = getDiffLabel(totalScore).label;
  const factors: EvaluationFactor[] = [
    { label: 'Internet difficulty baseline', score: Math.round(averageDifficulty), detail: `${hardCourses.length} hard course(s) selected` },
    { label: 'Credit load', score: Math.round(creditPenalty), detail: `${totalCredits} credits selected out of ${MAX_SEMESTER_CREDITS}` },
    { label: 'Course-type balance', score: Math.round(mixPenalty), detail: `${theoryCourses} theory, ${hybridCourses} hybrid, ${practicalCourses} practical, ${projectCourses} project` },
    { label: 'Known hard combinations', score: comboPenalty, detail: comboHits.length > 0 ? comboHits.map((pair) => pair.join(' + ')).join(', ') : 'No flagged combinations' }
  ];
  const explanation = [
    `${hardCourses.length} course(s) in this draft have high internet-weighted difficulty scores.`,
    totalCredits > 15 ? `The schedule carries ${totalCredits} credits, close to the ${MAX_SEMESTER_CREDITS}-credit cap.` : 'The credit load stays in a manageable planning range.',
    theoryCourses >= selectedCourses.length - 1 ? 'The draft is theory-heavy, which increases exam and proof pressure.' : 'The draft keeps a healthier mix of course types.',
    comboHits.length > 0 ? `Known hard combinations were detected: ${comboHits.map((pair) => pair.join(' + ')).join(', ')}.` : 'No configured hard course combinations were detected.'
  ];
  const selectedCodes = new Set(selectedCourses.map((course) => course.code));
  const recommendations: Recommendation[] = [];
  if (riskLabel === 'Hard') {
    const hardestCourse = [...hardCourses].sort((left, right) => right.diffScore - left.diffScore)[0];
    if (hardestCourse) {
      const alternative = findAlternativeCourse(hardestCourse, allCourses, selectedCodes, completedCourseCodes, completedCredits, selectedCourses);
      recommendations.push({ id: createId('rec', `${studentId}-${hardestCourse.code}`), title: `Swap ${hardestCourse.code} for a lighter eligible course`, reason: `${hardestCourse.code} is one of the biggest contributors to your score.`, action: alternative ? `Replace it with ${alternative.code} ${alternative.name}.` : `Move ${hardestCourse.code} to a future term and choose a lighter eligible course.`, expectedImpact: alternative ? `Estimated score reduction: ${Math.max(hardestCourse.diffScore - alternative.diffScore - 5, 6)} points.` : 'Estimated score reduction: 8 to 12 points.', impactDelta: alternative ? Math.max(hardestCourse.diffScore - alternative.diffScore - 5, 6) : 10 });
    }
    const lighterEligibleCourses = allCourses.filter((course) => !selectedCodes.has(course.code)).filter((course) => isEligibleAlternative(course, completedCourseCodes, [...selectedCodes, course.code], completedCredits, allCourses)).sort((left, right) => left.diffScore - right.diffScore).slice(0, 3);
    if (lighterEligibleCourses.length > 0) recommendations.push({ id: createId('rec', `${studentId}-lighter`), title: 'Consider lower-difficulty eligible options', reason: 'You already qualify for some easier alternatives.', action: `Examples: ${lighterEligibleCourses.map((course) => `${course.code} ${course.name}`).join(', ')}.`, expectedImpact: 'Expected impact: lower cumulative workload.', impactDelta: 7 });
  }
  if (totalCredits > 15) recommendations.push({ id: createId('rec', `${studentId}-credits`), title: 'Reduce total credits', reason: 'Heavy credit load adds pressure across all courses.', action: 'Move one 3-credit course to the next term if possible.', expectedImpact: `Estimated score reduction: ${Math.round(creditPenalty * 0.7)} points.`, impactDelta: Math.round(creditPenalty * 0.7) });
  if (theoryCourses > practicalCourses + hybridCourses) recommendations.push({ id: createId('rec', `${studentId}-balance`), title: 'Rebalance course types', reason: 'The current draft is theory-heavy.', action: 'Swap one theory-heavy course for a practical or hybrid option if available.', expectedImpact: 'Expected impact: smoother weekly workload.', impactDelta: 6 });
  if (recommendations.length === 0) recommendations.push({ id: createId('rec', `${studentId}-keep`), title: 'Schedule is manageable', reason: 'The current plan is balanced across difficulty, credits, and course types.', action: 'Keep the draft and review prerequisites before saving.', expectedImpact: 'No immediate balancing action is required.', impactDelta: 0 });
  return { id: createId('eval', `${studentId}-${evaluatedAt}`), studentId, totalScore, riskLabel, totalCredits, evaluatedAt, modelVersion, explanation, factors, recommendations, topCourses: buildTopCourseStrings(selectedCourses) };
}

export function buildSeedDrafts(courses: Course[]) {
  return Object.entries(STUDENT_PLAN_SEEDS).flatMap(([studentId, courseCodes]) => {
    const profile = STUDENT_PROFILES.find((item) => item.id === studentId);
    const selectedCourses = courses.filter((course) => courseCodes.includes(course.code));
    const evaluation = evaluateSchedule(studentId, selectedCourses, courses, DEFAULT_MODEL_VERSION, profile?.completedCourseCodes ?? [], profile?.creditsCompleted ?? 0, '2026-03-12T10:00:00.000Z');
    if (!evaluation) return [];
    return [{ id: createId('draft', `${studentId}-spring26`), studentId, name: 'Spring 2026 Forecast', courseCodes, savedAt: '2026-03-12T10:05:00.000Z', evaluation } satisfies ScheduleDraft];
  });
}

export function buildStudentInsights(profiles: StudentProfile[], drafts: ScheduleDraft[]): StudentInsight[] {
  return profiles.map((profile) => {
    const studentDrafts = drafts.filter((draft) => draft.studentId === profile.id).sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    const latestDraft = studentDrafts[0] ?? null;
    const latestEvaluation = latestDraft?.evaluation ?? null;
    const score = latestEvaluation?.totalScore ?? 0;
    return { ...profile, difficulty: score, status: getRiskStatus(score, profile.gpa), latestEvaluation, activeDraft: latestDraft };
  });
}
export function getRiskStatus(score: number, gpa: number): RiskStatus { if (score >= 75 || (score >= 68 && gpa < 3.1)) return 'at-risk'; if (score >= 50 || (score >= 42 && gpa < 3.25)) return 'monitor'; return 'good'; }


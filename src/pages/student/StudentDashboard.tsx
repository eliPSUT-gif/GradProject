import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Info,
  Lightbulb,
  MessageSquare,
  Save,
  TrendingUp,
} from 'lucide-react';
import { getDiffLabel, PAST_SEMESTER_GPA } from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function StudentDashboard() {
  const { user } = useAuth();
  const {
    currentEvaluations,
    getSelectedCourses,
    getStudentDrafts,
    loadScheduleDraft,
    recentEvaluations,
    studentInsights,
  } = useAppData();

  const studentId = user?.id ?? '';
  const selectedCourses = getSelectedCourses(studentId);
  const drafts = getStudentDrafts(studentId);
  const currentEvaluation = currentEvaluations[studentId] ?? null;
  const profile = studentInsights.find((item) => item.id === studentId);

  const totalCredits = useMemo(
    () => selectedCourses.reduce((sum, course) => sum + course.credits, 0),
    [selectedCourses]
  );

  const evaluationHistory = useMemo(
    () => recentEvaluations.filter((item) => item.studentId === studentId).slice(0, 4),
    [recentEvaluations, studentId]
  );

  const score = currentEvaluation?.totalScore ?? drafts[0]?.evaluation.totalScore ?? null;
  const diffInfo = score !== null ? getDiffLabel(score) : null;
  const meterPct = score !== null ? clamp(score, 0, 100) : 50;

  const recommendations = currentEvaluation?.recommendations ?? drafts[0]?.evaluation.recommendations ?? [];
  const explanation = currentEvaluation?.explanation ?? drafts[0]?.evaluation.explanation ?? [];

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Current GPA',
      value: profile?.gpa.toFixed(2) ?? '3.42',
      subtitle: 'Based on academic profile',
      accent: '#2563eb',
    },
    {
      icon: Gauge,
      label: 'Schedule Score',
      value: score !== null ? String(score) : '-',
      subtitle: diffInfo?.label ?? 'Analyze your draft',
      accent: diffInfo?.color ?? '#94a3b8',
    },
    {
      icon: BookOpen,
      label: 'Credits This Term',
      value: totalCredits > 0 ? String(totalCredits) : '0',
      subtitle: selectedCourses.length > 0 ? `${selectedCourses.length} courses selected` : 'No draft selected',
      accent: '#3b82f6',
    },
    {
      icon: GraduationCap,
      label: 'Completed Credits',
      value: String(profile?.creditsCompleted ?? 74),
      subtitle: 'Towards graduation plan',
      accent: '#0f766e',
    },
  ];

  const recIcon = (impactDelta: number) => {
    if (impactDelta >= 8) {
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }

    if (impactDelta === 0) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    }

    return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  };

  const recBg = (impactDelta: number) => {
    if (impactDelta >= 8) return 'bg-amber-50 border-amber-200';
    if (impactDelta === 0) return 'bg-emerald-50 border-emerald-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: item.accent }} />
              <div className="mb-2 flex items-center gap-1.5 sm:mb-3 sm:gap-2">
                <Icon className="h-3.5 w-3.5 text-gray-400 sm:h-4 sm:w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[11px]">{item.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-[#0f1e3c] sm:text-3xl">{item.value}</p>
              <p className="mt-0.5 text-[10px] text-gray-500 sm:mt-1 sm:text-xs">{item.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BookOpen className="h-5 w-5 text-[#2563eb]" />
            My Schedule This Semester
          </h2>

          {selectedCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
              <p className="mb-4 text-gray-500">No courses selected yet.</p>
              <Link
                to="/app/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                Build My Schedule
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2 pr-4">Course</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4 text-center">Credits</th>
                    <th className="pb-2 text-center">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCourses.map((course) => {
                    const label = getDiffLabel(course.diffScore);
                    return (
                      <tr key={course.code} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-4 font-mono font-semibold text-[#0f1e3c]">{course.code}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{course.name}</td>
                        <td className="py-2.5 pr-4">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-gray-600">{course.type}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-center">{course.credits}</td>
                        <td className="py-2.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${label.cls}`}>
                            {course.diffScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="min-w-0 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-6 sm:text-lg">
            <Gauge className="h-5 w-5 text-[#2563eb]" />
            Difficulty Meter
          </h2>

          <p className="mb-2 font-display text-4xl font-bold sm:text-6xl" style={{ color: diffInfo?.color ?? '#94a3b8' }}>
            {score !== null ? score : '-'}
          </p>

          {diffInfo ? (
            <span className={`mb-6 rounded-full px-3 py-1 text-xs font-bold ${diffInfo.cls}`}>{diffInfo.label}</span>
          ) : (
            <span className="mb-6 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">N/A</span>
          )}

          <div className="w-full max-w-xs">
            <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500">
              <div
                className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-[#0f1e3c] bg-white shadow-md transition-all duration-500"
                style={{ left: `calc(${meterPct}% - 10px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>Easy</span>
              <span>Balanced</span>
              <span>Hard</span>
            </div>
          </div>

          <div className="mt-6 w-full space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {explanation.length > 0 ? (
              explanation.map((line) => (
                <div key={line} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  {line}
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">Analyze a schedule to see explainable risk factors.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </h2>
            <Link to="/app/messages" className="hidden items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] sm:inline-flex">
              <MessageSquare className="h-4 w-4" />
              Message advisor
            </Link>
          </div>
          <div className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${recBg(recommendation.impactDelta)}`}
                >
                  {recIcon(recommendation.impactDelta)}
                  <div>
                    <p className="font-semibold text-gray-800">{recommendation.title}</p>
                    <p className="mt-1 text-gray-700">{recommendation.reason}</p>
                    <p className="mt-1 text-gray-600">{recommendation.action}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">{recommendation.expectedImpact}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700">
                Build your schedule in the Course Planner to receive recommendations.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BarChart3 className="h-5 w-5 text-[#2563eb]" />
            Past Semester Performance
          </h2>
          <div className="flex h-36 items-end gap-2 sm:h-48 sm:gap-3">
            {PAST_SEMESTER_GPA.map((semester) => {
              const pct = ((semester.gpa - 2.5) / 1.5) * 100;
              return (
                <div key={semester.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-[#0f1e3c] sm:text-xs">{semester.gpa.toFixed(2)}</span>
                  <div className="flex h-[100px] w-full items-end sm:h-[140px]">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-[#2563eb] to-[#3b82f6] transition-all duration-500"
                      style={{ height: `${clamp(pct, 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-medium text-gray-400 sm:text-[10px]">{semester.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <Save className="h-5 w-5 text-[#2563eb]" />
              Saved Drafts
            </h2>
            <Link to="/app/courses" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
              Open planner
            </Link>
          </div>
          <div className="space-y-3">
            {drafts.length > 0 ? (
              drafts.slice(0, 4).map((draft) => (
                <div key={draft.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#0f1e3c]">{draft.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {draft.courseCodes.length} courses | {draft.evaluation.totalCredits} credits
                      </p>
                      <p className="mt-2 text-xs text-gray-500">Saved {new Date(draft.savedAt).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDiffLabel(draft.evaluation.totalScore).cls}`}>
                      {draft.evaluation.totalScore} {draft.evaluation.riskLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => loadScheduleDraft(studentId, draft.id)}
                    className="mt-3 rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10"
                  >
                    Load into planner
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No saved drafts yet. Analyze and save a draft from the Course Planner.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <TrendingUp className="h-5 w-5 text-[#2563eb]" />
            Recent Evaluations
          </h2>
          <div className="space-y-3">
            {evaluationHistory.length > 0 ? (
              evaluationHistory.map((evaluation) => (
                <div key={evaluation.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#0f1e3c]">{new Date(evaluation.evaluatedAt).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Model {evaluation.modelVersion}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDiffLabel(evaluation.totalScore).cls}`}>
                      {evaluation.totalScore} {evaluation.riskLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Top contributors: {evaluation.topCourses.join(', ')}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No evaluations yet. Run an analysis in the planner.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


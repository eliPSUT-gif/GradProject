import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
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
import { formatTermLabel, getDiffLabel } from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function AdvisorStudentDetailPage() {
  const { studentId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    courses,
    currentEvaluations,
    getSelectedCourses,
    getStudentDrafts,
    getStudentTermMetrics,
    getStudentTranscript,
    isAppDataReady,
    recentEvaluations,
    studentInsights,
  } = useAppData();

  const profile = studentInsights.find((item) => item.id === studentId && item.advisorId === user?.id) ?? null;
  const selectedCourses = getSelectedCourses(studentId);
  const drafts = getStudentDrafts(studentId);
  const transcriptRows = getStudentTranscript(studentId);
  const termMetrics = getStudentTermMetrics(studentId);
  const currentEvaluation = currentEvaluations[studentId] ?? null;
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview');
  const transcriptByTerm = useMemo(() => {
    return transcriptRows.reduce<Record<string, typeof transcriptRows>>((groups, row) => {
      groups[row.termCode] = [...(groups[row.termCode] ?? []), row];
      return groups;
    }, {});
  }, [transcriptRows]);

  const selectedCoursesForDisplay = useMemo(
    () =>
      selectedCourses.length > 0
        ? selectedCourses
        : drafts[0]
          ? drafts[0].courseCodes
              .map((code) => courses.find((course) => course.code === code))
              .filter((course): course is NonNullable<typeof course> => Boolean(course))
          : [],
    [courses, drafts, selectedCourses]
  );

  const totalCredits = useMemo(
    () => selectedCoursesForDisplay.reduce((sum, course) => sum + course.credits, 0),
    [selectedCoursesForDisplay]
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

  const handleMessageStudent = () => {
    if (!profile) {
      return;
    }

    navigate('/app/advisor/messages', { state: { focusUserId: profile.id, scrollToBottom: true } });
  };

  const recIcon = (impactDelta: number) => {
    if (impactDelta >= 8) {
      return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
    }

    if (impactDelta === 0) {
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />;
    }

    return <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />;
  };

  const recBg = (impactDelta: number) => {
    if (impactDelta >= 8) return 'bg-amber-50 border-amber-200';
    if (impactDelta === 0) return 'bg-emerald-50 border-emerald-200';
    return 'bg-blue-50 border-blue-200';
  };

  if (!isAppDataReady) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading student details...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-8">
        <p className="text-sm text-gray-500">This student could not be found in your advisee list.</p>
        <Link to="/app/advisor" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
          <ArrowLeft className="h-4 w-4" />
          Back to advisor dashboard
        </Link>
      </div>
    );
  }

  const kpis = [
    {
      icon: TrendingUp,
      label: 'Current Average',
      value: profile.averageMark.toFixed(2),
      subtitle: 'Based on transcript marks',
      accent: '#2563eb',
    },
    {
      icon: Gauge,
      label: 'Schedule Score',
      value: score !== null ? String(score) : '-',
      subtitle: diffInfo?.label ?? 'No evaluated draft yet',
      accent: diffInfo?.color ?? '#94a3b8',
    },
    {
      icon: BookOpen,
      label: 'Credits This Term',
      value: totalCredits > 0 ? String(totalCredits) : '0',
      subtitle: selectedCoursesForDisplay.length > 0 ? `${selectedCoursesForDisplay.length} courses selected` : 'No active draft',
      accent: '#3b82f6',
    },
    {
      icon: GraduationCap,
      label: 'Completed Credits',
      value: String(profile.creditsCompleted),
      subtitle: 'Towards graduation plan',
      accent: '#0f766e',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/advisor" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
            <ArrowLeft className="h-4 w-4" />
            Back to advisor dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#0f1e3c]">{profile.name}</h1>
          <p className="text-sm text-gray-500">ID {profile.id} | {profile.department}</p>
        </div>
        <button
          onClick={handleMessageStudent}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          <MessageSquare className="h-4 w-4" />
          Message student
        </button>
      </div>

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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'bg-[#0f1e3c] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'transcript' ? 'bg-[#0f1e3c] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
        >
          Transcript
        </button>
      </div>

      {activeTab === 'overview' ? (
      <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BookOpen className="h-5 w-5 text-[#2563eb]" />
            Current Schedule
          </h2>

          {selectedCoursesForDisplay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">This student does not have an active saved draft yet.</p>
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
                  {selectedCoursesForDisplay.map((course) => {
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
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">No explainable risk factors are available yet.</div>
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
            <button onClick={handleMessageStudent} className="hidden items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] sm:inline-flex">
              <MessageSquare className="h-4 w-4" />
              Message student
            </button>
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
                No recommendations are available until the student saves an analyzed draft.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BarChart3 className="h-5 w-5 text-[#2563eb]" />
            Past Semester Averages
          </h2>
          <div className="flex h-36 items-end gap-2 sm:h-48 sm:gap-3">
            {termMetrics.length > 0 ? termMetrics.map((semester) => {
              const mark = semester.averageMark ?? 0;
              const pct = ((mark - 35) / 65) * 100;
              return (
                <div key={semester.termCode} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-[#0f1e3c] sm:text-xs">{mark.toFixed(1)}</span>
                  <div className="flex h-[100px] w-full items-end sm:h-[140px]">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-[#2563eb] to-[#3b82f6] transition-all duration-500"
                      style={{ height: `${clamp(pct, 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-medium text-gray-400 sm:text-[10px]">{semester.termLabel}</span>
                </div>
              );
            }) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                Transcript marks will appear here once completed courses are available.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <Save className="h-5 w-5 text-[#2563eb]" />
            Saved Drafts
          </h2>
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
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                This student has no saved drafts yet.
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
                No recent evaluations are available yet.
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#0f1e3c]">Full Transcript</h2>
            <p className="mt-1 text-sm text-gray-500">Completed courses and recorded marks for this advisee.</p>
          </div>
          {transcriptRows.length > 0 ? (
            <div className="space-y-5">
              {Object.entries(transcriptByTerm).map(([termCode, rows]) => (
                <div key={termCode} className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-[#0f1e3c]">{formatTermLabel(termCode)}</p>
                    <span className="text-xs font-medium text-gray-500">{rows.length} course{rows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                          <th className="px-4 py-3 pr-4">Code</th>
                          <th className="px-4 py-3 pr-4">Course</th>
                          <th className="px-4 py-3 pr-4 text-center">Credits</th>
                          <th className="px-4 py-3 text-center">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={`${row.termCode}-${row.courseCode}`} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3 font-mono font-semibold text-[#0f1e3c]">{row.courseCode}</td>
                            <td className="px-4 py-3 text-gray-700">{row.courseName}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{row.credits}</td>
                            <td className="px-4 py-3 text-center font-semibold text-[#0f1e3c]">{row.finalGrade === null ? '-' : row.finalGrade.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No transcript rows are available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

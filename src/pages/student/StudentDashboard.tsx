import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Gauge,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { formatTermLabel, getDiffLabel } from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useMessaging } from '../../context/MessagingContext';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function StudentDashboard() {
  const { user } = useAuth();
  const { getAssignedAdvisorId, isMessagingReady, sendAssistanceRequest } = useMessaging();
  const {
    getPlannerTermCode,
    getSelectedCourses,
    getStudentTranscriptSemesters,
    getStudentTermMetrics,
    getStudentTranscript,
    isAppDataReady,
    plannerReviewSnapshots,
    studentInsights,
  } = useAppData();

  const studentId = user?.id ?? '';
  const advisorId = getAssignedAdvisorId(studentId);
  const selectedCourses = getSelectedCourses(studentId);
  const transcriptRows = getStudentTranscript(studentId);
  const transcriptSemesters = getStudentTranscriptSemesters(studentId);
  const termMetrics = getStudentTermMetrics(studentId);
  const plannerTermCode = getPlannerTermCode(studentId);
  const currentEvaluation = plannerReviewSnapshots[studentId] ?? null;
  const profile = studentInsights.find((item) => item.id === studentId);
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'semester-transcript'>('overview');
  const [selectedSemesterTermCode, setSelectedSemesterTermCode] = useState('');
  const selectedCoursesForDisplay = useMemo(
    () =>
      selectedCourses.length > 0
        ? selectedCourses
        : [],
    [selectedCourses]
  );

  const totalCredits = useMemo(
    () => selectedCoursesForDisplay.reduce((sum, course) => sum + course.credits, 0),
    [selectedCoursesForDisplay]
  );

  const score = currentEvaluation?.totalScore ?? null;
  const diffInfo = score !== null ? getDiffLabel(score) : null;
  const meterPct = score !== null ? clamp(score, 0, 100) : 50;
  const explanation = currentEvaluation?.explanation ?? [];
  const latestRecommendations = currentEvaluation?.recommendations ?? [];
  const [assistanceFeedback, setAssistanceFeedback] = useState<string | null>(null);
  const selectedSemester = transcriptSemesters.find((semester) => semester.termCode === selectedSemesterTermCode)
    ?? transcriptSemesters[0]
    ?? null;

  useEffect(() => {
    if (
      transcriptSemesters.length > 0
      && !transcriptSemesters.some((semester) => semester.termCode === selectedSemesterTermCode)
    ) {
      setSelectedSemesterTermCode(transcriptSemesters[0].termCode);
      return;
    }

    if (transcriptSemesters.length === 0 && selectedSemesterTermCode) {
      setSelectedSemesterTermCode('');
    }
  }, [selectedSemesterTermCode, transcriptSemesters]);

  const kpis = [
    {
      icon: GraduationCap,
      label: 'GPA',
      value: profile ? profile.gpa.toFixed(2) : '-',
      subtitle: 'Calculated from transcript marks',
      accent: '#7c3aed',
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
      subtitle: selectedCourses.length > 0 ? `${selectedCourses.length} courses selected for ${formatTermLabel(plannerTermCode)}` : 'No draft selected',
      accent: '#3b82f6',
    },
    {
      icon: BookOpen,
      label: 'Completed Credits',
      value: String(profile?.creditsCompleted ?? 0),
      subtitle: 'Towards graduation plan',
      accent: '#0f766e',
    },
  ];

  if (!isAppDataReady) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading your academic dashboard...
      </div>
    );
  }

  const handleAskForAssistance = async () => {
    if (!advisorId) {
      setAssistanceFeedback('No advisor is assigned to your account yet.');
      return;
    }

    const result = await sendAssistanceRequest({ senderId: studentId, recipientId: advisorId });
    setAssistanceFeedback(
      result.success
        ? 'Your advisor has been notified that you need assistance.'
        : result.error ?? 'Unable to notify your advisor right now.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#0f1e3c]">Need quick advisor support?</p>
          <p className="text-sm text-gray-600">
            Send a direct assistance alert to your assigned advisor.
          </p>
        </div>
        <button
          onClick={() => { void handleAskForAssistance(); }}
          disabled={!advisorId || !isMessagingReady}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <AlertTriangle className="h-4 w-4" />
          Ask for assistance
        </button>
      </div>

      {assistanceFeedback && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {assistanceFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative flex h-full min-h-[152px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md sm:min-h-[170px] sm:p-5">
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
        <button
          onClick={() => setActiveTab('semester-transcript')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'semester-transcript' ? 'bg-[#0f1e3c] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
        >
          Semester Transcript
        </button>
      </div>

      {activeTab === 'overview' ? (
      <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BookOpen className="h-5 w-5 text-[#2563eb]" />
            My Schedule Next Semester
          </h2>

          {selectedCoursesForDisplay.length === 0 ? (
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

          <div className="mt-6 w-full rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes &amp; Rationale</p>
            {explanation.length > 0 ? (
              <div className="space-y-2">
                {explanation.map((line, index) => (
                  <div key={`${index}-${line}`} className="flex gap-2 rounded-lg bg-white px-3 py-2 text-left shadow-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white px-3 py-2 text-left shadow-sm">Run Analyze Schedule to generate notes and rationale.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <Sparkles className="h-5 w-5 text-[#2563eb]" />
              AI Recommendations
            </h2>
            <Link to="/app/messages" className="hidden items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] sm:inline-flex">
              Message advisor
            </Link>
          </div>
          <div className="space-y-3">
            {currentEvaluation ? (
              <>
                {latestRecommendations.length > 0 ? (
                  <div className="space-y-3">
                    {latestRecommendations.map((recommendation) => (
                      <div key={recommendation.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0f1e3c]">{recommendation.title}</p>
                            <p className="mt-1 text-sm text-gray-600">{recommendation.reason}</p>
                            <p className="mt-2 text-sm text-gray-700">
                              <span className="font-semibold text-amber-700">Action: </span>
                              {recommendation.action}
                            </p>
                            <div className="mt-3 flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <p className="text-xs font-semibold text-emerald-700">{recommendation.expectedImpact}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Your latest analysis did not suggest any urgent changes.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
                  Advisor recommendations are now delivered through Messages.
                </div>
                <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                  Run Analyze Schedule in the Course Planner to generate AI recommendations here.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <BarChart3 className="h-5 w-5 text-[#2563eb]" />
            Past Semester GPA
          </h2>
          <div className="flex h-36 items-end gap-2 sm:h-48 sm:gap-3">
            {termMetrics.length > 0 ? termMetrics.map((semester) => {
              const gpa = semester.gpa ?? 0;
              const pct = (gpa / 4) * 100;
              return (
                <div key={semester.termCode} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-[#0f1e3c] sm:text-xs">{gpa.toFixed(2)}</span>
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
                Transcript-derived GPA will appear here once completed courses are available.
              </div>
            )}
          </div>
        </div>
      </div>

      </>
      ) : activeTab === 'transcript' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#0f1e3c]">Full Transcript</h2>
            <p className="mt-1 text-sm text-gray-500">All degree courses, including untaken courses and recorded marks.</p>
          </div>
          {transcriptRows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                <p className="font-semibold text-[#0f1e3c]">Degree Transcript</p>
                <span className="text-xs font-medium text-gray-500">{transcriptRows.length} course{transcriptRows.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-3 pr-4">Code</th>
                      <th className="px-4 py-3 pr-4">Course</th>
                      <th className="px-4 py-3 pr-4 text-center">Credits</th>
                      <th className="px-4 py-3 pr-4 text-center">Term</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transcriptRows.map((row) => (
                      <tr key={row.courseCode} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 font-mono font-semibold text-[#0f1e3c]">{row.courseCode}</td>
                        <td className="px-4 py-3 text-gray-700">{row.courseName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.credits}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.termLabel}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[#0f1e3c]">{row.finalGrade === null ? '-' : row.finalGrade.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No transcript rows are available yet.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0f1e3c]">Semester Transcript</h2>
              <p className="mt-1 text-sm text-gray-500">Review the recorded courses and marks for one semester at a time.</p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-600">
              Semester
              <select
                value={selectedSemester?.termCode ?? ''}
                onChange={(event) => setSelectedSemesterTermCode(event.target.value)}
                className="min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#0f1e3c] outline-none ring-0 transition-colors focus:border-[#2563eb]"
              >
                {transcriptSemesters.map((semester) => (
                  <option key={semester.termCode} value={semester.termCode}>
                    {semester.termLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedSemester ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#0f1e3c]">{selectedSemester.termLabel}</p>
                  <p className="text-xs text-gray-500">
                    {selectedSemester.completedCredits} hour{selectedSemester.completedCredits !== 1 ? 's' : ''} | {selectedSemester.courseCount} course{selectedSemester.courseCount !== 1 ? 's' : ''} | GPA {selectedSemester.gpa?.toFixed(2) ?? '-'}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-3 pr-4">Code</th>
                      <th className="px-4 py-3 pr-4">Course</th>
                      <th className="px-4 py-3 pr-4 text-center">Credits</th>
                      <th className="px-4 py-3 pr-4 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSemester.rows.map((row) => (
                      <tr key={`${row.termCode}-${row.courseCode}`} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 font-mono font-semibold text-[#0f1e3c]">{row.courseCode}</td>
                        <td className="px-4 py-3 text-gray-700">{row.courseName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.credits}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            {row.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-[#0f1e3c]">{row.finalGrade === null ? '-' : row.finalGrade.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No semester transcript data is available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


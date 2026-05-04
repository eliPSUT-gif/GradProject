import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Eye, Gauge, Lightbulb, Lock, Save, Search, Sparkles, Trash2, TrendingUp, X } from 'lucide-react';
import { formatTermLabel, getDiffLabel, type Course, type ScheduleEvaluation } from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

const TYPE_FILTERS = ['All', 'Theoretical', 'Practical', 'Hybrid', 'Project'] as const;

interface DisplayedReview {
  evaluation: ScheduleEvaluation;
  courses: Course[];
  termCode: string;
  totalCredits: number;
}

function typeTag(type: Course['type']) {
  if (type === 'theoretical') return 'bg-violet-100 text-violet-700';
  if (type === 'practical') return 'bg-sky-100 text-sky-700';
  if (type === 'hybrid') return 'bg-indigo-100 text-indigo-700';
  return 'bg-amber-100 text-amber-700';
}

export default function CoursePlanner() {
  const { user } = useAuth();
  const {
    clearSelection,
    courses,
    deleteScheduleDraft,
    getCoursePrerequisitesWithGrades,
    getCourseSelectionState,
    getPlannerTermCode,
    getSelectedCourses,
    getStudentAvailableTerms,
    getStudentDrafts,
    getTermCreditLimit,
    isAppDataReady,
    loadScheduleDraft,
    plannerReviewSnapshots,
    plannerSelections,
    requestPlannerAnalysis,
    saveScheduleDraft,
    setPlannerTermCode,
    toggleCourseSelection,
  } = useAppData();
  const studentId = user?.id ?? '';
  const selectedCourses = getSelectedCourses(studentId);
  const savedDrafts = getStudentDrafts(studentId);
  const persistedReview = plannerReviewSnapshots[studentId] ?? null;
  const selectedCodes = new Set(plannerSelections[studentId] ?? []);
  const plannerTermCode = getPlannerTermCode(studentId);
  const availableTerms = getStudentAvailableTerms(studentId);
  const termCreditLimit = getTermCreditLimit(studentId);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All');
  const [draftName, setDraftName] = useState('My Next Schedule');
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [draftFeedback, setDraftFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const deferredSearch = useDeferredValue(search);
  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);

  const displayedReview = useMemo<DisplayedReview | null>(() => {
    if (!persistedReview) {
      return null;
    }

    const reviewedCourseCodes = persistedReview.courseCodes ?? [];
    const reviewCourses = reviewedCourseCodes
      .map((code) => courses.find((course) => course.code === code))
      .filter((course): course is Course => Boolean(course));

    return {
      evaluation: persistedReview,
      courses: reviewCourses,
      termCode: persistedReview.termCode ?? plannerTermCode,
      totalCredits: persistedReview.totalCredits,
    };
  }, [courses, persistedReview, plannerTermCode]);

  const hasAnalyzed = Boolean(displayedReview);

  useEffect(() => {
    if (!shouldScrollToResults) return;
    if (!hasAnalyzed || !displayedReview || !resultsRef.current) return;
    // Use rAF to let the browser finish committing the new section to the DOM,
    // then scroll. We deliberately do NOT return a cleanup, because resetting
    // shouldScrollToResults below re-runs the effect and would otherwise cancel
    // the pending frame before the scroll fires.
    const node = resultsRef.current;
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    setShouldScrollToResults(false);
  }, [shouldScrollToResults, hasAnalyzed, displayedReview]);

  useEffect(() => {
    setShouldScrollToResults(false);
  }, [studentId]);

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      if (!course.isPlannable) {
        return false;
      }
      const matchSearch = !deferredSearch || course.name.toLowerCase().includes(deferredSearch.toLowerCase()) || course.code.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchType = typeFilter === 'All' || course.type === typeFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [courses, deferredSearch, typeFilter]);

  const handleAnalyze = async () => {
    if (totalCredits > termCreditLimit) {
      setPlannerError(`You cannot analyze more than ${termCreditLimit} credit hours for ${formatTermLabel(plannerTermCode)}.`);
      return;
    }

    setPlannerError(null);
    setIsAnalyzing(true);
    const reviewedCourses = selectedCourses;
    const reviewedTermCode = plannerTermCode;
    const reviewedCredits = totalCredits;
    try {
      const evaluation = await requestPlannerAnalysis(studentId);
      if (!evaluation) {
        setPlannerError('Select at least one course before running the AI planner review.');
        return;
      }
      const matchesRequestedReview = reviewedTermCode === (evaluation.termCode ?? reviewedTermCode)
        && reviewedCredits === evaluation.totalCredits
        && reviewedCourses.every((course, index) => evaluation.courseCodes?.[index] === course.code);

      if (!matchesRequestedReview) {
        console.warn('Planner review metadata did not match the analyzed course snapshot.', {
          requestedCourses: reviewedCourses.map((course) => course.code),
          reviewedCourseCodes: evaluation.courseCodes,
        });
      }
      setShouldScrollToResults(true);
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'Unable to analyze this schedule right now.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewDraft = (draftId: string) => {
    loadScheduleDraft(studentId, draftId);
    setPlannerError(null);
    setDraftFeedback(null);
    setIsDraftsOpen(false);
  };

  const handleClearSelection = () => {
    clearSelection(studentId);
    setPlannerError(null);
    setDraftFeedback(null);
  };

  const handleToggle = (code: string) => {
    const result = toggleCourseSelection(studentId, code);
    setPlannerError(result.success ? null : result.error ?? 'Unable to add this course.');
    if (result.success) {
      setDraftFeedback(null);
    }
  };

  const handleSaveDraft = () => {
    const nextDraftName = draftName.trim() || 'Saved Schedule Draft';
    const draft = saveScheduleDraft(studentId, nextDraftName);
    setPlannerError(draft ? null : 'Analyze a valid schedule before saving it.');
    if (!draft) {
      setDraftFeedback(null);
      return;
    }

    setDraftFeedback(
      draft.syncStatus === 'pending'
        ? { tone: 'info', message: 'Draft saved locally and is syncing to Supabase.' }
        : { tone: 'success', message: 'Draft saved successfully.' }
    );
  };

  if (!isAppDataReady) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading your planner and saved drafts...
      </div>
    );
  }

  const reviewEvaluation = displayedReview?.evaluation ?? null;
  const reviewedCourses = displayedReview?.courses ?? [];
  const reviewedTotalCredits = displayedReview?.totalCredits ?? 0;
  const reviewedTermCode = displayedReview?.termCode ?? plannerTermCode;
  const overallDiff = reviewEvaluation ? getDiffLabel(reviewEvaluation.totalScore) : null;
  const scoreDash = 2 * Math.PI * 42;

  return (
    <div className="space-y-6 sm:space-y-8">
    <div className="flex items-start gap-4 max-lg:flex-col sm:gap-6">
      <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-[220px] flex-[1_1_18rem] sm:min-w-[260px]">
            <select
              value={plannerTermCode}
              onChange={(event) => setPlannerTermCode(studentId, event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            >
              {availableTerms.map((term) => (
                <option key={term.termCode} value={term.termCode}>
                  {formatTermLabel(term.termCode)}{term.termType === 'summer' ? ' • Summer max 9 credits' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[220px] flex-[1_1_16rem] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search courses..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          </div>
          <div className="flex w-full flex-wrap gap-1.5 xl:w-auto xl:flex-nowrap">
            {TYPE_FILTERS.map((filter) => (
              <button key={filter} onClick={() => setTypeFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${typeFilter === filter ? 'bg-[#2563eb] text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb]'}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        {plannerError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{plannerError}</div>}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const isSelected = selectedCodes.has(course.code);
            const status = getCourseSelectionState(studentId, course.code);
            const prerequisiteGrades = getCoursePrerequisitesWithGrades(studentId, course.code);
            const nonPrerequisiteRules = course.requirementText.filter((line) => !line.startsWith('Prerequisite:'));
            const diff = getDiffLabel(course.diffScore);
            const locked = !isSelected && !status.eligible;
            return (
              <button key={course.code} onClick={() => handleToggle(course.code)} className={`group relative h-full rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:shadow-md ${isSelected ? 'border-[#2563eb] ring-2 ring-[#2563eb]/20 shadow-sm' : locked ? 'border-gray-200 opacity-75' : 'border-gray-200 hover:border-gray-300'}`}>
                {isSelected && <div className="absolute right-3 top-3"><CheckCircle2 className="h-5 w-5 text-[#2563eb]" /></div>}
                {locked && <div className="absolute right-3 top-3"><Lock className="h-4 w-4 text-red-500" /></div>}
                <div className="mb-2 flex items-center gap-2"><span className="font-mono text-xs font-bold text-[#0f1e3c]">{course.code}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${typeTag(course.type)}`}>{course.type}</span></div>
                <h3 className="mb-2 text-sm font-semibold leading-snug text-[#0f1e3c]">{course.name}</h3>
                <p className="mb-3 text-xs text-gray-500">{course.department} | {course.credits} credit{course.credits !== 1 ? 's' : ''}</p>
                <div className="mb-3 flex items-center justify-between"><span className="text-xs text-gray-500">Difficulty basis</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${diff.cls}`}>{diff.label} ({course.diffScore})</span></div>
                <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100"><div className={`h-full rounded-full ${diff.barColor}`} style={{ width: `${course.diffScore}%` }} /></div>
                <div className="space-y-2 text-[11px] text-gray-500">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-gray-400">Prerequisites</p>
                    {prerequisiteGrades.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {prerequisiteGrades.map((item) => (
                          <div key={item.code} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1">
                            <span className="truncate text-gray-600">{item.name}</span>
                            <span className="shrink-0 font-semibold text-[#0f1e3c]">{item.grade === null ? '-' : item.grade.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1">-</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-gray-400">Concurrent / Rules</p>
                    {nonPrerequisiteRules.length > 0 ? nonPrerequisiteRules.map((line) => <p key={line}>{line}</p>) : <p>-</p>}
                  </div>
                  {locked && status.reasons.map((reason) => <p key={reason} className="text-red-600">{reason}</p>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 space-y-3 sm:space-y-4 lg:sticky lg:top-6 lg:w-96 lg:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[#0f1e3c]">My Selection ({selectedCourses.length})</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${totalCredits > termCreditLimit ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{totalCredits} / {termCreditLimit} cr</span></div>
          {selectedCourses.length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Click eligible courses to add them here.</p> : <div className="mb-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">{selectedCourses.map((course) => (<div key={course.code} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"><div className="min-w-0"><span className="font-mono text-xs font-bold text-[#0f1e3c]">{course.code}</span><span className="ml-2 break-words text-xs text-gray-500">{course.name}</span></div><button onClick={() => handleToggle(course.code)} className="shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></div>))}</div>}
          <div className="space-y-2">
            <button onClick={() => { void handleAnalyze(); }} disabled={selectedCourses.length === 0 || isAnalyzing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />{isAnalyzing ? 'Analyzing Schedule...' : 'Run AI Planner Review'}</button>
            <div className="flex gap-2"><input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Draft name" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" /><button onClick={handleSaveDraft} disabled={selectedCourses.length === 0} className="inline-flex items-center gap-1 rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save</button></div>
            {draftFeedback && (
              <div className={`rounded-lg px-3 py-2 text-xs ${draftFeedback.tone === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : draftFeedback.tone === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-blue-200 bg-blue-50 text-blue-700'}`}>
                {draftFeedback.message}
              </div>
            )}
            {savedDrafts[0]?.syncStatus === 'pending' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Latest draft is still syncing to Supabase.
              </div>
            )}
            {savedDrafts[0]?.syncStatus === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Latest draft was saved locally but not synced to Supabase yet. {savedDrafts[0].syncError ?? 'Please try saving again.'}
              </div>
            )}
            <button onClick={() => setIsDraftsOpen(true)} disabled={savedDrafts.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-xs font-semibold text-[#0f1e3c] transition-colors hover:border-[#2563eb]/30 hover:bg-[#2563eb]/5 hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-40"><Eye className="h-3.5 w-3.5" />View Drafts ({savedDrafts.length})</button>
            {selectedCourses.length > 0 && <button onClick={handleClearSelection} className="w-full rounded-lg border border-gray-200 py-2.5 text-xs text-gray-500 transition-colors hover:border-red-200 hover:text-red-500">Clear Selection</button>}
          </div>
        </div>
      </div>
    </div>

    {isDraftsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c]">
                <BookOpen className="h-4 w-4 text-[#2563eb]" />
                View Drafts
              </h3>
              <p className="mt-1 text-xs text-gray-500">Select a draft to load it into your current course selection.</p>
            </div>
            <button onClick={() => setIsDraftsOpen(false)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="Close drafts menu">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
            {savedDrafts.length > 0 ? (
              savedDrafts.map((draft) => (
                <div key={draft.id} className="rounded-xl border border-gray-200 p-3 transition-colors hover:border-[#2563eb]/40 hover:bg-blue-50/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0f1e3c]">{draft.name}</p>
                      <p className="text-xs text-gray-500">
                        {draft.evaluation.totalCredits} credits &middot; {draft.courseCodes.length} course{draft.courseCodes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDiffLabel(draft.evaluation.totalScore).cls}`}>
                        {draft.evaluation.totalScore}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${draft.syncStatus === 'error' ? 'bg-red-100 text-red-700' : draft.syncStatus === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {draft.syncStatus === 'error' ? 'Not synced' : draft.syncStatus === 'pending' ? 'Syncing' : 'Saved'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewDraft(draft.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Load Draft
                    </button>
                    <button
                      onClick={() => deleteScheduleDraft(draft.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"
                      aria-label={`Remove draft ${draft.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                Save a draft after analyzing your schedule to revisit it later.
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {hasAnalyzed && reviewEvaluation && overallDiff && (
      <section
        ref={resultsRef}
        className="scroll-mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        aria-label="Schedule analysis results"
      >
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Hero header */}
          <div className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 sm:p-8">
            {/* Subtle decorative accents */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2563eb]/10 blur-3xl" />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl"
              style={{ backgroundColor: `${overallDiff.color}25` }}
            />

            <div className="relative flex items-center gap-5 sm:gap-6">
                {/* Circular score gauge */}
                <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" strokeWidth="6" stroke="#e2e8f0" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      strokeWidth="6"
                      stroke={overallDiff.color}
                      fill="none"
                      strokeDasharray={scoreDash}
                      strokeDashoffset={scoreDash * (1 - Math.min(reviewEvaluation.totalScore, 100) / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-4xl font-bold leading-none text-[#0f1e3c] sm:text-5xl">
                      {reviewEvaluation.totalScore}
                    </span>
                    <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">of 100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                    <Sparkles className="h-3 w-3" /> Live AI Response
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#0f1e3c] sm:text-3xl">
                    AI Schedule Review
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    {formatTermLabel(reviewedTermCode)} &middot; {reviewedCourses.length} course{reviewedCourses.length !== 1 ? 's' : ''} &middot; {reviewedTotalCredits} credit{reviewedTotalCredits !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-500">
                    This review combines your planner score with live AI-generated rationale and recommendations.
                  </p>
                  <div
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: `${overallDiff.color}15`,
                      color: overallDiff.color,
                      borderColor: `${overallDiff.color}50`,
                    }}
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {overallDiff.label} workload
                  </div>
                </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-2">
            {/* Course Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-200">
                  <BookOpen className="h-4 w-4 text-[#2563eb]" />
                </div>
                <h3 className="text-sm font-bold text-[#0f1e3c]">Course Breakdown</h3>
              </div>
              <div className="space-y-2.5">
                {reviewedCourses.map((course) => {
                  const d = getDiffLabel(course.diffScore);
                  return (
                    <div
                      key={course.code}
                      className="rounded-lg border border-gray-200 bg-slate-50/60 p-3 transition-colors hover:border-[#2563eb]/30 hover:bg-blue-50/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#0f1e3c]">{course.code}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${typeTag(course.type)}`}
                            >
                              {course.type}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-snug text-gray-700">{course.name}</p>
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {course.credits} credit{course.credits !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.cls}`}>
                          {course.diffScore}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${course.diffScore}%`,
                            backgroundColor: d.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 ring-1 ring-amber-200">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-[#0f1e3c]">Recommendations</h3>
              </div>
              {reviewEvaluation.recommendations.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>The latest AI review sees this schedule as balanced with no immediate changes needed.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewEvaluation.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-lg border border-amber-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <p className="text-xs font-bold text-[#0f1e3c]">{rec.title}</p>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{rec.reason}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-gray-700">
                        <span className="font-semibold text-amber-700">Action: </span>
                        {rec.action}
                      </p>
                      <div className="mt-2 flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                        <p className="text-[11px] font-semibold leading-snug text-emerald-700">
                          {rec.expectedImpact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Rationale */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-[#0f1e3c]">Notes &amp; Rationale</h3>
              </div>
              {reviewEvaluation.explanation.length === 0 ? (
                <p className="text-xs text-gray-500">No additional AI rationale is available for this schedule yet.</p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {reviewEvaluation.explanation.map((line, idx) => (
                    <li
                      key={line}
                      className="flex gap-2.5 rounded-lg bg-slate-50/60 px-3 py-2 text-xs leading-relaxed text-gray-700 ring-1 ring-gray-100"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        {idx + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    )}
    </div>
  );
}

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Lock, Save, Search, Sparkles, Trash2, X } from 'lucide-react';
import { getDiffLabel, MAX_SEMESTER_CREDITS, type Course } from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

const TYPE_FILTERS = ['All', 'Theoretical', 'Practical', 'Hybrid', 'Project'] as const;

function typeTag(type: Course['type']) {
  if (type === 'theoretical') return 'bg-violet-100 text-violet-700';
  if (type === 'practical') return 'bg-sky-100 text-sky-700';
  if (type === 'hybrid') return 'bg-indigo-100 text-indigo-700';
  return 'bg-amber-100 text-amber-700';
}

export default function CoursePlanner() {
  const { user } = useAuth();
  const { analyzeSchedule, clearSelection, courses, currentEvaluations, deleteScheduleDraft, getCourseSelectionState, getSelectedCourses, getStudentDrafts, loadScheduleDraft, plannerSelections, saveScheduleDraft, toggleCourseSelection } = useAppData();
  const studentId = user?.id ?? '';
  const selectedCourses = getSelectedCourses(studentId);
  const savedDrafts = getStudentDrafts(studentId);
  const analysisResult = currentEvaluations[studentId] ?? null;
  const selectedCodes = new Set(plannerSelections[studentId] ?? []);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All');
  const [draftName, setDraftName] = useState('My Next Schedule');
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const matchSearch = !deferredSearch || course.name.toLowerCase().includes(deferredSearch.toLowerCase()) || course.code.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchType = typeFilter === 'All' || course.type === typeFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [courses, deferredSearch, typeFilter]);

  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);

  const handleAnalyze = () => {
    setPlannerError(totalCredits > MAX_SEMESTER_CREDITS ? `You cannot analyze more than ${MAX_SEMESTER_CREDITS} credit hours.` : null);
    analyzeSchedule(studentId);
  };

  const handleToggle = (code: string) => {
    const result = toggleCourseSelection(studentId, code);
    setPlannerError(result.success ? null : result.error ?? 'Unable to add this course.');
  };

  const handleSaveDraft = () => {
    const nextDraftName = draftName.trim() || 'Saved Schedule Draft';
    const draft = saveScheduleDraft(studentId, nextDraftName);
    setPlannerError(draft ? null : 'Analyze a valid schedule before saving it.');
  };

  return (
    <div className="flex items-start gap-4 max-lg:flex-col sm:gap-6">
      <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search courses..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
          </div>
          <div className="flex gap-1.5 max-sm:flex-wrap">
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
                <div className="space-y-1 text-[11px] text-gray-500">
                  {course.requirementText.length > 0 ? course.requirementText.map((line) => <p key={line}>{line}</p>) : <p>No prerequisite restrictions.</p>}
                  {locked && status.reasons.map((reason) => <p key={reason} className="text-red-600">{reason}</p>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 space-y-3 sm:space-y-4 lg:w-96 xl:sticky xl:top-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[#0f1e3c]">My Selection ({selectedCourses.length})</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${totalCredits > MAX_SEMESTER_CREDITS ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{totalCredits} / {MAX_SEMESTER_CREDITS} cr</span></div>
          {selectedCourses.length === 0 ? <p className="py-6 text-center text-xs text-gray-400">Click eligible courses to add them here.</p> : <div className="mb-4 space-y-2">{selectedCourses.map((course) => (<div key={course.code} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"><div className="min-w-0"><span className="font-mono text-xs font-bold text-[#0f1e3c]">{course.code}</span><span className="ml-2 break-words text-xs text-gray-500">{course.name}</span></div><button onClick={() => handleToggle(course.code)} className="shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></div>))}</div>}
          <div className="space-y-2">
            <button onClick={handleAnalyze} disabled={selectedCourses.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="h-4 w-4" />Analyze My Schedule</button>
            <div className="flex gap-2"><input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Draft name" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" /><button onClick={handleSaveDraft} disabled={selectedCourses.length === 0} className="inline-flex items-center gap-1 rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save</button></div>
            {selectedCourses.length > 0 && <button onClick={() => { clearSelection(studentId); setPlannerError(null); }} className="w-full rounded-lg border border-gray-200 py-2.5 text-xs text-gray-500 transition-colors hover:border-red-200 hover:text-red-500">Clear Selection</button>}
          </div>
        </div>

        {analysisResult && <div className="space-y-4 rounded-xl bg-[#0f1e3c] p-5 text-white"><div className="flex items-center gap-4"><div className="text-center"><p className="font-display text-4xl font-bold" style={{ color: getDiffLabel(analysisResult.totalScore).color }}>{analysisResult.totalScore}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">Difficulty Score</p></div><div className="h-16 w-px bg-gray-600" /><div className="flex-1 space-y-2.5">{analysisResult.factors.map((factor) => (<div key={factor.label}><div className="mb-0.5 flex items-center justify-between text-[10px]"><span className="text-gray-400">{factor.label}</span><span className="font-semibold">{factor.score}</span></div><div className="h-1.5 rounded-full bg-gray-700"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(factor.score, 100)}%`, backgroundColor: getDiffLabel(factor.score).color }} /></div><p className="mt-1 text-[10px] text-gray-400">{factor.detail}</p></div>))}</div></div><div className="rounded-lg bg-white/5 p-4 text-sm text-blue-50"><p className="mb-2 font-semibold">Explainability summary</p><ul className="space-y-2 text-xs leading-relaxed">{analysisResult.explanation.map((line) => <li key={line}>{line}</li>)}</ul></div><div className="rounded-lg bg-amber-50 p-4 text-slate-800"><div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-xs font-bold text-amber-800">Actionable recommendations</span></div><div className="space-y-3 text-xs leading-relaxed text-amber-900">{analysisResult.recommendations.map((recommendation) => (<div key={recommendation.id} className="rounded-lg bg-white/70 p-3"><p className="font-semibold">{recommendation.title}</p><p className="mt-1">{recommendation.reason}</p><p className="mt-1">{recommendation.action}</p><p className="mt-1 font-semibold">{recommendation.expectedImpact}</p></div>))}</div></div></div>}

        <div className="rounded-xl border border-gray-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-[#0f1e3c]"><BookOpen className="h-4 w-4 text-[#2563eb]" />Saved Drafts</h3><span className="text-xs text-gray-400">{savedDrafts.length} saved</span></div><div className="space-y-3">{savedDrafts.length > 0 ? savedDrafts.slice(0, 4).map((draft) => (<div key={draft.id} className="rounded-xl border border-gray-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#0f1e3c]">{draft.name}</p><p className="text-xs text-gray-500">{draft.evaluation.totalCredits} credits | {draft.courseCodes.length} courses</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDiffLabel(draft.evaluation.totalScore).cls}`}>{draft.evaluation.totalScore}</span></div><div className="mt-3 flex gap-2"><button onClick={() => { loadScheduleDraft(studentId, draft.id); setPlannerError(null); }} className="rounded-lg bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10">Load</button><button onClick={() => deleteScheduleDraft(draft.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" />Remove</button></div></div>)) : <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">Save a draft after analyzing your schedule to revisit it later.</p>}</div></div>
      </div>
    </div>
  );
}


import { useDeferredValue, useState } from 'react';
import {
  FileText,
  Save,
  Search,
} from 'lucide-react';
import { getDiffLabel } from '../../data/courses';
import { useAppData } from '../../context/AppDataContext';

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
} | null;

function getDraftValue(currentValue: string | undefined, fallback: number) {
  return currentValue ?? String(fallback);
}

export default function CourseManagement() {
  const {
    courses,
    updateCourseDifficulty,
  } = useAppData();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [difficultyDrafts, setDifficultyDrafts] = useState<Record<string, string>>({});
  const [savingCourseCode, setSavingCourseCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const filtered = courses.filter((course) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      course.code.toLowerCase().includes(query) ||
      course.name.toLowerCase().includes(query) ||
      course.type.toLowerCase().includes(query)
    );
  });

  const handleDifficultyChange = (courseCode: string, value: string) => {
    setDifficultyDrafts((current) => ({
      ...current,
      [courseCode]: value,
    }));
  };

  const handleSaveDifficulty = async (courseCode: string) => {
    const course = courses.find((item) => item.code === courseCode);
    if (!course) {
      setFeedback({ tone: 'error', message: 'Course was not found.' });
      return;
    }

    const rawValue = getDraftValue(difficultyDrafts[courseCode], course.diffScore).trim();
    const parsedValue = Number(rawValue);
    if (!rawValue || !Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
      setFeedback({ tone: 'error', message: `Enter a valid difficulty from 0 to 100 for ${course.code}.` });
      return;
    }

    setSavingCourseCode(courseCode);
    setFeedback(null);
    const result = await updateCourseDifficulty(courseCode, parsedValue);
    setSavingCourseCode(null);

    if (!result.success) {
      setFeedback({ tone: 'error', message: result.error ?? `Unable to save ${course.code}.` });
      return;
    }

    setDifficultyDrafts((current) => {
      const next = { ...current };
      delete next[courseCode];
      return next;
    });
    setFeedback({ tone: 'success', message: `${course.code} difficulty saved.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by code, name, or type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500">
          Showing {filtered.length} of {courses.length} courses
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          feedback.tone === 'success'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border border-red-200 bg-red-50 text-red-700'
        }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
              <FileText className="h-5 w-5 text-[#2563eb]" />
              Course Catalog
            </h2>
            <p className="mt-1 text-xs text-gray-400">Set and save course difficulty manually. Changes will flow through to student and advisor views.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Course Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3 text-center">Credits</th>
                <th className="px-6 py-3 text-center">Pass Rate</th>
                <th className="px-6 py-3 text-center">Avg Grade</th>
                <th className="px-6 py-3 text-center">Difficulty</th>
                <th className="px-6 py-3 text-center">Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => {
                const draftValue = getDraftValue(difficultyDrafts[course.code], course.diffScore);
                const trimmedValue = draftValue.trim();
                const parsedValue = trimmedValue ? Number(trimmedValue) : Number.NaN;
                const isValid = trimmedValue !== '' && Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 100;
                const previewScore = isValid ? Math.round(parsedValue) : course.diffScore;
                const previewDiff = getDiffLabel(previewScore);
                const hasChanged = trimmedValue !== String(course.diffScore);
                const isSaving = savingCourseCode === course.code;

                return (
                  <tr key={course.code} className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-mono font-semibold text-[#0f1e3c]">{course.code}</td>
                    <td className="px-6 py-3 text-gray-700">{course.name}</td>
                    <td className="px-6 py-3 capitalize text-gray-600">{course.type}</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.credits}</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.passRate}%</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.avgGrade}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={draftValue}
                          onChange={(event) => handleDifficultyChange(course.code, event.target.value)}
                          className={`w-24 rounded-lg border px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 ${
                            hasChanged && !isValid
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                              : 'border-gray-200 focus:border-[#2563eb] focus:ring-[#2563eb]/30'
                          }`}
                        />
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${previewDiff.cls}`}>
                          {previewDiff.label} ({previewScore})
                        </span>
                        {hasChanged && !isValid && (
                          <span className="text-[10px] font-medium text-red-600">Enter 0 to 100</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {hasChanged ? (
                        <button
                          type="button"
                          onClick={() => { void handleSaveDifficulty(course.code); }}
                          disabled={!isValid || isSaving}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Saved</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No courses match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

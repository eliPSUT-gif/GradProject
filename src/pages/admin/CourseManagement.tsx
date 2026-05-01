import { useDeferredValue, useRef, useState, useTransition } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { getDiffLabel } from '../../data/courses';
import { useAppData } from '../../context/AppDataContext';

export default function CourseManagement() {
  const {
    courses,
    importHistoricalData,
    importJobs,
    modelVersion,
    recalculateScores,
  } = useAppData();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = courses.filter((course) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      course.code.toLowerCase().includes(query) ||
      course.name.toLowerCase().includes(query) ||
      course.type.toLowerCase().includes(query)
    );
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const result = importHistoricalData(file.name, text);
    setFeedback(`${result.job.importedRows} row(s) imported from ${file.name}. ${result.job.rejectedRows} rejected.`);
    event.target.value = '';
  };

  const latestJob = importJobs[0] ?? null;

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
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{feedback}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
              <FileText className="h-5 w-5 text-[#2563eb]" />
              Course Catalog
            </h2>
            <p className="mt-1 text-xs text-gray-400">Latest import: {latestJob ? latestJob.fileName : 'N/A'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">Model {modelVersion}</span>
            <button
              type="button"
              onClick={() => startTransition(() => recalculateScores())}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              Recalculate Scores
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Import CSV or JSON
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.json" onChange={handleFileChange} className="hidden" />
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => {
                const diff = getDiffLabel(course.diffScore);
                return (
                  <tr key={course.code} className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-mono font-semibold text-[#0f1e3c]">{course.code}</td>
                    <td className="px-6 py-3 text-gray-700">{course.name}</td>
                    <td className="px-6 py-3 capitalize text-gray-600">{course.type}</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.credits}</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.passRate}%</td>
                    <td className="px-6 py-3 text-center text-gray-700">{course.avgGrade}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${diff.cls}`}>
                        {diff.label} ({course.diffScore})
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
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

import { useDeferredValue, useRef, useState, useTransition } from 'react';
import {
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { getDiffLabel, type Course } from '../../data/courses';
import { useAppData } from '../../context/AppDataContext';

const EMPTY_FORM = {
  code: '',
  name: '',
  department: 'Computer Science',
  type: 'theoretical' as Course['type'],
  credits: 3,
  prerequisites: '',
  passRate: 75,
  failRate: 12,
  avgGrade: 76,
  enrollmentCount: 60,
  withdrawals: 3,
};

export default function CourseManagement() {
  const {
    courses,
    importHistoricalData,
    importJobs,
    modelVersion,
    recalculateScores,
    upsertCourse,
  } = useAppData();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    upsertCourse({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      department: form.department.trim(),
      type: form.type,
      credits: Number(form.credits),
      prerequisites: form.prerequisites
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
      passRate: Number(form.passRate),
      failRate: Number(form.failRate),
      avgGrade: Number(form.avgGrade),
      enrollmentCount: Number(form.enrollmentCount),
      withdrawals: Number(form.withdrawals),
    });
    setFeedback(`Course ${form.code.trim().toUpperCase()} saved successfully.`);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (course: Course) => {
    setForm({
      code: course.code,
      name: course.name,
      department: course.department,
      type: course.type,
      credits: course.credits,
      prerequisites: course.prerequisites.join(', '),
      passRate: course.passRate,
      failRate: course.failRate,
      avgGrade: course.avgGrade,
      enrollmentCount: course.enrollmentCount,
      withdrawals: course.withdrawals,
    });
    setFeedback(`Editing ${course.code}. Save the form to update the course record.`);
  };

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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0f1e3c]">Course Editor</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">Model {modelVersion}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-600">
              Course code
              <input
                required
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Course name
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Department
              <input
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Course type
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as Course['type'] }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              >
                <option value="theoretical">Theoretical</option>
                <option value="practical">Practical</option>
                <option value="hybrid">Hybrid</option>
                <option value="project">Project</option>
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Credits
              <input
                type="number"
                min="1"
                max="6"
                value={form.credits}
                onChange={(event) => setForm((current) => ({ ...current, credits: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Prerequisites
              <input
                value={form.prerequisites}
                onChange={(event) => setForm((current) => ({ ...current, prerequisites: event.target.value }))}
                placeholder="CS211, CS231"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Avg grade
              <input
                type="number"
                min="0"
                max="100"
                value={form.avgGrade}
                onChange={(event) => setForm((current) => ({ ...current, avgGrade: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Pass rate
              <input
                type="number"
                min="0"
                max="100"
                value={form.passRate}
                onChange={(event) => setForm((current) => ({ ...current, passRate: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Fail rate
              <input
                type="number"
                min="0"
                max="100"
                value={form.failRate}
                onChange={(event) => setForm((current) => ({ ...current, failRate: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Enrollment count
              <input
                type="number"
                min="1"
                value={form.enrollmentCount}
                onChange={(event) => setForm((current) => ({ ...current, enrollmentCount: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label className="text-sm text-gray-600">
              Withdrawals
              <input
                type="number"
                min="0"
                value={form.withdrawals}
                onChange={(event) => setForm((current) => ({ ...current, withdrawals: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#0f1e3c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a2d54]">
              <Plus className="h-4 w-4" />
              Save Course
            </button>
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

          {feedback && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{feedback}</div>
          )}
        </form>

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

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
                <FileText className="h-5 w-5 text-[#2563eb]" />
                Course Catalog
              </h2>
              <span className="text-xs text-gray-400">Latest import: {latestJob ? latestJob.fileName : 'N/A'}</span>
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
                    <th className="px-6 py-3 text-center">Action</th>
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
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => handleEdit(course)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
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
      </div>
    </div>
  );
}


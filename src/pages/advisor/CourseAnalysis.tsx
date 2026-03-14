import { useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { COURSE_TRENDS, getDiffLabel } from '../../data/courses';
import { useAppData } from '../../context/AppDataContext';

type Tab = 'all' | 'hard' | 'improving' | 'declining';

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Courses' },
  { key: 'hard', label: 'Hard Courses' },
  { key: 'improving', label: 'Improving' },
  { key: 'declining', label: 'Declining' },
];

function TrendBadge({ code }: { code: string }) {
  const trend = COURSE_TRENDS[code];
  if (!trend) return <span className="text-gray-400">-</span>;

  if (trend.direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <TrendingUp className="h-3.5 w-3.5" />
        Up {trend.label}
      </span>
    );
  }

  if (trend.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <TrendingDown className="h-3.5 w-3.5" />
        Down {trend.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
      <Minus className="h-3.5 w-3.5" />
      Stable
    </span>
  );
}

export default function CourseAnalysis() {
  const { courses, modelCoverage, modelLastCalculatedAt, modelVersion } = useAppData();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'hard':
        return courses.filter((course) => course.diffScore >= 70);
      case 'improving':
        return courses.filter((course) => COURSE_TRENDS[course.code]?.direction === 'down');
      case 'declining':
        return courses.filter((course) => COURSE_TRENDS[course.code]?.direction === 'up');
      default:
        return courses;
    }
  }, [activeTab, courses]);

  const handleDownload = () => {
    const report = filtered.map((course) => ({
      code: course.code,
      name: course.name,
      type: course.type,
      avgGrade: course.avgGrade,
      passRate: course.passRate,
      credits: course.credits,
      difficulty: course.diffScore,
      label: course.difficultyLabel,
      trend: COURSE_TRENDS[course.code]?.label ?? 'Stable',
      modelVersion,
    }));

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `course-difficulty-report-${activeTab}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Model version</p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{modelVersion}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Coverage</p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{modelCoverage}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Last scoring run</p>
          <p className="mt-2 text-sm font-semibold text-[#0f1e3c]">{new Date(modelLastCalculatedAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-[#0f1e3c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
            <BookOpen className="h-5 w-5 text-[#2563eb]" />
            Course Difficulty Overview
          </h2>
          <button
            onClick={handleDownload}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3 pr-4">Course</th>
                <th className="py-3 pr-4">Code</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4 text-center">Avg Grade</th>
                <th className="py-3 pr-4 text-center">Pass Rate</th>
                <th className="py-3 pr-4 text-center">Credits</th>
                <th className="py-3 pr-4 text-center">Difficulty</th>
                <th className="py-3 pr-6 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => {
                const diff = getDiffLabel(course.diffScore);
                return (
                  <tr key={course.code} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-3 pr-4 font-semibold text-[#0f1e3c]">{course.name}</td>
                    <td className="py-3 pr-4 font-mono text-gray-600">{course.code}</td>
                    <td className="py-3 pr-4 capitalize text-gray-600">{course.type}</td>
                    <td className="py-3 pr-4 text-center text-gray-700">{course.avgGrade}%</td>
                    <td className="py-3 pr-4 text-center text-gray-700">{course.passRate}%</td>
                    <td className="py-3 pr-4 text-center text-gray-700">{course.credits}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${diff.cls}`}>
                        {course.diffScore} - {diff.label}
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-center">
                      <TrendBadge code={course.code} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No courses match this filter.
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


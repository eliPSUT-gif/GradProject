import { Download, FileBarChart2, TrendingUp, Users } from 'lucide-react';
import { COURSE_TRENDS } from '../../data/courses';
import { useAppData } from '../../context/AppDataContext';

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { courses, modelCoverage, modelVersion, studentInsights } = useAppData();

  const studentRiskReport = studentInsights.map((student) => ({
    studentId: student.id,
    name: student.name,
    gpa: student.gpa,
    workloadStatus: student.status,
    alertFlag: student.status === 'at-risk',
    riskScore: student.difficulty,
    latestDraft: student.activeDraft?.name ?? null,
  }));

  const courseTrendReport = courses.map((course) => ({
    code: course.code,
    name: course.name,
    avgGrade: course.avgGrade,
    passRate: course.passRate,
    difficulty: course.diffScore,
    trend: COURSE_TRENDS[course.code]?.label ?? 'Stable',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Student reports</p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{studentRiskReport.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Course trend rows</p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{courseTrendReport.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Model coverage</p>
          <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{modelCoverage}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Users className="h-5 w-5 text-[#2563eb]" />
            Student Risk Evaluation Report
          </h2>
          <p className="mb-4 text-sm text-gray-600">Includes student ID, GPA, workload status, alert flag, and the latest saved draft name.</p>
          <button
            onClick={() => downloadJson('student-risk-report.json', studentRiskReport)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <TrendingUp className="h-5 w-5 text-[#2563eb]" />
            Course Difficulty Trends Report
          </h2>
          <p className="mb-4 text-sm text-gray-600">Includes average grade trend indicators, pass-rate summaries, and latest difficulty scores.</p>
          <button
            onClick={() => downloadJson('course-difficulty-trends.json', courseTrendReport)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <FileBarChart2 className="h-5 w-5 text-[#2563eb]" />
          Model Performance Snapshot
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm text-gray-700">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Version</p>
            <p className="mt-2 font-semibold text-[#0f1e3c]">{modelVersion}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coverage</p>
            <p className="mt-2 font-semibold text-[#0f1e3c]">{modelCoverage}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">High-risk schedules</p>
            <p className="mt-2 font-semibold text-[#0f1e3c]">{studentInsights.filter((student) => student.status === 'at-risk').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ClipboardCheck,
  GraduationCap,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  getDiffLabel,
  getStatusLabel,
  getStatusStyle,
} from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const { courses, studentInsights } = useAppData();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const advisees = useMemo(
    () => studentInsights.filter((student) => student.advisorId === user?.id),
    [studentInsights, user?.id]
  );

  const filteredStudents = useMemo(() => {
    return advisees.filter((student) => {
      const query = deferredSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        student.name.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query)
      );
    });
  }, [advisees, deferredSearch]);

  const selectedStudent = filteredStudents[0] ?? advisees[0] ?? null;
  const selectedCourses = selectedStudent?.activeDraft
    ? courses.filter((course) => selectedStudent.activeDraft?.courseCodes.includes(course.code))
    : [];

  const kpis = [
    {
      icon: Users,
      label: 'Students Advised',
      value: String(advisees.length),
      subtitle: 'Active advisees this term',
      accent: '#2563eb',
    },
    {
      icon: AlertTriangle,
      label: 'At-Risk Students',
      value: String(advisees.filter((student) => student.status === 'at-risk').length),
      subtitle: 'Requires intervention',
      accent: '#dc2626',
    },
    {
      icon: GraduationCap,
      label: 'Avg Cohort GPA',
      value: advisees.length > 0 ? (advisees.reduce((sum, student) => sum + student.gpa, 0) / advisees.length).toFixed(2) : '0.00',
      subtitle: 'CS Department',
      accent: '#0d9488',
    },
    {
      icon: ClipboardCheck,
      label: 'Balanced Drafts',
      value: String(advisees.filter((student) => student.latestEvaluation?.riskLabel === 'Balanced').length),
      subtitle: 'Ready for review',
      accent: '#16a34a',
    },
  ];

  const alerts = advisees
    .filter((student) => student.status !== 'good')
    .sort((left, right) => right.difficulty - left.difficulty)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 transition-shadow hover:shadow-md">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ backgroundColor: item.accent }} />
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</span>
              </div>
              <p className="font-display text-3xl font-bold text-[#0f1e3c]">{item.value}</p>
              <p className="mt-1 text-xs text-gray-500">{item.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            At-Risk Alerts
          </h2>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((student) => {
                const Icon = student.status === 'at-risk' ? ShieldAlert : AlertCircle;
                const cardClass = student.status === 'at-risk'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800';

                return (
                  <div key={student.id} className={`flex items-start gap-3 rounded-lg border p-3 ${cardClass}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{student.name}</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {student.difficulty}% difficulty | GPA {student.gpa.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No at-risk advisees are currently flagged.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
              <Users className="h-5 w-5 text-[#2563eb]" />
              Student Roster
            </h2>
            <div className="flex w-full max-w-xl items-center justify-end gap-3">
              <Link to="/app/advisor/messages" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10">
                Open inbox
              </Link>
              <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by student name or ID"
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4 text-center">GPA</th>
                  <th className="pb-2 pr-4 text-center">Credits</th>
                  <th className="pb-2 pr-4 text-center">Difficulty</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const diff = getDiffLabel(student.difficulty);
                  return (
                    <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-[#0f1e3c]">{student.name}</p>
                        <p className="text-[11px] text-gray-400">ID {student.id}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-center font-medium text-[#0f1e3c]">{student.gpa.toFixed(2)}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-600">{student.latestEvaluation?.totalCredits ?? 0}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${diff.cls}`}>
                          {student.difficulty} - {diff.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getStatusStyle(student.status)}`}>
                          {getStatusLabel(student.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedStudent && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-[#0f1e3c]">Student Insight</h2>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-[#0f1e3c]">{selectedStudent.name}</p>
                <p className="text-xs text-gray-500">ID {selectedStudent.id} | GPA {selectedStudent.gpa.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest workload</p>
                <p className="mt-2 font-display text-4xl font-bold text-[#0f1e3c]">{selectedStudent.difficulty}</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDiffLabel(selectedStudent.difficulty).cls}`}>
                  {selectedStudent.latestEvaluation?.riskLabel ?? 'No evaluation'}
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-[#0f1e3c]">Top contributors</p>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {selectedStudent.latestEvaluation?.topCourses.map((course) => (
                    <li key={course}>{course}</li>
                  )) ?? <li>No courses in active draft.</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-[#0f1e3c]">Advisor-ready recommendations</p>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {selectedStudent.latestEvaluation?.recommendations.map((recommendation) => (
                    <li key={recommendation.id}>{recommendation.title}: {recommendation.action}</li>
                  )) ?? <li>No recommendations available.</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-[#0f1e3c]">Active Schedule</h2>
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
                    const diff = getDiffLabel(course.diffScore);
                    return (
                      <tr key={course.code} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-4 font-mono font-semibold text-[#0f1e3c]">{course.code}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{course.name}</td>
                        <td className="py-2.5 pr-4 capitalize text-gray-600">{course.type}</td>
                        <td className="py-2.5 pr-4 text-center text-gray-600">{course.credits}</td>
                        <td className="py-2.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diff.cls}`}>
                            {course.diffScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedCourses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                        No active schedule has been saved yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

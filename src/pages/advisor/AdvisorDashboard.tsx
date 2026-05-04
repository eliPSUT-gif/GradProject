import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  getDiffLabel,
  getRiskStatus,
  getStatusLabel,
  getStatusStyle,
} from '../../data/courses';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAppDataReady, plannerReviewSnapshots, studentInsights } = useAppData();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const advisees = useMemo(
    () =>
      studentInsights
        .filter((student) => student.advisorId === user?.id)
        .map((student) => {
          const latestReview = plannerReviewSnapshots[student.id] ?? student.latestEvaluation;
          const difficulty = latestReview?.totalScore ?? student.difficulty;

          return {
            ...student,
            difficulty,
            latestEvaluation: latestReview,
            status: getRiskStatus(difficulty, student.gpa),
          };
        }),
    [plannerReviewSnapshots, studentInsights, user?.id]
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
  ];

  const alerts = advisees
    .filter((student) => student.status !== 'good')
    .sort((left, right) => right.difficulty - left.difficulty)
    .slice(0, 4);

  const openStudentPage = (studentId: string) => {
    navigate(`/app/advisor/student/${studentId}`);
  };

  const messageStudent = (studentId: string) => {
    navigate('/app/advisor/messages', { state: { focusUserId: studentId, scrollToBottom: true } });
  };

  if (!isAppDataReady) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading advisee data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-3 transition-shadow hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ backgroundColor: item.accent }} />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="min-w-0 rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{student.name}</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {student.difficulty}% difficulty | GPA {student.gpa.toFixed(2)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => openStudentPage(student.id)}
                          className="rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white"
                        >
                          View details
                        </button>
                        <button
                          onClick={() => messageStudent(student.id)}
                          className="rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white"
                        >
                          Message student
                        </button>
                      </div>
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

        <div className="min-w-0 rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
              <Users className="h-5 w-5 text-[#2563eb]" />
              Student Roster
            </h2>
            <div className="flex w-full flex-wrap items-center justify-end gap-3">
              <Link to="/app/advisor/messages" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10">
                Open inbox
              </Link>
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
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
                  <th className="pb-2 pr-4 text-center">Status</th>
                  <th className="pb-2 text-right">Actions</th>
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
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openStudentPage(student.id)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-colors hover:border-[#2563eb]/30 hover:bg-[#2563eb]/5"
                          >
                            View details
                          </button>
                          <button
                            onClick={() => messageStudent(student.id)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                          >
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

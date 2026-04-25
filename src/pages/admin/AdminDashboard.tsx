import {
  ClipboardList,
  Clock,
  GraduationCap,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { formatTermLabel } from '../../data/courses';

export default function AdminDashboard() {
  const { users } = useAuth();
  const {
    getStudentDrafts,
    getStudentTranscriptSemesters,
    studentInsights,
    transcriptRows,
  } = useAppData();

  const currentYear = new Date().getFullYear();
  const studentsCreatedThisYear = users.filter((account) => account.role === 'student' && account.id.startsWith(String(currentYear))).length;
  const activeAdvisors = users.filter((account) => account.role === 'advisor' && account.status === 'active');
  const studentsWithoutAdvisor = studentInsights.filter((student) => !student.advisorId).length;
  const inProgressRows = transcriptRows.filter((row) => row.status === 'in_progress');
  const pendingDrafts = studentInsights.flatMap((student) => {
    const transcriptTerms = new Set(getStudentTranscriptSemesters(student.id).map((semester) => semester.termCode));
    return getStudentDrafts(student.id)
      .filter((draft) => !transcriptTerms.has(draft.termCode))
      .map((draft) => ({ student, draft }));
  });

  const kpis = [
    {
      icon: UserPlus,
      label: `Students Created ${currentYear}`,
      value: String(studentsCreatedThisYear),
      subtitle: 'Generated registrar IDs',
      accent: '#2563eb',
    },
    {
      icon: UserCheck,
      label: 'Active Advisors',
      value: String(activeAdvisors.length),
      subtitle: 'Available for assignment',
      accent: '#0d9488',
    },
    {
      icon: ClipboardList,
      label: 'Pending Sheets',
      value: String(pendingDrafts.length),
      subtitle: 'Saved plans not yet converted',
      accent: '#f59e0b',
    },
    {
      icon: GraduationCap,
      label: 'Open Mark Rows',
      value: String(inProgressRows.length),
      subtitle: 'Waiting for end-of-term marks',
      accent: '#16a34a',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md sm:p-5">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <ClipboardList className="h-5 w-5 text-[#2563eb]" />
              Semester Marks Queue
            </h2>
            <Link to="/app/admin/students" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
              Open marks
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {pendingDrafts.slice(0, 6).map(({ student, draft }) => (
              <li key={draft.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-[#0f1e3c]">{student.name}</p>
                  <p className="text-xs text-gray-500">{formatTermLabel(draft.termCode)} | {draft.courseCodes.length} selected courses</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs sheet</span>
              </li>
            ))}
            {pendingDrafts.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500">No saved course plans are waiting for transcript sheets.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
            <Users className="h-5 w-5 text-[#2563eb]" />
            Advisor Assignment Panel
          </h2>
          <div className="space-y-3">
            {activeAdvisors.map((advisor) => {
              const load = studentInsights.filter((student) => student.advisorId === advisor.id).length;
              return (
                <div key={advisor.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#0f1e3c]">{advisor.name}</p>
                      <p className="text-xs text-gray-500">{advisor.id}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{load} students</span>
                  </div>
                </div>
              );
            })}
            {studentsWithoutAdvisor > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {studentsWithoutAdvisor} student{studentsWithoutAdvisor === 1 ? '' : 's'} still need advisor assignment.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
          <Clock className="h-5 w-5 text-[#2563eb]" />
          In-Progress Transcript Rows
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {inProgressRows.slice(0, 9).map((row) => {
            const student = studentInsights.find((item) => item.id === row.studentId);
            return (
              <div key={row.id ?? `${row.studentId}-${row.termCode}-${row.courseCode}`} className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-[#0f1e3c]">{student?.name ?? row.studentId}</p>
                <p className="mt-1 text-sm text-gray-500">{row.courseCode} | {formatTermLabel(row.termCode)}</p>
              </div>
            );
          })}
          {inProgressRows.length === 0 && (
            <p className="text-sm text-gray-500">No in-progress transcript rows are waiting for marks.</p>
          )}
        </div>
      </div>
    </div>
  );
}

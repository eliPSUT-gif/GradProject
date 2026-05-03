import { useMemo, useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  Inbox,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminDashboard() {
  const { users } = useAuth();
  const {
    getStudentDrafts,
    getStudentTranscriptSemesters,
    passwordResetInquiries,
    resolvePasswordResetInquiry,
    studentInsights,
  } = useAppData();
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState<string | null>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const students = useMemo(
    () => users.filter((account) => account.role === 'student'),
    [users]
  );
  const activeAdvisors = useMemo(
    () => users.filter((account) => account.role === 'advisor' && account.status === 'active'),
    [users]
  );
  const insightById = useMemo(
    () => new Map(studentInsights.map((student) => [student.id, student])),
    [studentInsights]
  );
  const pendingPlans = useMemo(
    () => studentInsights.flatMap((student) => {
      const transcriptTerms = new Set(getStudentTranscriptSemesters(student.id).map((semester) => semester.termCode));
      return getStudentDrafts(student.id).filter((draft) => !transcriptTerms.has(draft.termCode));
    }),
    [getStudentDrafts, getStudentTranscriptSemesters, studentInsights]
  );
  const selectedAdvisor = activeAdvisors.find((advisor) => advisor.id === selectedAdvisorId) ?? null;
  const selectedAdvisorStudents = selectedAdvisor
    ? students.filter((student) => insightById.get(student.id)?.advisorId === selectedAdvisor.id)
    : [];
  const sortedInquiries = [...passwordResetInquiries].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'open' ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
  const openInquiryCount = passwordResetInquiries.filter((inquiry) => inquiry.status === 'open').length;

  const kpis = [
    {
      icon: GraduationCap,
      label: 'Total Students',
      value: String(students.length),
      subtitle: 'Managed student accounts',
      accent: '#2563eb',
    },
    {
      icon: UserCheck,
      label: 'Total Advisors',
      value: String(activeAdvisors.length),
      subtitle: 'Active advisor accounts',
      accent: '#0d9488',
    },
    {
      icon: ClipboardList,
      label: 'Number of Pending Plans',
      value: String(pendingPlans.length),
      subtitle: 'Saved plans not yet converted',
      accent: '#f59e0b',
    },
  ];

  const handleResolveInquiry = async (inquiryId: string) => {
    setInquiryMessage(null);
    setInquiryError(null);
    const result = await resolvePasswordResetInquiry(inquiryId);
    if (!result.success) {
      setInquiryError(result.error ?? 'Unable to resolve inquiry.');
      return;
    }

    setInquiryMessage('Password inquiry marked as resolved.');
  };

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <GraduationCap className="h-5 w-5 text-[#2563eb]" />
              Students
            </h2>
            <Link to="/app/admin/students" className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
              View all
            </Link>
          </div>
          <div className="max-h-[360px] overflow-y-auto pr-1">
            <ul className="divide-y divide-gray-100">
              {students.map((student) => {
                const insight = insightById.get(student.id);
                return (
                  <li key={student.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-[#0f1e3c]">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        GPA {insight ? insight.gpa.toFixed(2) : '-'}
                      </span>
                      <Link
                        to={`/app/admin/students/${student.id}/transcript`}
                        className="rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10"
                      >
                        View marks
                      </Link>
                    </div>
                  </li>
                );
              })}
              {students.length === 0 && (
                <li className="py-6 text-center text-sm text-gray-500">No student accounts are available yet.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
            <Users className="h-5 w-5 text-[#2563eb]" />
            Advisors
          </h2>
          <div className="space-y-3">
            {activeAdvisors.map((advisor) => {
              const adviseeCount = students.filter((student) => insightById.get(student.id)?.advisorId === advisor.id).length;
              return (
                <button
                  key={advisor.id}
                  type="button"
                  onClick={() => setSelectedAdvisorId(advisor.id)}
                  className="w-full rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-[#2563eb]/40 hover:bg-[#2563eb]/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#0f1e3c]">{advisor.name}</p>
                      <p className="text-xs text-gray-500">{advisor.id}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {adviseeCount} student{adviseeCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              );
            })}
            {activeAdvisors.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No active advisors are available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:text-lg">
              <Inbox className="h-5 w-5 text-[#2563eb]" />
              Password Inquiries
            </h2>
            <p className="mt-1 text-sm text-gray-500">{openInquiryCount} open request{openInquiryCount === 1 ? '' : 's'} waiting for admin review.</p>
          </div>
          <Link to="/app/admin/users" className="rounded-full border border-[#2563eb]/20 bg-[#2563eb]/5 px-4 py-2 text-sm font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10">
            Open User Management
          </Link>
        </div>

        {inquiryError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{inquiryError}</div>}
        {inquiryMessage && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{inquiryMessage}</div>}

        <div className="space-y-3">
          {sortedInquiries.slice(0, 8).map((inquiry) => (
            <div key={inquiry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#0f1e3c]">{inquiry.requesterName}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{inquiry.requesterRole}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    inquiry.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {inquiry.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {inquiry.requesterId} | Sent {formatDateTime(inquiry.createdAt)}
                </p>
              </div>
              {inquiry.status === 'open' ? (
                <button
                  type="button"
                  onClick={() => { void handleResolveInquiry(inquiry.id); }}
                  className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
                >
                  Mark resolved
                </button>
              ) : (
                <span className="text-xs font-medium text-gray-500">
                  Resolved {inquiry.resolvedAt ? formatDateTime(inquiry.resolvedAt) : ''}
                </span>
              )}
            </div>
          ))}
          {sortedInquiries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No password inquiries have been submitted yet.
            </div>
          )}
        </div>
      </section>

      {selectedAdvisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e3c]/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-navy/20">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f1e3c]">{selectedAdvisor.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedAdvisor.id} | Assigned students</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdvisorId(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close advisor students modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {selectedAdvisorStudents.map((student) => {
                  const insight = insightById.get(student.id);
                  return (
                    <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                      <div>
                        <p className="font-semibold text-[#0f1e3c]">{student.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{student.id} | GPA {insight ? insight.gpa.toFixed(2) : '-'}</p>
                      </div>
                      <Link
                        to={`/app/admin/students/${student.id}/transcript`}
                        onClick={() => setSelectedAdvisorId(null)}
                        className="rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10"
                      >
                        View marks
                      </Link>
                    </div>
                  );
                })}
                {selectedAdvisorStudents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    This advisor does not have assigned students yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

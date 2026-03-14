import { BookOpen, GraduationCap, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export default function ProfilePage() {
  const { user, users } = useAuth();
  const { getStudentDrafts, studentInsights } = useAppData();

  const account = users.find((item) => item.id === user?.id);
  const insight = studentInsights.find((item) => item.id === user?.id);
  const advisor = users.find((item) => item.id === insight?.advisorId);
  const drafts = getStudentDrafts(user?.id ?? '');

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-[#2563eb] sm:h-14 sm:w-14 sm:text-lg">
            {user?.initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f1e3c] sm:text-xl">{user?.name}</h2>
            <p className="text-xs text-gray-500 sm:text-sm">{user?.subtitle}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student ID</p>
            <p className="mt-2 font-semibold text-[#0f1e3c]">{user?.id}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-[#0f1e3c]">Account status</p>
            <p className="mt-1 text-gray-600">{account?.status === 'active' ? 'Active and allowed to access student planning tools.' : 'Inactive'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-[#0f1e3c]">Assigned advisor</p>
            <p className="mt-1 text-gray-600">{advisor ? `${advisor.name} (${advisor.id})` : 'Not assigned'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-gray-400 sm:gap-2">
              <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]">GPA</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#0f1e3c] sm:mt-3 sm:text-3xl">{insight?.gpa.toFixed(2) ?? '0.00'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-gray-400 sm:gap-2">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]">Drafts</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#0f1e3c] sm:mt-3 sm:text-3xl">{drafts.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-gray-400 sm:gap-2">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]">Risk</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#0f1e3c] sm:mt-3 sm:text-3xl">{insight?.difficulty ?? 0}</p>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#0f1e3c] sm:mb-4 sm:text-lg">
            <UserCircle2 className="h-5 w-5 text-[#2563eb]" />
            Academic Profile
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-gray-700">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</p>
              <p className="mt-2 font-semibold text-[#0f1e3c]">{insight?.department ?? 'Computer Science'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed credits</p>
              <p className="mt-2 font-semibold text-[#0f1e3c]">{insight?.creditsCompleted ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





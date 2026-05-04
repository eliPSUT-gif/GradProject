import { Lock, Settings2 } from 'lucide-react';
import AccountSecurityPanel from '../../components/AccountSecurityPanel';

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Settings2 className="h-5 w-5 text-[#2563eb]" />
          Admin Configuration Notes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-gray-700">
          <div className="rounded-xl bg-slate-50 p-4">Historical imports support CSV and JSON uploads with row-level validation.</div>
          <div className="rounded-xl bg-slate-50 p-4">Course difficulty scores are recalculated deterministically with stored model version metadata.</div>
          <div className="rounded-xl bg-slate-50 p-4">Role-based access control is enforced for student, advisor, and admin dashboards.</div>
          <div className="rounded-xl bg-slate-50 p-4">Saved schedule drafts retain evaluation snapshots for advisor review and reporting.</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Lock className="h-5 w-5 text-[#2563eb]" />
          Security Defaults
        </h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="rounded-xl border border-gray-200 p-4">Accounts are temporarily restricted after repeated failed login attempts.</li>
          <li className="rounded-xl border border-gray-200 p-4">Passwords are never displayed in plain text in the UI.</li>
          <li className="rounded-xl border border-gray-200 p-4">Admin-only actions remain isolated behind role checks.</li>
        </ul>
      </div>

      <AccountSecurityPanel />
    </div>
  );
}

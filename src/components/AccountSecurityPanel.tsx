import { useState } from 'react';
import { LockKeyhole, ShieldAlert } from 'lucide-react';
import PasswordInput from './PasswordInput';
import { useAuth } from '../context/AuthContext';

export default function AccountSecurityPanel() {
  const { changePassword, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (nextPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(user?.id ?? '', currentPassword, nextPassword);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Unable to update password.');
      return;
    }

    setMessage('Password updated successfully.');
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <ShieldAlert className="h-5 w-5 text-[#2563eb]" />
          Security Policy
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-xl bg-slate-50 p-4">Accounts are temporarily locked after 3 failed login attempts.</div>
          <div className="rounded-xl bg-slate-50 p-4">Passwords must be at least 10 characters and include uppercase, lowercase, a number, and a special character.</div>
          <div className="rounded-xl bg-slate-50 p-4">Password changes require the current password before a new one is saved.</div>
          <div className="rounded-xl bg-slate-50 p-4">Role-based access is enforced for student, advisor, and admin routes.</div>
        </div>
      </div>

      <form onSubmit={(event) => { void handleSubmit(event); }} className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <LockKeyhole className="h-5 w-5 text-[#2563eb]" />
          Change Password
        </h2>
        <div className="space-y-4">
          <label className="block text-sm text-gray-600">
            Current password
            <PasswordInput
              buttonLabel="current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              wrapperClassName="mt-1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
          <label className="block text-sm text-gray-600">
            New password
            <PasswordInput
              buttonLabel="new password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              wrapperClassName="mt-1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Confirm new password
            <PasswordInput
              buttonLabel="password confirmation"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              wrapperClassName="mt-1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

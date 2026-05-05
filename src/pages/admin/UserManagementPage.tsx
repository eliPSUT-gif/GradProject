import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Trash2, UserPlus, Users } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth, type UserFormInput } from '../../context/AuthContext';
import type { ManagedUser, Role } from '../../data/courses';

const EMPTY_FORM: UserFormInput = {
  id: '',
  name: '',
  role: 'student',
  subtitle: '',
  password: '',
  status: 'active',
};

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMBERS = '23456789';
const SPECIALS = '!@#$%^&*';
const PASSWORD_CHARS = `${LOWERCASE}${UPPERCASE}${NUMBERS}${SPECIALS}`;

function getRandomIndex(max: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function shuffleCharacters(characters: string[]) {
  const next = [...characters];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next.join('');
}

function generateCompliantPassword() {
  const characters = [
    LOWERCASE[getRandomIndex(LOWERCASE.length)],
    UPPERCASE[getRandomIndex(UPPERCASE.length)],
    NUMBERS[getRandomIndex(NUMBERS.length)],
    SPECIALS[getRandomIndex(SPECIALS.length)],
  ];

  while (characters.length < 14) {
    characters.push(PASSWORD_CHARS[getRandomIndex(PASSWORD_CHARS.length)]);
  }

  return shuffleCharacters(characters);
}

function getNumericSuffix(id: string, prefix: string) {
  const match = id.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
  return match ? Number(match[1]) : null;
}

function generateNextUserId(role: Role, users: ManagedUser[], now = new Date()) {
  if (role === 'student') {
    const year = String(now.getFullYear());
    const maxSequence = users.reduce((max, user) => {
      const match = user.id.match(new RegExp(`^${year}(\\d{4})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `${year}${String(maxSequence + 1).padStart(4, '0')}`;
  }

  const prefix = role === 'advisor' ? 'ADV' : 'ADM';
  const maxSuffix = users.reduce((max, user) => {
    const suffix = getNumericSuffix(user.id, prefix);
    return suffix === null ? max : Math.max(max, suffix);
  }, 1000);

  return `${prefix}-${maxSuffix + 1}`;
}

function getDefaultSubtitle(role: Role) {
  if (role === 'student') return 'Student | Computer Science';
  if (role === 'advisor') return 'Academic Advisor | CS Department';
  return 'System Administrator';
}

export default function UserManagementPage() {
  const { deleteUser, resetUserPassword, updateUserStatus, upsertUser, users } = useAuth();
  const { createStudentAccount } = useAppData();
  const [form, setForm] = useState<UserFormInput>(EMPTY_FORM);
  const [resettingUserIds, setResettingUserIds] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordToast, setPasswordToast] = useState<string | null>(null);
  const [advisorId, setAdvisorId] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const advisors = useMemo(
    () => users.filter((account) => account.role === 'advisor' && account.status === 'active'),
    [users]
  );
  const isStudentForm = form.role === 'student';
  const generatedUserId = useMemo(
    () => generateNextUserId(form.role, users),
    [form.role, users]
  );

  useEffect(() => {
    if (!passwordToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPasswordToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [passwordToast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const generatedPassword = generateCompliantPassword();
    const nextUserId = generatedUserId;
    const existingUser = users.find((account) => account.id === nextUserId);
    if (existingUser) {
      setError('A user with this generated ID already exists. Refresh the page and try again.');
      return;
    }

    if (isStudentForm) {
      if (!advisorId) {
        setError('Select an assigned advisor before creating a student.');
        return;
      }

      const result = await createStudentAccount({
        id: nextUserId,
        name: form.name,
        enrollmentYear: new Date().getFullYear(),
        admissionTerm: 'fall',
        department: 'Computer Science',
        advisorId,
        temporaryPassword: generatedPassword,
      });
      if (!result.success) {
        setError(result.error ?? 'Unable to create student.');
        return;
      }

      setMessage(
        result.warning
          ? `Student ${result.studentId ?? nextUserId} created. ${result.warning}`
          : `Student ${result.studentId ?? nextUserId} created successfully and password email sent.`
      );
      setForm(EMPTY_FORM);
      setAdvisorId('');
      return;
    }

    const result = await upsertUser({
      ...form,
      id: nextUserId,
      subtitle: getDefaultSubtitle(form.role),
      password: generatedPassword,
    });
    if (!result.success) {
      setError(result.error ?? 'Unable to save user.');
      return;
    }

    setMessage(
      result.warning
        ? `User ${nextUserId} created. ${result.warning}`
        : `User ${nextUserId} created successfully and password email sent.`
    );
    setForm(EMPTY_FORM);
    setAdvisorId('');
  };

  const handleGeneratePasswordReset = async (userId: string) => {
    setMessage(null);
    setError(null);
    setResettingUserIds((current) => ({ ...current, [userId]: true }));
    const nextPassword = generateCompliantPassword();

    const result = await resetUserPassword(userId, nextPassword);
    setResettingUserIds((current) => ({ ...current, [userId]: false }));
    if (!result.success) {
      setError(result.error ?? 'Unable to update password.');
      return;
    }

    setPasswordToast(result.warning ? `Password updated. ${result.warning}` : 'Password updated and email sent.');
  };

  const handleConfirmDelete = (userId: string) => {
    deleteUser(userId);
    setDeleteConfirmId(null);
    setMessage(`User ${userId} has been deleted.`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
      {passwordToast && (
        <div className="fixed bottom-4 right-4 z-[80] rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 shadow-xl shadow-emerald-900/10">
          {passwordToast}
        </div>
      )}
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <UserPlus className="h-5 w-5 text-[#2563eb]" />
          Add New User
        </h2>
        <div className="space-y-4 text-sm text-gray-700">
          <label className="block">
            Generated user ID
            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[#0f1e3c]">
              {generatedUserId}
            </div>
          </label>
          <label className="block">
            Full name
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
          <label className="block">
            Role
            <select
              value={form.role}
              onChange={(event) => {
                const role = event.target.value as Role;
                setForm((current) => ({
                  ...current,
                  role,
                }));
                if (role !== 'student') {
                  setAdvisorId('');
                }
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            >
              <option value="student">Student</option>
              <option value="advisor">Advisor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {isStudentForm && (
            <label className="block">
              Assigned advisor
              <select
                required
                value={advisorId}
                onChange={(event) => setAdvisorId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              >
                <option value="" disabled>Select an advisor</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <button type="submit" className="mt-5 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
          Create user
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Users className="h-5 w-5 text-[#2563eb]" />
          Managed Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Password</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4">
                    <p className="font-semibold text-[#0f1e3c]">{account.name}</p>
                    <p className="text-xs text-gray-400">{account.id}</p>
                  </td>
                  <td className="py-2.5 pr-4 capitalize text-gray-600">{account.role}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${account.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={Boolean(resettingUserIds[account.id])}
                        onClick={() => void handleGeneratePasswordReset(account.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {resettingUserIds[account.id] ? 'Resetting...' : 'Generate reset'}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateUserStatus(account.id, account.status === 'active' ? 'inactive' : 'active')}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        {account.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(account.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0f1e3c]">Delete User</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{users.find((u) => u.id === deleteConfirmId)?.name ?? deleteConfirmId}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Save, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import PasswordInput from '../../components/PasswordInput';
import { useAppData } from '../../context/AppDataContext';
import { useAuth, type UserFormInput } from '../../context/AuthContext';
import type { AdmissionTerm, Role } from '../../data/courses';

const EMPTY_FORM: UserFormInput = {
  id: '',
  name: '',
  role: 'student',
  subtitle: 'Student | Computer Science',
  password: 'ChangeMe@123',
  status: 'active',
};

export default function UserManagementPage() {
  const { deleteUser, resetUserPassword, updateUserStatus, upsertUser, users } = useAuth();
  const { courses, createStudentAccount } = useAppData();
  const [form, setForm] = useState<UserFormInput>(EMPTY_FORM);
  const [editPasswords, setEditPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear());
  const [admissionTerm, setAdmissionTerm] = useState<AdmissionTerm>('fall');
  const [department, setDepartment] = useState('Computer Science');
  const [advisorId, setAdvisorId] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const knownDepartments = [...new Set(courses.map((course) => course.department))].sort();
    return knownDepartments.length > 0 ? knownDepartments : ['Computer Science'];
  }, [courses]);
  const advisors = useMemo(
    () => users.filter((account) => account.role === 'advisor' && account.status === 'active'),
    [users]
  );
  const isStudentForm = form.role === 'student';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const existingUser = users.find((account) => account.id === form.id);
    if (existingUser) {
      setError('A user with this ID already exists.');
      return;
    }

    if (isStudentForm) {
      const result = await createStudentAccount({
        id: form.id,
        name: form.name,
        enrollmentYear,
        admissionTerm,
        department,
        advisorId,
        temporaryPassword: form.password,
      });
      if (!result.success) {
        setError(result.error ?? 'Unable to create student.');
        return;
      }

      setMessage(`Student ${result.studentId ?? form.id} created successfully.`);
      setForm(EMPTY_FORM);
      return;
    }

    const result = upsertUser(form);
    if (!result.success) {
      setError(result.error ?? 'Unable to save user.');
      return;
    }

    setMessage(`User ${form.id} created successfully.`);
    setForm(EMPTY_FORM);
  };

  const handleSavePassword = async (userId: string) => {
    setMessage(null);
    setError(null);
    const nextPassword = editPasswords[userId];
    if (!nextPassword) return;

    const result = await resetUserPassword(userId, nextPassword);
    if (!result.success) {
      setError(result.error ?? 'Unable to update password.');
      return;
    }

    setEditPasswords((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setMessage(`Password updated for ${userId}.`);
  };

  const handleConfirmDelete = (userId: string) => {
    deleteUser(userId);
    setDeleteConfirmId(null);
    setMessage(`User ${userId} has been deleted.`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <UserPlus className="h-5 w-5 text-[#2563eb]" />
          Add New User
        </h2>
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-blue-600" />
            <p>Passwords must be at least 10 characters and include uppercase, lowercase, a number, and a special character.</p>
          </div>
        </div>
        <div className="space-y-4 text-sm text-gray-700">
          <label className="block">
            User ID
            <input
              required
              value={form.id}
              onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
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
                  subtitle: role === 'student' ? `Student | ${department}` : current.subtitle,
                }));
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            >
              <option value="student">Student</option>
              <option value="advisor">Advisor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="block">
            Subtitle
            <input
              value={form.subtitle}
              onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
          <label className="block">
            Temporary password
            <PasswordInput
              buttonLabel="temporary password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              wrapperClassName="mt-1"
              className="w-full rounded-lg border border-gray-200 py-2 pl-3 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            />
          </label>
          {isStudentForm && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-2">
              <label className="block">
                Enrollment year
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={enrollmentYear}
                  onChange={(event) => setEnrollmentYear(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                />
              </label>
              <label className="block">
                Admission semester
                <select
                  value={admissionTerm}
                  onChange={(event) => setAdmissionTerm(event.target.value as AdmissionTerm)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 capitalize focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                >
                  <option value="fall">Fall</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                </select>
              </label>
              <label className="block">
                Department
                <select
                  value={department}
                  onChange={(event) => {
                    const nextDepartment = event.target.value;
                    setDepartment(nextDepartment);
                    setForm((current) => ({ ...current, subtitle: `Student | ${nextDepartment}` }));
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                >
                  {departments.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                Assigned advisor
                <select
                  value={advisorId}
                  onChange={(event) => setAdvisorId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                >
                  <option value="">No advisor selected</option>
                  {advisors.map((advisor) => (
                    <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
                  ))}
                </select>
              </label>
            </div>
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
                      <PasswordInput
                        buttonLabel="password"
                        value={editPasswords[account.id] ?? account.password}
                        onChange={(event) => setEditPasswords((current) => ({ ...current, [account.id]: event.target.value }))}
                        wrapperClassName="w-48"
                        className="w-full rounded-lg border border-gray-200 py-1.5 pl-3 text-xs focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                      />
                      {editPasswords[account.id] !== undefined && editPasswords[account.id] !== account.password && (
                        <button
                          onClick={() => void handleSavePassword(account.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </button>
                      )}
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

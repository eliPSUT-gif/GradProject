import { useDeferredValue, useMemo, useState } from 'react';
import { Eye, EyeOff, GraduationCap, Search, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import type { AdmissionTerm } from '../../data/courses';

const DEFAULT_PASSWORD = 'ChangeMe@123';

function getNextStudentId(existingIds: string[], enrollmentYear: number) {
  const prefix = String(enrollmentYear);
  const maxSequence = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
}

export default function AdminStudentsPage() {
  const { users } = useAuth();
  const {
    courses,
    createStudentAccount,
    isAppDataReady,
    studentInsights,
  } = useAppData();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [fullName, setFullName] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear());
  const [admissionSemester, setAdmissionSemester] = useState<AdmissionTerm>('fall');
  const [department, setDepartment] = useState('Computer Science');
  const [advisorId, setAdvisorId] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState(DEFAULT_PASSWORD);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const students = useMemo(
    () => users.filter((account) => account.role === 'student'),
    [users]
  );
  const advisors = useMemo(
    () => users.filter((account) => account.role === 'advisor' && account.status === 'active'),
    [users]
  );
  const departments = useMemo(() => {
    const knownDepartments = [...new Set(courses.map((course) => course.department))].sort();
    return knownDepartments.length > 0 ? knownDepartments : ['Computer Science'];
  }, [courses]);
  const insightById = useMemo(
    () => new Map(studentInsights.map((student) => [student.id, student])),
    [studentInsights]
  );
  const nextStudentId = useMemo(
    () => getNextStudentId(students.map((student) => student.id), enrollmentYear),
    [enrollmentYear, students]
  );

  const filteredStudents = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) => (
      student.name.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query)
    ));
  }, [deferredSearch, students]);

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createStudentAccount({
      id: nextStudentId,
      name: fullName.trim(),
      enrollmentYear,
      admissionTerm: admissionSemester,
      department,
      advisorId,
      temporaryPassword,
    });
    if (!result.success) {
      setError(result.error ?? 'Unable to create student.');
      return;
    }

    setMessage(`Created student account ${result.studentId ?? nextStudentId}.`);
    setFullName('');
    setTemporaryPassword(DEFAULT_PASSWORD);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
        <form onSubmit={handleCreateStudent} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <UserPlus className="h-5 w-5 text-[#2563eb]" />
            Create Student Account
          </h2>

          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#1d4ed8]">
            Next generated ID: <span className="font-mono">{nextStudentId}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="md:col-span-2">
              Full name
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              />
            </label>
            <label>
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
            <label>
              Admission semester
              <select
                value={admissionSemester}
                onChange={(event) => setAdmissionSemester(event.target.value as AdmissionTerm)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 capitalize focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              >
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
              </select>
            </label>
            <label>
              Department
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
              >
                {departments.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
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
            <label className="md:col-span-2">
              Temporary password
              <div className="relative mt-1">
                <input
                  type={showTemporaryPassword ? 'text' : 'password'}
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-11 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowTemporaryPassword((current) => !current)}
                  className="absolute right-2 top-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#2563eb]"
                  aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                  title={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                >
                  {showTemporaryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <button type="submit" className="mt-5 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
            Create student
          </button>
        </form>

        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
              <GraduationCap className="h-5 w-5 text-[#2563eb]" />
              Students
            </h2>
            <div className="relative w-full sm:max-w-sm">
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

          {!isAppDataReady ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Loading students...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-2 pr-4">Student</th>
                    <th className="pb-2 pr-4">Advisor</th>
                    <th className="pb-2 pr-4 text-center">GPA</th>
                    <th className="pb-2 pr-4 text-center">Credits</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const insight = insightById.get(student.id);
                    const advisor = insight?.advisorId ? users.find((account) => account.id === insight.advisorId) : null;
                    return (
                      <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                        <td className="py-2.5 pr-4">
                          <p className="font-semibold text-[#0f1e3c]">{student.name}</p>
                          <p className="text-xs text-gray-400">{student.id}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">{advisor?.name ?? 'Unassigned'}</td>
                        <td className="py-2.5 pr-4 text-center font-semibold text-[#0f1e3c]">{insight ? insight.gpa.toFixed(2) : '-'}</td>
                        <td className="py-2.5 pr-4 text-center text-gray-600">{insight?.creditsCompleted ?? '-'}</td>
                        <td className="py-2.5 text-right">
                          <Link
                            to={`/app/admin/students/${student.id}/transcript`}
                            className="inline-flex items-center justify-center rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10"
                          >
                            View transcript
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        No students match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

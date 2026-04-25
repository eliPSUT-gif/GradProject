import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  KeyRound,
  PlusCircle,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  useAppData,
  type StudentTranscriptRow,
  type TranscriptEntryInput,
} from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  formatTermLabel,
  getCreditLimitForTermCode,
  type AdmissionTerm,
} from '../../data/courses';

const DEFAULT_PASSWORD = 'ChangeMe@123';
const STATUS_OPTIONS: TranscriptEntryInput['status'][] = ['in_progress', 'passed', 'failed', 'withdrawn'];

function generateStudentId(year: number, existingIds: string[]) {
  const prefix = String(year);
  const highestSequence = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
}

function statusLabel(status: TranscriptEntryInput['status']) {
  return status.replace('_', ' ');
}

export default function AdminStudentsPage() {
  const { resetUserPassword, users } = useAuth();
  const {
    assignAdvisor,
    courses,
    createStudentAccount,
    createTranscriptFromDraft,
    deleteTranscriptEntry,
    getStudentAvailableTerms,
    getStudentDrafts,
    getStudentTranscriptSemesters,
    studentInsights,
    transcriptRows,
    upsertTranscriptEntry,
  } = useAppData();

  const advisors = users.filter((account) => account.role === 'advisor');
  const students = studentInsights;
  const departments = useMemo(() => [...new Set(courses.map((course) => course.department))].sort(), [courses]);
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear());
  const [studentName, setStudentName] = useState('');
  const [admissionTerm, setAdmissionTerm] = useState<AdmissionTerm>('fall');
  const [department, setDepartment] = useState('Computer Science');
  const [advisorId, setAdvisorId] = useState(advisors[0]?.id ?? '');
  const [temporaryPassword, setTemporaryPassword] = useState(DEFAULT_PASSWORD);
  const generatedStudentId = generateStudentId(enrollmentYear, users.filter((account) => account.role === 'student').map((account) => account.id));

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '');
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const drafts = selectedStudent ? getStudentDrafts(selectedStudent.id) : [];
  const transcriptSemesters = selectedStudent ? getStudentTranscriptSemesters(selectedStudent.id) : [];
  const availableTerms = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    const terms = new Set<string>();
    drafts.forEach((draft) => terms.add(draft.termCode));
    transcriptSemesters.forEach((semester) => terms.add(semester.termCode));
    getStudentAvailableTerms(selectedStudent.id).slice(0, 6).forEach((term) => terms.add(term.termCode));
    return [...terms];
  }, [drafts, getStudentAvailableTerms, selectedStudent, transcriptSemesters]);
  const [selectedTermCode, setSelectedTermCode] = useState('');
  const selectedSemester = transcriptSemesters.find((semester) => semester.termCode === selectedTermCode) ?? null;
  const selectedDraft = drafts.find((draft) => draft.termCode === selectedTermCode) ?? null;
  const availableTermKey = availableTerms.join('|');
  const selectedSemesterRows = selectedSemester?.rows ?? [];
  const selectedSemesterKey = selectedSemesterRows
    .map((row) => `${row.id ?? ''}:${row.termCode}:${row.courseCode}:${row.finalGrade ?? ''}:${row.status}:${row.attemptNo}`)
    .join('|');
  const [editedRows, setEditedRows] = useState<Record<string, TranscriptEntryInput>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState(DEFAULT_PASSWORD);
  const [missingCourseCode, setMissingCourseCode] = useState(courses[0]?.code ?? '');

  useEffect(() => {
    if (!advisorId && advisors[0]?.id) {
      setAdvisorId(advisors[0].id);
    }
  }, [advisorId, advisors]);

  useEffect(() => {
    if (departments[0] && !departments.includes(department)) {
      setDepartment(departments[0]);
    }
  }, [department, departments]);

  useEffect(() => {
    if (!selectedStudentId && students[0]?.id) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    setSelectedTermCode((current) => (current && availableTerms.includes(current) ? current : availableTerms[0] ?? ''));
    setEditedRows({});
  }, [availableTermKey, selectedStudentId]);

  useEffect(() => {
    const nextRows = Object.fromEntries(selectedSemesterRows.map((row) => [
      row.id ?? `${row.studentId}-${row.termCode}-${row.courseCode}-${row.attemptNo}`,
      {
        id: row.id,
        studentId: row.studentId,
        termCode: row.termCode,
        courseCode: row.courseCode,
        finalGrade: row.finalGrade,
        status: row.status === 'not_taken' ? 'in_progress' : row.status,
        attemptNo: row.attemptNo,
      } satisfies TranscriptEntryInput,
    ]));
    setEditedRows(nextRows);
  }, [selectedSemesterKey]);

  useEffect(() => {
    if (!missingCourseCode && courses[0]?.code) {
      setMissingCourseCode(courses[0].code);
    }
  }, [courses, missingCourseCode]);

  const draftCourseRows = selectedDraft?.courseCodes
    .map((code) => courses.find((course) => course.code === code))
    .flatMap((course) => (course ? [course] : [])) ?? [];
  const selectedTermRows: Array<{ credits: number }> = selectedSemester?.rows ?? draftCourseRows;
  const selectedTermHours = selectedTermRows.reduce((sum, row) => sum + row.credits, 0);
  const selectedTermLimit = selectedTermCode ? getCreditLimitForTermCode(selectedTermCode) : 18;

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = await createStudentAccount({
      id: generatedStudentId,
      name: studentName,
      enrollmentYear,
      admissionTerm,
      department,
      advisorId,
      temporaryPassword,
    });

    if (!result.success) {
      setError(result.error ?? 'Unable to create student account.');
      return;
    }

    setMessage(`Created student account ${generatedStudentId}.`);
    setSelectedStudentId(generatedStudentId);
    setStudentName('');
    setTemporaryPassword(DEFAULT_PASSWORD);
  };

  const handleCreateSheet = async () => {
    if (!selectedStudent || !selectedTermCode) {
      return;
    }

    setError(null);
    setMessage(null);
    const result = await createTranscriptFromDraft(selectedStudent.id, selectedTermCode);
    if (!result.success) {
      setError(result.error ?? 'Unable to create transcript sheet.');
      return;
    }

    setMessage(`Transcript sheet ready for ${selectedStudent.name} in ${formatTermLabel(selectedTermCode)}.`);
  };

  const handleAdvisorChange = async (nextAdvisorId: string) => {
    if (!selectedStudent) {
      return;
    }

    setError(null);
    const result = await assignAdvisor(selectedStudent.id, nextAdvisorId);
    if (!result.success) {
      setError(result.error ?? 'Unable to assign advisor.');
      return;
    }

    setMessage('Advisor assignment updated.');
  };

  const updateEditedRow = (key: string, patch: Partial<TranscriptEntryInput>) => {
    setEditedRows((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };

  const handleSaveMarks = async () => {
    setError(null);
    setMessage(null);
    const rows = Object.values(editedRows);

    for (const row of rows) {
      const result = await upsertTranscriptEntry(row);
      if (!result.success) {
        setError(result.error ?? 'Unable to save marks.');
        return;
      }
    }

    setMessage('Semester marks saved and dashboards updated.');
  };

  const handleAddAttempt = async () => {
    if (!selectedStudent || !selectedTermCode || !missingCourseCode) {
      return;
    }

    const existingAttempts = transcriptRows.filter((row) => row.studentId === selectedStudent.id && row.courseCode === missingCourseCode);
    const result = await upsertTranscriptEntry({
      studentId: selectedStudent.id,
      termCode: selectedTermCode,
      courseCode: missingCourseCode,
      finalGrade: null,
      status: 'in_progress',
      attemptNo: existingAttempts.reduce((max, row) => Math.max(max, row.attemptNo), 0) + 1,
    });

    if (!result.success) {
      setError(result.error ?? 'Unable to add attempt.');
      return;
    }

    setMessage('Missing course attempt added.');
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) {
      return;
    }

    const result = await resetUserPassword(selectedStudent.id, resetPassword);
    if (!result.success) {
      setError(result.error ?? 'Unable to reset password.');
      return;
    }

    setMessage(`Temporary password set for ${selectedStudent.id}.`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <form onSubmit={handleCreateStudent} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <UserPlus className="h-5 w-5 text-[#2563eb]" />
            Create Student Account
          </h2>
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Next generated ID: <span className="font-mono font-bold">{generatedStudentId}</span>
          </div>
          <div className="grid gap-4 text-sm text-gray-700 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              Full name
              <input required value={studentName} onChange={(event) => setStudentName(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
            </label>
            <label className="block">
              Enrollment year
              <input required type="number" min={2020} max={2100} value={enrollmentYear} onChange={(event) => setEnrollmentYear(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
            </label>
            <label className="block">
              Admission semester
              <select value={admissionTerm} onChange={(event) => setAdmissionTerm(event.target.value as AdmissionTerm)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
              </select>
            </label>
            <label className="block">
              Department
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {departments.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              Assigned advisor
              <select value={advisorId} onChange={(event) => setAdvisorId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              Temporary password
              <input required type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
            Create student
          </button>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Search className="h-5 w-5 text-[#2563eb]" />
            Student Registrar Record
          </h2>
          <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
            <label className="block">
              Student
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {students.map((student) => <option key={student.id} value={student.id}>{student.name} ({student.id})</option>)}
              </select>
            </label>
            <label className="block">
              Advisor
              <select value={selectedStudent?.advisorId ?? ''} onChange={(event) => void handleAdvisorChange(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
              </select>
            </label>
            <label className="block">
              Semester
              <select value={selectedTermCode} onChange={(event) => setSelectedTermCode(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                {availableTerms.map((termCode) => <option key={termCode} value={termCode}>{formatTermLabel(termCode)}</option>)}
              </select>
            </label>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected load</p>
              <p className="mt-1 font-display text-xl font-bold text-[#0f1e3c]">{selectedTermHours} / {selectedTermLimit} hours</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleCreateSheet} disabled={!selectedDraft} className="rounded-lg bg-[#0f1e3c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#172b55] disabled:cursor-not-allowed disabled:bg-gray-300">
              Create transcript sheet
            </button>
            <div className="flex min-w-[260px] items-center gap-2">
              <input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
              <button type="button" onClick={() => void handleResetPassword()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                <KeyRound className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? message}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <ClipboardList className="h-5 w-5 text-[#2563eb]" />
            Semester Marks
          </h2>
          <div className="flex flex-wrap gap-2">
            <select value={missingCourseCode} onChange={(event) => setMissingCourseCode(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
              {courses.map((course) => <option key={course.code} value={course.code}>{course.code} - {course.name}</option>)}
            </select>
            <button type="button" onClick={() => void handleAddAttempt()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
              <PlusCircle className="h-4 w-4" />
              Add attempt
            </button>
            <button type="button" onClick={() => void handleSaveMarks()} className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
              <Save className="h-4 w-4" />
              Save all
            </button>
          </div>
        </div>

        {selectedSemester ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                  <th className="pb-3 pr-4">Course</th>
                  <th className="pb-3 pr-4">Hours</th>
                  <th className="pb-3 pr-4">Semester</th>
                  <th className="pb-3 pr-4">Mark</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Attempt</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedSemester.rows.map((row: StudentTranscriptRow) => {
                  const key = row.id ?? `${row.studentId}-${row.termCode}-${row.courseCode}-${row.attemptNo}`;
                  const edited = editedRows[key];
                  return (
                    <tr key={key} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[#0f1e3c]">{row.courseCode}</p>
                        <p className="text-xs text-gray-500">{row.courseName}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{row.credits}</td>
                      <td className="py-3 pr-4">
                        <input value={edited?.termCode ?? row.termCode} onChange={(event) => updateEditedRow(key, { termCode: event.target.value })} className="w-32 rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                      </td>
                      <td className="py-3 pr-4">
                        <input type="number" min={0} max={100} value={edited?.finalGrade ?? ''} onChange={(event) => {
                          const nextGrade = event.target.value === '' ? null : Number(event.target.value);
                          updateEditedRow(key, {
                            finalGrade: nextGrade,
                            status: nextGrade === null ? 'in_progress' : nextGrade >= 60 ? 'passed' : 'failed',
                          });
                        }} className="w-24 rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                      </td>
                      <td className="py-3 pr-4">
                        <select value={edited?.status ?? (row.status === 'not_taken' ? 'in_progress' : row.status)} onChange={(event) => updateEditedRow(key, { status: event.target.value as TranscriptEntryInput['status'] })} className="rounded-lg border border-gray-200 px-3 py-2 capitalize focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30">
                          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input type="number" min={1} value={edited?.attemptNo ?? row.attemptNo} onChange={(event) => updateEditedRow(key, { attemptNo: Number(event.target.value) })} className="w-20 rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30" />
                      </td>
                      <td className="py-3">
                        {row.id && (
                          <button type="button" onClick={() => void deleteTranscriptEntry(row.id!)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50 p-8 text-center">
            <GraduationCap className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 font-semibold text-[#0f1e3c]">No transcript sheet for this semester yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedDraft ? 'Create the sheet from the saved course plan, then enter marks at semester end.' : 'Ask the student to save a course plan for this term first.'}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Users className="h-5 w-5 text-[#2563eb]" />
          Advisor Load
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {advisors.map((advisor) => {
            const load = students.filter((student) => student.advisorId === advisor.id).length;
            return (
              <div key={advisor.id} className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-[#0f1e3c]">{advisor.name}</p>
                <p className="text-sm text-gray-500">{load} assigned student{load === 1 ? '' : 's'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

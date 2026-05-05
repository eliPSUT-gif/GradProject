import { useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  formatTermLabel,
  getTermTypeFromCode,
  type ManagedUser,
} from '../../data/courses';
import {
  useAppData,
  type StudentTranscriptRow,
  type TranscriptEntryInput,
} from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';

interface TranscriptDraftRow {
  finalGrade: string;
  attemptNo: string;
  termCode: string;
}

function getDraftKey(row: StudentTranscriptRow) {
  return row.id ?? `${row.studentId}-${row.termCode}-${row.courseCode}-${row.attemptNo}`;
}

function formatGradeValue(value: number | null) {
  return value === null ? '' : String(value);
}

function parseGradeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function formatAttemptValue(value: number | null | undefined) {
  return value && value > 0 ? String(value) : '';
}

function parseAttemptValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function getStatusFromGrade(finalGrade: number | null): TranscriptEntryInput['status'] {
  if (finalGrade === null) {
    return 'in_progress';
  }

  return finalGrade >= 60 ? 'passed' : 'failed';
}

function getStatusLabel(finalGrade: number | null) {
  if (finalGrade === null) {
    return 'In progress';
  }

  return finalGrade >= 60 ? 'Passed' : 'Failed';
}

function getStatusClass(finalGrade: number | null) {
  if (finalGrade === null) {
    return 'bg-blue-50 text-blue-700';
  }

  return finalGrade >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
}

function getAdvisor(student: ManagedUser | undefined, users: ManagedUser[], rows: ReturnType<typeof useAppData>['studentInsights']) {
  if (!student) {
    return null;
  }

  const insight = rows.find((item) => item.id === student.id);
  return insight?.advisorId ? users.find((account) => account.id === insight.advisorId) ?? null : null;
}

export default function AdminStudentTranscriptPage() {
  const { studentId } = useParams();
  const { users } = useAuth();
  const {
    getStudentAvailableTerms,
    getStudentTranscript,
    isAppDataReady,
    studentInsights,
    upsertTranscriptEntry,
  } = useAppData();
  const [draftRows, setDraftRows] = useState<Record<string, TranscriptDraftRow>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const student = users.find((account) => account.id === studentId && account.role === 'student');
  const advisor = getAdvisor(student, users, studentInsights);
  const transcriptRows = useMemo(
    () => studentId ? getStudentTranscript(studentId) : [],
    [getStudentTranscript, studentId]
  );
  const termOptions = useMemo(() => {
    if (!studentId) {
      return [];
    }

    const terms = new Map<string, { termCode: string; termType: ReturnType<typeof getTermTypeFromCode> }>();
    getStudentAvailableTerms(studentId).forEach((term) => terms.set(term.termCode, term));
    transcriptRows.forEach((row) => terms.set(row.termCode, { termCode: row.termCode, termType: row.termType }));
    return [...terms.values()].map((term) => ({
      ...term,
      termLabel: formatTermLabel(term.termCode),
    }));
  }, [getStudentAvailableTerms, studentId, transcriptRows]);

  if (!studentId || (!student && isAppDataReady)) {
    return <Navigate to="/app/admin/students" replace />;
  }

  const getDraftForRow = (row: StudentTranscriptRow) => {
    const key = getDraftKey(row);
    return draftRows[key] ?? {
      finalGrade: formatGradeValue(row.finalGrade),
      attemptNo: formatAttemptValue(row.attemptNo),
      termCode: row.termCode || termOptions[0]?.termCode || '',
    };
  };

  const validationErrors = transcriptRows.flatMap((row) => {
    const draft = getDraftForRow(row);
    const finalGrade = parseGradeValue(draft.finalGrade);
    const attemptNo = parseAttemptValue(draft.attemptNo);
    if (draft.finalGrade.trim()) {
      if (!/^\d+$/.test(draft.finalGrade.trim())) {
        return [`${row.courseCode} needs a whole-number mark, or a blank mark.`];
      }

      if (!Number.isInteger(finalGrade) || finalGrade === null || finalGrade < 35 || finalGrade > 99) {
        return [`${row.courseCode} needs a whole-number mark from 35 to 99, or a blank mark.`];
      }

      if (!draft.attemptNo.trim()) {
        return [`${row.courseCode} needs an attempt number from 1 to 10 when a mark is entered.`];
      }
    }

    if (draft.attemptNo.trim()) {
      if (!/^\d+$/.test(draft.attemptNo.trim())) {
        return [`${row.courseCode} needs a whole-number attempt from 1 to 10, or a blank attempt.`];
      }

      if (!Number.isInteger(attemptNo) || attemptNo === null || attemptNo < 1 || attemptNo > 10) {
        return [`${row.courseCode} needs a whole-number attempt from 1 to 10, or a blank attempt.`];
      }
    }

    return [];
  });

  const changedRows = transcriptRows.filter((row) => {
    const draft = draftRows[getDraftKey(row)];
    if (!draft) {
      return false;
    }

    return !row.id
      || draft.termCode !== row.termCode
      || parseGradeValue(draft.finalGrade) !== row.finalGrade
      || parseAttemptValue(draft.attemptNo) !== row.attemptNo;
  });
  const hasChanges = changedRows.length > 0;

  const transcriptByTerm = transcriptRows.reduce<Record<string, StudentTranscriptRow[]>>((groups, row) => {
    const draft = getDraftForRow(row);
    const termCode = draft.termCode;
    groups[termCode] = [...(groups[termCode] ?? []), row];
    return groups;
  }, {});

  const handleReset = () => {
    setDraftRows({});
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setMessage(null);
    setError(null);

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setIsSaving(true);
    for (const row of changedRows) {
      const draft = draftRows[getDraftKey(row)];
      const finalGrade = parseGradeValue(draft.finalGrade);
      const attemptNo = parseAttemptValue(draft.attemptNo);
      const result = await upsertTranscriptEntry({
        id: row.id,
        studentId: row.studentId,
        termCode: draft.termCode || row.termCode || termOptions[0]?.termCode || '',
        courseCode: row.courseCode,
        finalGrade,
        status: getStatusFromGrade(finalGrade),
        attemptNo: attemptNo ?? Math.max(row.attemptNo, 1),
      });

      if (!result.success) {
        setIsSaving(false);
        setError(result.error ?? `Unable to save ${row.courseCode}.`);
        return;
      }
    }
    setIsSaving(false);
    setDraftRows({});
    setMessage('Transcript changes saved.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/app/admin/students" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
            <ArrowLeft className="h-4 w-4" />
            Students
          </Link>
          <h2 className="text-xl font-bold text-[#0f1e3c]">{student?.name ?? 'Student transcript'}</h2>
          <p className="mt-1 text-sm text-gray-500">
            ID {studentId}{advisor ? ` | Advisor ${advisor.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={!hasChanges || validationErrors.length > 0 || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {validationErrors.length > 0 && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{validationErrors[0]}</div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        {transcriptRows.length > 0 ? (
          <div className="space-y-5">
            {Object.entries(transcriptByTerm).map(([termCode, rows]) => (
              <div key={termCode} className="overflow-hidden rounded-xl border border-gray-200">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-[#0f1e3c]">{formatTermLabel(termCode)}</p>
                  <span className="text-xs font-medium text-gray-500">{rows.length} course{rows.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3 pr-4">Code</th>
                        <th className="px-4 py-3 pr-4">Course</th>
                        <th className="px-4 py-3 pr-4 text-center">Credits</th>
                        <th className="px-4 py-3 pr-4 text-center">Attempt</th>
                        <th className="px-4 py-3 pr-4">Semester taken</th>
                        <th className="px-4 py-3 pr-4">Mark</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const key = getDraftKey(row);
                        const draft = getDraftForRow(row);
                        const parsedGrade = parseGradeValue(draft.finalGrade);
                        return (
                          <tr key={key} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3 font-mono font-semibold text-[#0f1e3c]">{row.courseCode}</td>
                            <td className="min-w-56 px-4 py-3 text-gray-700">{row.courseName}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{row.credits}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                inputMode="numeric"
                                value={draft.attemptNo}
                                onChange={(event) => setDraftRows((current) => ({
                                  ...current,
                                  [key]: { ...draft, attemptNo: event.target.value },
                                }))}
                                className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={draft.termCode}
                                onChange={(event) => setDraftRows((current) => ({
                                  ...current,
                                  [key]: { ...draft, termCode: event.target.value },
                                }))}
                                className="w-44 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                              >
                                {termOptions.map((term) => (
                                  <option key={term.termCode} value={term.termCode}>{term.termLabel}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="35"
                                max="99"
                                step="1"
                                inputMode="numeric"
                                value={draft.finalGrade}
                                onChange={(event) => setDraftRows((current) => ({
                                  ...current,
                                  [key]: { ...draft, finalGrade: event.target.value },
                                }))}
                                className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                              />
                              <button
                                type="button"
                                onClick={() => setDraftRows((current) => ({
                                  ...current,
                                  [key]: { ...draft, finalGrade: '' },
                                }))}
                                className="mt-2 text-xs font-semibold text-gray-500 transition-colors hover:text-[#2563eb]"
                              >
                                Clear grade
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getStatusClass(parsedGrade)}`}>
                                {getStatusLabel(parsedGrade)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            No transcript rows are available for this student yet.
          </div>
        )}
      </section>
    </div>
  );
}

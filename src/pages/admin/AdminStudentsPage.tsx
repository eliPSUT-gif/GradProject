import { useDeferredValue, useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';

export default function AdminStudentsPage() {
  const { users } = useAuth();
  const {
    isAppDataReady,
    studentInsights,
  } = useAppData();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const students = useMemo(
    () => users.filter((account) => account.role === 'student'),
    [users]
  );
  const insightById = useMemo(
    () => new Map(studentInsights.map((student) => [student.id, student])),
    [studentInsights]
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

  return (
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
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/app/admin/students/${student.id}/transcript`}
                          className="inline-flex items-center justify-center rounded-lg border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/10"
                        >
                          View transcript
                        </Link>
                      </div>
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
  );
}

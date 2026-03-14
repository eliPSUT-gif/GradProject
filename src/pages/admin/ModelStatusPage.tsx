import { Bot, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function ModelStatusPage() {
  const { historicalStats, importJobs, modelCoverage, modelLastCalculatedAt, modelVersion, recalculateScores } = useAppData();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <Bot className="h-5 w-5 text-[#2563eb]" />
          Scoring Model Status
        </h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Version</p>
            <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{modelVersion}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-[#0f1e3c]">Coverage</p>
            <p className="mt-1 text-gray-600">{modelCoverage}% of courses have valid scores and model metadata.</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-[#0f1e3c]">Historical data rows</p>
            <p className="mt-1 text-gray-600">{historicalStats.length} validated rows currently loaded.</p>
          </div>
        </div>
        <button onClick={recalculateScores} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
          <RefreshCw className="h-4 w-4" />
          Recalculate course scores
        </button>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Clock className="h-5 w-5 text-[#2563eb]" />
            Last Model Run
          </h2>
          <p className="text-sm text-gray-600">{new Date(modelLastCalculatedAt).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <ShieldCheck className="h-5 w-5 text-[#2563eb]" />
            Validation Summary
          </h2>
          <ul className="space-y-3 text-sm text-gray-700">
            {importJobs.slice(0, 5).map((job) => (
              <li key={job.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-[#0f1e3c]">{job.fileName}</p>
                <p className="mt-1 text-gray-600">{job.importedRows} imported | {job.rejectedRows} rejected | {job.status.replaceAll('_', ' ')}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

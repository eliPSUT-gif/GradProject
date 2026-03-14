import {
  Activity,
  AlertTriangle,
  Bot,
  Clock,
  Database,
  Server,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

export default function AdminDashboard() {
  const { users } = useAuth();
  const { importJobs, modelCoverage, modelLastCalculatedAt, modelVersion, studentInsights } = useAppData();

  const totalStudents = users.filter((user) => user.role === 'student').length;
  const activeAdvisors = users.filter((user) => user.role === 'advisor' && user.status === 'active').length;
  const highRiskSchedules = studentInsights.filter((student) => student.status === 'at-risk').length;

  const kpis = [
    {
      icon: Users,
      label: 'Total Students',
      value: String(totalStudents),
      subtitle: 'Managed in this demo instance',
      accent: '#2563eb',
    },
    {
      icon: UserCheck,
      label: 'Active Advisors',
      value: String(activeAdvisors),
      subtitle: 'Role-based access enabled',
      accent: '#0d9488',
    },
    {
      icon: AlertTriangle,
      label: 'High-Risk Schedules',
      value: String(highRiskSchedules),
      subtitle: 'Needs advisor follow-up',
      accent: '#dc2626',
    },
    {
      icon: Bot,
      label: 'Model Coverage',
      value: `${modelCoverage}%`,
      subtitle: `Version ${modelVersion}`,
      accent: '#16a34a',
    },
  ];

  const healthItems = [
    { icon: Activity, label: 'Uptime', value: '99.9%', bg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { icon: Server, label: 'Avg Response', value: '< 1 s', bg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { icon: Database, label: 'Historical Rows', value: String(importJobs.reduce((sum, job) => sum + job.importedRows, 0)), bg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { icon: Bot, label: 'Score Model', value: modelVersion, bg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
              <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: item.accent }} />
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</span>
              </div>
              <p className="font-display text-3xl font-bold text-[#0f1e3c]">{item.value}</p>
              <p className="mt-1 text-xs text-gray-500">{item.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Activity className="h-5 w-5 text-[#2563eb]" />
            System Health
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {healthItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-[#0f1e3c]">{item.value}</p>
                    <p className="text-xs text-gray-400">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Clock className="h-5 w-5 text-[#2563eb]" />
            Import Activity
          </h2>
          <ul className="divide-y divide-gray-100">
            {importJobs.slice(0, 5).map((job) => (
              <li key={job.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-[#0f1e3c]">{job.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {job.importedRows} imported | {job.rejectedRows} rejected | {job.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <AlertTriangle className="h-5 w-5 text-[#2563eb]" />
            Risk Distribution
          </h2>
          <div className="space-y-4">
            {[
              {
                label: 'Easy',
                count: studentInsights.filter((student) => student.latestEvaluation?.riskLabel === 'Easy').length,
                barColor: 'bg-emerald-500',
              },
              {
                label: 'Balanced',
                count: studentInsights.filter((student) => student.latestEvaluation?.riskLabel === 'Balanced').length,
                barColor: 'bg-amber-500',
              },
              {
                label: 'High Risk',
                count: studentInsights.filter((student) => student.latestEvaluation?.riskLabel === 'Hard').length,
                barColor: 'bg-red-500',
              },
            ].map((band) => (
              <div key={band.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{band.label}</span>
                  <span className="text-gray-500">{band.count} students</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${band.barColor}`} style={{ width: `${studentInsights.length === 0 ? 0 : (band.count / studentInsights.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
            <Bot className="h-5 w-5 text-[#2563eb]" />
            Model Status
          </h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current version</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#0f1e3c]">{modelVersion}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-[#0f1e3c]">Scoring coverage</p>
              <p className="mt-1 text-gray-600">{modelCoverage}% of catalog courses currently have valid difficulty scores with stored model metadata.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-[#0f1e3c]">Last recalculation</p>
              <p className="mt-1 text-gray-600">{new Date(modelLastCalculatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

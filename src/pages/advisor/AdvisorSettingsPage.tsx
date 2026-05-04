import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import AccountSecurityPanel from '../../components/AccountSecurityPanel';

const STORAGE_KEY = 'smart-advisor-advisor-settings';

function loadAdvisorSettings() {
  if (typeof window === 'undefined') {
    return { defaultFilter: 'all', showOnlyRisky: false };
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { defaultFilter: 'all', showOnlyRisky: false };
  }

  try {
    return JSON.parse(saved) as { defaultFilter: string; showOnlyRisky: boolean };
  } catch {
    return { defaultFilter: 'all', showOnlyRisky: false };
  }
}

export default function AdvisorSettingsPage() {
  const [settings, setSettings] = useState(loadAdvisorSettings);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setMessage('Advisor preferences saved locally for this browser session.');
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0f1e3c]">
          <SlidersHorizontal className="h-5 w-5 text-[#2563eb]" />
          Advisor Preferences
        </h2>
        <div className="space-y-4 text-sm text-gray-700">
          <label className="block">
            Default report filter
            <select
              value={settings.defaultFilter}
              onChange={(event) =>
                setSettings((current) => ({ ...current, defaultFilter: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            >
              <option value="all">All students</option>
              <option value="monitor">Students to monitor</option>
              <option value="risk">At-risk students</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={settings.showOnlyRisky}
              onChange={(event) =>
                setSettings((current) => ({ ...current, showOnlyRisky: event.target.checked }))
              }
            />
            Start advisor dashboard with at-risk alerts highlighted.
          </label>
        </div>

        {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <button onClick={handleSave} className="mt-5 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
          Save preferences
        </button>
      </div>

      <AccountSecurityPanel />
    </div>
  );
}

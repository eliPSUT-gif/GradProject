import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Shield, Sparkles, Users } from 'lucide-react';
import { getHomeRoute, useAuth } from '../context/AuthContext';
import type { ManagedUser, Role } from '../data/courses';

const ROLES: { key: Role; label: string; icon: ReactNode }[] = [
  { key: 'student', label: 'Student', icon: <GraduationCap className="h-4 w-4" /> },
  { key: 'advisor', label: 'Advisor', icon: <Users className="h-4 w-4" /> },
  { key: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
];

export default function LoginPage() {
  const { isAuthenticated, login, user, users } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [userId, setUserId] = useState('20231001');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleAccounts = useMemo(
    () => users.filter((account) => account.role === selectedRole && account.status === 'active'),
    [selectedRole, users]
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getHomeRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const applyAccount = (account: ManagedUser) => {
    setUserId(account.id);
    setPassword(account.password);
    setError(null);
  };

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    const nextAccount = users.find((account) => account.role === role && account.status === 'active');
    if (nextAccount) {
      applyAccount(nextAccount);
      return;
    }

    setUserId('');
    setPassword('');
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = login({ role: selectedRole, id: userId, password });
    if (!result.success) {
      setError(result.error ?? 'Unable to sign in.');
      return;
    }

    navigate(getHomeRoute(selectedRole));
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden bg-navy p-12 lg:flex grid-bg">
        <div className="pointer-events-none absolute left-[-80px] top-[-120px] h-[400px] w-[400px] rounded-full bg-blue/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-100px] right-[-60px] h-[350px] w-[350px] rounded-full bg-blue-lt/15 blur-[100px]" />

        <div className="relative z-10">
          <div className="mb-20 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-blue-lt" />
            <span className="font-display text-2xl font-bold text-white">
              Smart<span className="text-blue-pale">Advisor</span>
            </span>
          </div>

          <h1 className="max-w-lg font-display text-5xl font-bold leading-tight text-white xl:text-6xl">
            Know your semester before you <span className="italic text-blue-pale">commit.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-pale/80">
            Explainable academic planning that helps students balance workload, advisors review risk,
            and admins maintain the scoring model.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          {['Students', 'Advisors', 'Admins'].map((label) => (
            <span key={label} className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/60 backdrop-blur-sm">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-bg px-6 py-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-center gap-2 lg:hidden">
            <Sparkles className="h-7 w-7 text-blue" />
            <span className="font-display text-xl font-bold text-navy">
              Smart<span className="text-blue">Advisor</span>
            </span>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-navy/5">
            <h2 className="font-display text-2xl font-bold text-navy">Welcome back</h2>
            <p className="mb-6 mt-1 text-slate">Sign in to your account</p>

            <div className="mb-6 flex rounded-xl bg-bg p-1">
              {ROLES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                    selectedRole === key ? 'bg-blue text-white shadow-md shadow-blue/25' : 'text-slate hover:text-navy'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-navy">
                  {selectedRole === 'student' ? 'Student' : selectedRole === 'advisor' ? 'Faculty' : 'Admin'} ID
                </label>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder={`Enter your ${selectedRole} ID`}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-ink transition placeholder:text-slate/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-navy">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 pr-11 text-ink transition placeholder:text-slate/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate transition hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-blue/10 bg-blue/5 p-3 text-sm text-slate">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-blue">Demo accounts</span>
                  <span className="text-xs text-slate/70">{roleAccounts.length} active {selectedRole} account{roleAccounts.length === 1 ? '' : 's'}</span>
                </div>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {roleAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => applyAccount(account)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        account.id === userId ? 'border-blue/30 bg-white text-navy shadow-sm' : 'border-transparent bg-white/60 hover:border-blue/20 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy">{account.name}</p>
                          <p className="text-xs text-slate">{account.id}</p>
                        </div>
                        <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-semibold text-blue">{account.password}</span>
                      </div>
                    </button>
                  ))}
                  {roleAccounts.length === 0 && <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate">No active demo accounts are available for this role yet.</p>}
                </div>
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue py-2.5 font-semibold text-white shadow-lg shadow-blue/25 transition hover:bg-blue-lt active:scale-[0.98]"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

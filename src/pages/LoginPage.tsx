import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, Sparkles, Users } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { useAppData } from '../context/AppDataContext';
import { getHomeRoute, useAuth } from '../context/AuthContext';
import type { Role } from '../data/courses';
import { executeRecaptcha, hasRecaptchaSiteKey, verifyRecaptchaToken } from '../lib/recaptcha';
import { getSupabaseConfigError, hasSupabaseConfig, isLocalDemoModeEnabled } from '../lib/supabase';

const ROLES: { key: Role; label: string; icon: ReactNode }[] = [
  { key: 'student', label: 'Student', icon: <GraduationCap className="h-4 w-4" /> },
  { key: 'advisor', label: 'Advisor', icon: <Users className="h-4 w-4" /> },
  { key: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
];

const RECAPTCHA_ACTION = 'login';

export default function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const { submitPasswordResetInquiry } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const authError = (location.state as { authError?: string } | null)?.authError ?? null;

  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordId, setForgotPasswordId] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getHomeRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    if (authError) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [authError, location.pathname, navigate]);

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setError(null);
    setForgotPasswordError(null);
    setForgotPasswordMessage(null);
    if (role === 'admin') {
      setIsForgotPasswordOpen(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (backendConfigError) {
      setError(backendConfigError);
      return;
    }

    if (!hasRecaptchaSiteKey()) {
      setError('reCAPTCHA is not configured yet. Add the site key before logging in.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await executeRecaptcha(RECAPTCHA_ACTION);
      await verifyRecaptchaToken(token, RECAPTCHA_ACTION);

      const result = await login({ role: selectedRole, id: userId, password, rememberMe });
      if (!result.success) {
        setError(result.error ?? 'Unable to sign in.');
        return;
      }

      navigate(getHomeRoute(selectedRole), { replace: true });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to verify reCAPTCHA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setForgotPasswordError(null);
    setForgotPasswordMessage(null);

    if (selectedRole === 'admin') {
      setForgotPasswordError('Admin password resets must be handled by another administrator.');
      return;
    }

    if (backendConfigError) {
      setForgotPasswordError(backendConfigError);
      return;
    }

    setIsSubmittingInquiry(true);
    const result = await submitPasswordResetInquiry(selectedRole, forgotPasswordId);
    setIsSubmittingInquiry(false);

    if (!result.success) {
      setForgotPasswordError(result.error ?? 'Unable to send this request.');
      return;
    }

    setForgotPasswordId('');
    setForgotPasswordMessage('Your request was sent to the admin office.');
  };

  const backendConfigError = !hasSupabaseConfig() && !isLocalDemoModeEnabled()
    ? `${getSupabaseConfigError()} Add the Supabase URL and anon key to the deployment environment and rebuild.`
    : null;
  const activeError = error ?? authError ?? backendConfigError;
  const canRequestPasswordHelp = selectedRole === 'student' || selectedRole === 'advisor';

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
            <p className="mb-6 mt-1 text-slate">Enter your account credentials to continue</p>

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

            <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-4">
              <div>
                <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-navy">
                  {selectedRole === 'student' ? 'Student' : selectedRole === 'advisor' ? 'Faculty' : 'Admin'} ID
                </label>
                <input
                  id="userId"
                  type="text"
                  required
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder={`Enter your ${selectedRole} ID`}
                  autoComplete="username"
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-ink transition placeholder:text-slate/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-medium text-navy">
                    Password
                  </label>
                  {canRequestPasswordHelp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordOpen((current) => !current);
                        setForgotPasswordError(null);
                        setForgotPasswordMessage(null);
                        setForgotPasswordId(userId);
                      }}
                      className="text-xs font-semibold text-blue hover:text-blue-lt"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={rememberMe ? 'current-password' : 'off'}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-ink transition placeholder:text-slate/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                />
              </div>

              {canRequestPasswordHelp && isForgotPasswordOpen && (
                <div className="rounded-xl border border-blue/15 bg-blue/5 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-navy">Request admin password help</p>
                    <p className="mt-1 text-xs text-slate">Enter your {selectedRole} ID and the admin office will receive the inquiry.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={forgotPasswordId}
                      onChange={(event) => setForgotPasswordId(event.target.value)}
                      placeholder={`Enter your ${selectedRole} ID`}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink transition placeholder:text-slate/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                    />
                    <button
                      type="button"
                      onClick={(event) => { void handleForgotPasswordSubmit(event); }}
                      disabled={isSubmittingInquiry}
                      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-lt disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmittingInquiry ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  {forgotPasswordError && <p className="mt-2 text-xs font-medium text-red-600">{forgotPasswordError}</p>}
                  {forgotPasswordMessage && <p className="mt-2 text-xs font-medium text-emerald-600">{forgotPasswordMessage}</p>}
                </div>
              )}

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue focus:ring-blue"
                />
                Keep me signed in on this device
              </label>

              <div className="rounded-xl border border-blue/10 bg-blue/5 p-3 text-xs text-slate">
                Passwords must be at least 10 characters and include uppercase, lowercase, a number, and a special character.
              </div>

              <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-xs text-slate">
                This sign-in is protected by reCAPTCHA v3. Google may collect device and interaction data to detect abuse.
              </div>

              {activeError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{activeError}</div>}

              <button
                type="submit"
                disabled={isSubmitting || Boolean(backendConfigError)}
                className="w-full rounded-xl bg-blue py-2.5 font-semibold text-white shadow-lg shadow-blue/25 transition hover:bg-blue-lt active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Verifying...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}






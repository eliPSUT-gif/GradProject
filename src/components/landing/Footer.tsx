import { GraduationCap } from 'lucide-react';

const TECH_STACK = [
  'React 19',
  'TypeScript',
  'Tailwind CSS v4',
  'Supabase',
  'Vercel Functions',
  'OpenRouter',
  'reCAPTCHA v3',
] as const;

export default function Footer() {
  return (
    <footer className="relative bg-navy border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue to-blue-sky flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                <span className="text-white">Smart</span>
                <span className="text-blue-pale">Advisor</span>
              </span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Academic planning app for students, advisors, and admins with schedule review,
              messaging, transcript views, and draft persistence.
            </p>
          </div>

          {/* Tech stack */}
          <div>
            <h4 className="text-sm font-semibold text-white/70 mb-4">Tech Stack</h4>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 text-xs font-medium text-white/50 bg-white/5 border border-white/5 rounded-lg"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* University */}
          <div>
            <h4 className="text-sm font-semibold text-white/70 mb-4">University</h4>
            <p className="text-sm text-white/40 leading-relaxed">
              Princess Sumaya University for Technology
              <br />
              King Hussein School of Computing Sciences
              <br />
              Graduation Project II &mdash; 2025
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} SmartAdvisor. Built at PSUT.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs text-white/30">Built for PSUT graduation project review</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

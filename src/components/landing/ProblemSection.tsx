import { AlertTriangle, Zap, BarChart3, GraduationCap, Users, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Problem {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

const PROBLEMS: Problem[] = [
  {
    icon: AlertTriangle,
    title: 'Blind Course Registration',
    description:
      'Students select courses without understanding how difficult the resulting semester will be, leading to overloaded schedules.',
    iconColor: 'text-red',
    iconBg: 'bg-red/10',
  },
  {
    icon: Zap,
    title: 'No Difficulty Metrics',
    description:
      'There is no standardized way to measure or compare the difficulty of individual courses or combined workloads.',
    iconColor: 'text-gold',
    iconBg: 'bg-gold/10',
  },
  {
    icon: BarChart3,
    title: 'Advisor Overload',
    description:
      'Academic advisors manually review each student schedule, creating bottlenecks during peak registration periods.',
    iconColor: 'text-blue-sky',
    iconBg: 'bg-blue-sky/10',
  },
  {
    icon: GraduationCap,
    title: 'High Failure Rates',
    description:
      'Students frequently fail courses they were not prepared for, extending graduation timelines and increasing costs.',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-400/10',
  },
  {
    icon: Users,
    title: 'Limited Historical Insight',
    description:
      'Valuable historical grade data exists but is not leveraged to guide future scheduling decisions.',
    iconColor: 'text-teal',
    iconBg: 'bg-teal/10',
  },
];

const SOLUTIONS = [
  'AI-computed difficulty scores for every course',
  'Semester workload evaluation in real time',
  'Intelligent schedule recommendations',
  'Data-driven advisor dashboards',
  'Historical performance analytics',
  'Proactive risk alerts before registration',
] as const;

export default function ProblemSection() {
  return (
    <section id="problem" className="relative py-24 lg:py-32 bg-bg">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue bg-blue/10 rounded-full mb-4">
            The Problem
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
            Why Students Struggle
          </h2>
          <p className="mt-4 text-lg text-slate max-w-2xl mx-auto">
            The academic advising process is broken. Students and advisors lack the tools to make
            informed scheduling decisions.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Problem cards */}
          <div className="space-y-4">
            {PROBLEMS.map((problem, idx) => (
              <div
                key={problem.title}
                className="group flex gap-4 p-5 bg-white rounded-2xl border border-border hover:border-blue/20 hover:shadow-lg hover:shadow-blue/5 transition-all duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`shrink-0 w-11 h-11 rounded-xl ${problem.iconBg} flex items-center justify-center`}>
                  <problem.icon className={`w-5 h-5 ${problem.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">{problem.title}</h3>
                  <p className="text-sm text-slate mt-1 leading-relaxed">{problem.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Solution box */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-ink rounded-3xl p-8 lg:p-10 shadow-2xl">
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green bg-green/10 rounded-full mb-6">
                Our Solution
              </span>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-white mb-8">
                Smart Advisor<br />
                <span className="bg-gradient-to-r from-blue to-blue-sky bg-clip-text text-transparent">
                  Changes Everything
                </span>
              </h3>
              <ul className="space-y-4">
                {SOLUTIONS.map((solution) => (
                  <li key={solution} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80 leading-relaxed">{solution}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 h-1 bg-gradient-to-r from-blue via-blue-sky to-green rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

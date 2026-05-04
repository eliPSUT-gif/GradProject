import { Shield, Database, Calculator, CalendarCheck, Brain, LayoutDashboard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

const FEATURES: Feature[] = [
  {
    icon: Shield,
    tag: 'FR-1',
    title: 'Secure Authentication',
    description:
      'Role-based access control with JWT tokens. Students, advisors, and admins get tailored dashboards with appropriate permissions.',
    iconColor: 'text-blue',
    iconBg: 'bg-blue/10',
  },
  {
    icon: Database,
    tag: 'FR-2',
    title: 'Historical Data Integration',
    description:
      'Uses the seeded course catalog, transcript history, and stored drafts in Supabase-backed flows to support planning and reporting.',
    iconColor: 'text-teal',
    iconBg: 'bg-teal/10',
  },
  {
    icon: Calculator,
    tag: 'FR-3',
    title: 'Difficulty Score Calculation',
    description:
      'Combines course difficulty, hard-course penalties, course-mix pressure, credit load, and known difficult pairings into a workload score.',
    iconColor: 'text-gold',
    iconBg: 'bg-gold/10',
  },
  {
    icon: CalendarCheck,
    tag: 'FR-4',
    title: 'Schedule Workload Evaluation',
    description:
      'Instantly evaluates your selected courses and returns an overall semester difficulty forecast with risk level.',
    iconColor: 'text-green',
    iconBg: 'bg-green/10',
  },
  {
    icon: Brain,
    tag: 'FR-5',
    title: 'AI Recommendations Engine',
    description:
      'OpenRouter-backed schedule review generates notes, rationale, and recommendation cards from the selected draft.',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-400/10',
  },
  {
    icon: LayoutDashboard,
    tag: 'FR-6',
    title: 'Advisor Dashboard',
    description:
      'Advisors view aggregated risk analytics across all advisees, enabling proactive intervention before registration closes.',
    iconColor: 'text-red',
    iconBg: 'bg-red/10',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue bg-blue/10 rounded-full mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
            Everything You Need
          </h2>
          <p className="mt-4 text-lg text-slate max-w-2xl mx-auto">
            A comprehensive platform designed for students, advisors, and administrators.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.tag}
              className="group relative p-7 bg-bg rounded-2xl border border-border hover:border-blue/20 hover:shadow-xl hover:shadow-blue/5 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Tag */}
              <span className="absolute top-5 right-5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate bg-white rounded-lg border border-border">
                {feature.tag}
              </span>

              <div className={`w-12 h-12 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">{feature.title}</h3>
              <p className="text-sm text-slate leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Target, MousePointerClick, Users, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { icon: Target, value: '4', label: 'Planner Score Factors' },
  { icon: MousePointerClick, value: '1', label: 'Click to Review a Schedule' },
  { icon: Users, value: '3', label: 'User Roles' },
  { icon: Shield, value: '6', label: 'Server API Routes' },
];

export default function StatsStrip() {
  return (
    <section className="relative bg-gradient-to-r from-blue via-blue-lt to-blue-sky overflow-hidden">
      {/* Decorative overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%)] bg-[length:20px_20px] opacity-30" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/25 transition-colors">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-white/70 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

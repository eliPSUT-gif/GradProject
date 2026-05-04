import { TrendingDown, Award, BookOpen, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface WeightCard {
  icon: LucideIcon;
  label: string;
  weight: string;
  variable: string;
  color: string;
  iconBg: string;
  borderColor: string;
  barColor: string;
  barWidth: string;
}

const WEIGHTS: WeightCard[] = [
  {
    icon: TrendingDown,
    label: 'Course Average',
    weight: '68%',
    variable: 'AVG',
    color: 'text-teal',
    iconBg: 'bg-teal/10',
    borderColor: 'border-teal/20',
    barColor: 'bg-teal',
    barWidth: 'w-[68%]',
  },
  {
    icon: Award,
    label: 'Hard Course Penalty',
    weight: '+6.5',
    variable: 'HP',
    color: 'text-gold',
    iconBg: 'bg-gold/10',
    borderColor: 'border-gold/20',
    barColor: 'bg-gold',
    barWidth: 'w-[42%]',
  },
  {
    icon: BookOpen,
    label: 'Course Mix Penalty',
    weight: '+3',
    variable: 'MP',
    color: 'text-purple-400',
    iconBg: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20',
    barColor: 'bg-purple-400',
    barWidth: 'w-[28%]',
  },
  {
    icon: Clock,
    label: 'Credit Load Penalty',
    weight: '+4.8',
    variable: 'CP',
    color: 'text-orange-400',
    iconBg: 'bg-orange-400/10',
    borderColor: 'border-orange-400/20',
    barColor: 'bg-orange-400',
    barWidth: 'w-[30%]',
  },
];

export default function AIEngineSection() {
  return (
    <section id="ai-engine" className="relative py-24 lg:py-32 bg-ink overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue/10 rounded-full blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-sky bg-blue-sky/10 rounded-full mb-4">
            AI Engine
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            How The Planner Scores Workload
          </h2>
          <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
            The landing page now mirrors the actual planner review logic instead of the old
            placeholder formula.
          </p>
        </div>

        {/* Weight cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {WEIGHTS.map((w) => (
            <div
              key={w.variable}
              className={`relative p-6 bg-white/5 backdrop-blur-sm border ${w.borderColor} rounded-2xl hover:bg-white/[0.08] transition-colors duration-300`}
            >
              <div className={`w-11 h-11 rounded-xl ${w.iconBg} flex items-center justify-center mb-4`}>
                <w.icon className={`w-5 h-5 ${w.color}`} />
              </div>
              <p className="text-sm font-medium text-white/60 mb-1">{w.label}</p>
              <p className={`font-display text-3xl font-bold ${w.color}`}>{w.weight}</p>

              {/* Bar */}
              <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${w.barWidth} ${w.barColor} rounded-full`} />
              </div>

              {/* Variable tag */}
              <span className="absolute top-5 right-5 px-2 py-0.5 text-[10px] font-mono font-bold text-white/30 bg-white/5 rounded">
                {w.variable}
              </span>
            </div>
          ))}
        </div>

        {/* Formula box */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-6">
              Scoring Formula
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-lg sm:text-xl lg:text-2xl font-mono">
              <span className="font-display font-bold text-white">S</span>
              <span className="text-white/30">=</span>
              <span className="text-teal font-bold">0.68</span>
              <span className="text-white/30">&times;</span>
              <span className="px-2 py-1 bg-teal/10 border border-teal/20 rounded-lg text-teal font-bold">
                AVG
              </span>
              <span className="text-white/30">+</span>
              <span className="text-gold font-bold">HP</span>
              <span className="text-white/30">&times;</span>
              <span className="px-2 py-1 bg-gold/10 border border-gold/20 rounded-lg text-gold font-bold">
                Hard
              </span>
              <span className="text-white/30">+</span>
              <span className="text-purple-400 font-bold">MP</span>
              <span className="text-white/30">&times;</span>
              <span className="px-2 py-1 bg-purple-400/10 border border-purple-400/20 rounded-lg text-purple-400 font-bold">
                Mix
              </span>
              <span className="text-white/30">+</span>
              <span className="text-orange-400 font-bold">CP</span>
              <span className="text-white/30">&times;</span>
              <span className="px-2 py-1 bg-orange-400/10 border border-orange-400/20 rounded-lg text-orange-400 font-bold">
                Credits
              </span>
              <span className="text-white/30">+</span>
              <span className="text-blue-sky font-bold">PP</span>
              <span className="text-white/30">&times;</span>
              <span className="px-2 py-1 bg-blue-sky/10 border border-blue-sky/20 rounded-lg text-blue-sky font-bold">
                Patterns
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/40">
              <span><strong className="text-teal">AVG</strong> = average course difficulty</span>
              <span><strong className="text-gold">HP</strong> = hard-course count penalty</span>
              <span><strong className="text-purple-400">MP</strong> = theory/project mix penalty</span>
              <span><strong className="text-orange-400">CP</strong> = credit load penalty</span>
              <span><strong className="text-blue-sky">PP</strong> = known difficult pairings</span>
              <span><strong className="text-white">S</strong> = schedule workload score</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Code2, Brain, Palette, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TeamMember {
  name: string;
  id: string;
  role: string;
  icon: LucideIcon;
  duties: string;
  gradientFrom: string;
  gradientTo: string;
  initials: string;
}

const MEMBERS: TeamMember[] = [
  {
    name: 'Abdulrahman Hamdani',
    id: '20220696',
    role: 'QA Lead',
    icon: Code2,
    duties: 'Testing strategy, quality assurance, bug tracking, and CI/CD pipeline management.',
    gradientFrom: 'from-teal',
    gradientTo: 'to-green',
    initials: 'AH',
  },
  {
    name: 'Ahmad Tahat',
    id: '20220336',
    role: 'AI Engineer',
    icon: Brain,
    duties: 'Machine learning models, difficulty scoring algorithm, data analysis, and AI recommendations.',
    gradientFrom: 'from-blue',
    gradientTo: 'to-blue-sky',
    initials: 'AT',
  },
  {
    name: 'Elias Hreish',
    id: '20220677',
    role: 'UI/UX Engineer',
    icon: Palette,
    duties: 'Interface design, frontend development, user experience, and responsive design systems.',
    gradientFrom: 'from-gold',
    gradientTo: 'to-orange-400',
    initials: 'EH',
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="relative py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue bg-blue/10 rounded-full mb-4">
            Team
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
            Meet the Team
          </h2>
          <p className="mt-4 text-lg text-slate max-w-2xl mx-auto">
            Built with passion by PSUT Computer Science students.
          </p>
        </div>

        {/* Team cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {MEMBERS.map((member) => (
            <div
              key={member.id}
              className="group relative p-7 bg-bg rounded-2xl border border-border hover:border-blue/20 hover:shadow-xl hover:shadow-blue/5 hover:-translate-y-1 transition-all duration-300 text-center"
            >
              {/* Avatar */}
              <div className="mx-auto mb-5 relative">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradientFrom} ${member.gradientTo} flex items-center justify-center shadow-lg mx-auto`}
                >
                  <span className="font-display text-xl font-bold text-white">{member.initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 left-1/2 ml-4 w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center shadow-sm">
                  <member.icon className="w-4 h-4 text-ink" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-ink">{member.name}</h3>
              <p className="text-xs font-mono text-slate mt-1">{member.id}</p>
              <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-blue bg-blue/10 rounded-full">
                {member.role}
              </span>
              <p className="text-sm text-slate mt-4 leading-relaxed">{member.duties}</p>
            </div>
          ))}
        </div>

        {/* Supervisor */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-5 p-6 bg-ink rounded-2xl shadow-xl">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue to-blue-sky flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Project Supervisor
              </p>
              <p className="text-lg font-bold text-white mt-0.5">Prof. Anas Abu Taleb</p>
              <p className="text-sm text-white/50">PSUT Faculty</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

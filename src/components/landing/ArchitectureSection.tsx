interface Layer {
  number: string;
  title: string;
  color: string;
  labelBg: string;
  borderColor: string;
  chips: string[];
}

const LAYERS: Layer[] = [
  {
    number: '01',
    title: 'Presentation',
    color: 'text-blue',
    labelBg: 'bg-blue/10',
    borderColor: 'border-blue/20',
    chips: ['React 19', 'TypeScript', 'Tailwind CSS v4', 'React Router v7', 'Responsive UI'],
  },
  {
    number: '02',
    title: 'Application',
    color: 'text-green',
    labelBg: 'bg-green/10',
    borderColor: 'border-green/20',
    chips: ['Node.js', 'Express.js', 'Python', 'REST API', 'JWT Auth', 'Business Logic'],
  },
  {
    number: '03',
    title: 'Data',
    color: 'text-gold',
    labelBg: 'bg-gold/10',
    borderColor: 'border-gold/20',
    chips: ['MySQL', 'Redis Cache', 'Grade Records', 'User Data', 'Course Catalog'],
  },
  {
    number: '04',
    title: 'External',
    color: 'text-purple-400',
    labelBg: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20',
    chips: ['University SIS', 'LMS Integration', 'Email Service', 'Future APIs'],
  },
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="relative py-24 lg:py-32 bg-bg">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue bg-blue/10 rounded-full mb-4">
            Architecture
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
            System Architecture
          </h2>
          <p className="mt-4 text-lg text-slate max-w-2xl mx-auto">
            A layered architecture designed for scalability, maintainability, and clean separation
            of concerns.
          </p>
        </div>

        {/* Layers */}
        <div className="max-w-4xl mx-auto space-y-5">
          {LAYERS.map((layer) => (
            <div
              key={layer.number}
              className={`group flex flex-col sm:flex-row items-stretch bg-white rounded-2xl border ${layer.borderColor} hover:shadow-lg hover:shadow-blue/5 transition-all duration-300 overflow-hidden`}
            >
              {/* Label area */}
              <div
                className={`shrink-0 ${layer.labelBg} flex items-center gap-3 px-6 py-5 sm:w-56`}
              >
                <span className={`font-display text-2xl font-bold ${layer.color} opacity-40`}>
                  {layer.number}
                </span>
                <div>
                  <p className={`text-sm font-bold ${layer.color}`}>{layer.title}</p>
                  <p className="text-xs text-slate">Layer</p>
                </div>
              </div>

              {/* Chips */}
              <div className="flex-1 flex flex-wrap items-center gap-2 px-6 py-5">
                {layer.chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1.5 text-xs font-medium text-ink bg-bg rounded-lg border border-border"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Connection lines visual */}
          <div className="flex justify-center pt-4">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-full border border-border shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue" />
              <span className="text-xs font-medium text-slate">
                Data flows top-down &middot; Events bubble up
              </span>
              <div className="w-2 h-2 rounded-full bg-green" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

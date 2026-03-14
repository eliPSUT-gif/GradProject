import { ArrowRight, Sparkles, Brain, TrendingUp } from 'lucide-react';

const COURSES = [
  { name: 'Software Engineering', difficulty: 'Hard', color: 'text-red', barWidth: 'w-[85%]', barColor: 'bg-red' },
  { name: 'Database Systems', difficulty: 'Medium', color: 'text-gold', barWidth: 'w-[60%]', barColor: 'bg-gold' },
  { name: 'Operating Systems', difficulty: 'Hard', color: 'text-red', barWidth: 'w-[80%]', barColor: 'bg-red' },
  { name: 'Web Development', difficulty: 'Easy', color: 'text-green', barWidth: 'w-[35%]', barColor: 'bg-green' },
] as const;

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-navy">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-sky/15 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 pt-28 pb-20 lg:pt-32 lg:pb-28 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left column */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-medium text-white/70 tracking-wide uppercase">
              PSUT &mdash; King Hussein School of Computing Sciences
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight">
            <span className="text-white">Smart</span>
            <br />
            <span className="bg-gradient-to-r from-blue to-blue-sky bg-clip-text text-transparent">
              Academic
            </span>
            <br />
            <span className="text-white">Advisor</span>
          </h1>

          <p className="text-lg text-white/60 max-w-lg leading-relaxed">
            AI-powered course difficulty forecasting and schedule evaluation.
            Make data-driven decisions about your academic journey with
            intelligent workload analysis.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#features"
              className="group inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue to-blue-lt rounded-xl hover:shadow-xl hover:shadow-blue/25 hover:-translate-y-0.5 transition-all duration-300"
            >
              Explore Features
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#ai-engine"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white/80 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm"
            >
              View AI Engine
            </a>
          </div>
        </div>

        {/* Right column - Floating card */}
        <div className="relative flex justify-center lg:justify-end">
          {/* Floating chips */}
          <div className="absolute -top-4 left-4 lg:-left-4 animate-float-delay z-10">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
              <Brain className="w-4 h-4 text-blue-sky" />
              <span className="text-xs font-semibold text-white">AI-Powered Analysis</span>
            </div>
          </div>
          <div className="absolute -bottom-4 right-4 lg:-right-4 animate-float-delay-2 z-10">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
              <TrendingUp className="w-4 h-4 text-green" />
              <span className="text-xs font-semibold text-white">Real-time Scoring</span>
            </div>
          </div>

          {/* Main card */}
          <div className="animate-float w-full max-w-md">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                    Semester Difficulty Forecast
                  </p>
                  <p className="text-sm font-semibold text-white/80 mt-1">Fall 2025 &mdash; 15 Credits</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-display font-bold text-white">78%</span>
                  <span className="text-[10px] font-semibold text-red uppercase tracking-wide">
                    High Risk
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                <div className="h-full w-[78%] bg-gradient-to-r from-gold to-red rounded-full animate-fill-bar" />
              </div>

              {/* Course list */}
              <div className="space-y-3">
                {COURSES.map((course) => (
                  <div key={course.name} className="flex items-center justify-between">
                    <span className="text-sm text-white/70">{course.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${course.barWidth} ${course.barColor} rounded-full`} />
                      </div>
                      <span className={`text-xs font-semibold ${course.color} w-12 text-right`}>
                        {course.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI recommendation */}
              <div className="mt-5 p-3.5 bg-blue/10 border border-blue/20 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-sky mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-pale leading-relaxed">
                    <span className="font-semibold">AI Recommendation:</span> Consider replacing
                    Operating Systems with a lighter elective to reduce semester load to a
                    manageable level.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

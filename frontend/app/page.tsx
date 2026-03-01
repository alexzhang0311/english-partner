'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    title: 'Smart Review',
    description: 'Multiple review modes including flashcards, cloze, speaking, and writing exercises.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    title: 'AI Corrections',
    description: 'Instant feedback powered by advanced AI for writing and pronunciation.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Spaced Repetition',
    description: 'Scientifically-proven SM-2 algorithm for optimal long-term retention.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Track Progress',
    description: 'Monitor accuracy, streaks, and common mistakes to accelerate growth.',
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen-safe bg-premium-hero relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 sm:-left-32 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 sm:-right-32 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 md:px-12 lg:px-20 py-4 sm:py-6 safe-top">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-base sm:text-lg tracking-tight">English Partner</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
          <Button
            variant="premium"
            size="sm"
            className="text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
            onClick={() => router.push('/register')}
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-5 sm:px-8 md:px-12 pt-10 sm:pt-16 md:pt-20 lg:pt-24 pb-14 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="animate-fade-in-up opacity-0">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/60 text-[10px] sm:text-xs font-medium tracking-wide uppercase">AI-Powered Learning</span>
            </div>
          </div>

          <h1 className="animate-fade-in-up opacity-0 animate-delay-100 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6">
            <span className="text-gradient">Master English</span>
            <br />
            <span className="text-gradient-gold">Effortlessly</span>
          </h1>

          <p className="animate-fade-in-up opacity-0 animate-delay-200 text-white/50 text-base sm:text-lg md:text-xl max-w-md sm:max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light px-2">
            Build lasting fluency through intelligent spaced repetition,
            AI-powered corrections, and personalized daily reviews.
          </p>

          <div className="animate-fade-in-up opacity-0 animate-delay-300 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button
              variant="premium"
              size="lg"
              onClick={() => router.push('/register')}
              className="w-full sm:w-auto sm:min-w-[180px] h-12 sm:h-12 text-base"
            >
              Start Learning
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-white/60 hover:text-white hover:bg-white/5 border border-white/10 h-12 sm:h-12 text-base"
              onClick={() => router.push('/login')}
            >
              I have an account
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-4 sm:px-8 md:px-12 lg:px-20 pb-16 sm:pb-24 safe-bottom">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up opacity-0 animate-delay-${(index + 1) * 100} glass-dark rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 group hover:bg-white/[0.08] transition-all duration-300`}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center text-amber-400/80 mb-3 sm:mb-4 group-hover:bg-amber-500/10 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2">{feature.title}</h3>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom subtle line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </main>
  );
}

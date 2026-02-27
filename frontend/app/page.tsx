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
    <main className="min-h-screen bg-premium-hero relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 lg:px-20 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">English Partner</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
          <Button
            variant="premium"
            size="sm"
            onClick={() => router.push('/register')}
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 sm:pt-24 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="animate-fade-in-up opacity-0">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/60 text-xs font-medium tracking-wide uppercase">AI-Powered Learning</span>
            </div>
          </div>

          <h1 className="animate-fade-in-up opacity-0 animate-delay-100 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-gradient">Master English</span>
            <br />
            <span className="text-gradient-gold">Effortlessly</span>
          </h1>

          <p className="animate-fade-in-up opacity-0 animate-delay-200 text-white/50 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Build lasting fluency through intelligent spaced repetition, 
            AI-powered corrections, and personalized daily reviews.
          </p>

          <div className="animate-fade-in-up opacity-0 animate-delay-300 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="premium"
              size="lg"
              onClick={() => router.push('/register')}
              className="min-w-[180px]"
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
              className="text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
              onClick={() => router.push('/login')}
            >
              I have an account
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 sm:px-12 lg:px-20 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up opacity-0 animate-delay-${(index + 1) * 100} glass-dark rounded-2xl p-6 group hover:bg-white/[0.08] transition-all duration-300`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-400/80 mb-4 group-hover:bg-amber-500/10 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
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

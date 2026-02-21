'use client';

import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

export default function Landing() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen w-full overflow-y-auto flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
    >
      {/* Background orbs with drift animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, #38BDF8, transparent)',
            animation: 'orbDrift1 12s ease-in-out infinite',
          }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, #818CF8, transparent)',
            animation: 'orbDrift2 15s ease-in-out infinite',
          }} />

        {/* Faint dot grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center">
        {/* Staggered entrance: robot */}
        <div style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '0ms' }}>
          <DrakoRobot size="xl" state="greeting" className="mb-6" />
        </div>

        {/* Staggered entrance: title */}
        <h1
          className="text-5xl font-bold mb-3 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent"
          style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '150ms' }}
        >
          DRAKO
        </h1>

        {/* Staggered entrance: subtitle */}
        <p
          className="text-xl text-[#94A3B8] mb-2"
          style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '300ms' }}
        >
          Voice Schedule Builder
        </p>
        <p
          className="text-sm text-[#475569] mb-12"
          style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '450ms' }}
        >
          Built at the AI Interfaces Hackathon · Feb 21, 2026
        </p>

        {/* Staggered entrance: CTA with shimmer + glow */}
        <div style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '600ms' }}>
          <button
            onClick={() => router.push('/onboarding?fresh=1')}
            className="relative w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white mb-6 btn-glow overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
              boxShadow: '0 0 40px rgba(56,189,248,0.3)',
            }}
          >
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                animation: 'shimmerSweep 3s ease-in-out infinite',
              }}
            />
            <span className="relative z-10">Build My Day &rarr;</span>
          </button>
        </div>

        <p
          className="text-xs text-[#475569] mb-12"
          style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards', animationDelay: '750ms' }}
        >
          Takes 60 seconds · No sign-up needed
        </p>

        {/* Staggered tech badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['Claude AI', 'Tavus CVI', 'Redis', 'Next.js'].map((tech, i) => (
            <span key={tech}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(56,189,248,0.1)',
                color: '#38BDF8',
                border: '1px solid rgba(56,189,248,0.2)',
                opacity: 0,
                animation: 'fadeInUp 500ms ease-out forwards',
                animationDelay: `${900 + i * 100}ms`,
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

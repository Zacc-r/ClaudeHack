'use client';

import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

export default function Landing() {
  const router = useRouter();

  // Landing page always shows — user taps "Build My Day" to start fresh

  return (
    <div
      className="min-h-screen w-full overflow-y-auto flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
    >
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #818CF8, transparent)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center">
        <DrakoRobot size="xl" state="greeting" className="mb-6" />

        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
          DRAKO
        </h1>
        <p className="text-xl text-[#94A3B8] mb-2">Voice Schedule Builder</p>
        <p className="text-sm text-[#475569] mb-12">
          Built at the AI Interfaces Hackathon · Feb 21, 2026
        </p>

        <button
          onClick={() => router.push('/onboarding?fresh=1')}
          className="w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
          style={{
            background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
            boxShadow: '0 0 40px rgba(56,189,248,0.3)',
          }}
        >
          Build My Day →
        </button>

        <p className="text-xs text-[#475569] mb-12">
          Takes 60 seconds · No sign-up needed
        </p>

        {/* Tech stack badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['Claude AI', 'Tavus CVI', 'Redis', 'Next.js'].map(tech => (
            <span key={tech}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

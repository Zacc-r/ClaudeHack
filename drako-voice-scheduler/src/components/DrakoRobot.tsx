'use client';

interface DrakoRobotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'idle' | 'greeting' | 'thinking' | 'listening';
  className?: string;
}

const sizes = {
  sm: { container: 60, body: 40, eye: 6 },
  md: { container: 100, body: 64, eye: 10 },
  lg: { container: 140, body: 90, eye: 14 },
  xl: { container: 180, body: 120, eye: 18 },
};

export function DrakoRobot({ size = 'lg', state = 'idle', className = '' }: DrakoRobotProps) {
  const s = sizes[size];
  
  const stateClass = {
    idle: 'animate-robotIdle',
    greeting: 'animate-robotGreeting',
    thinking: 'animate-robotThinking',
    listening: 'animate-eyePulse',
  }[state];

  return (
    <div 
      className={`relative flex items-center justify-center ${stateClass} ${className}`}
      style={{ width: s.container, height: s.container }}
    >
      <svg
        viewBox="0 0 100 100"
        width={s.body}
        height={s.body}
        className="drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Antenna */}
        <line 
          x1="50" y1="8" x2="50" y2="18" 
          stroke="url(#accentGradient)" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <circle cx="50" cy="6" r="4" fill="#38BDF8" filter="url(#glow)">
          <animate 
            attributeName="opacity" 
            values="0.5;1;0.5" 
            dur="1.5s" 
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Head - rounded rectangle */}
        <rect 
          x="20" y="18" 
          width="60" height="50" 
          rx="12" ry="12"
          fill="url(#bodyGradient)"
          stroke="url(#accentGradient)"
          strokeWidth="2"
        />
        
        {/* Visor / Face plate */}
        <rect 
          x="28" y="28" 
          width="44" height="24" 
          rx="6" ry="6"
          fill="#0F172A"
          opacity="0.8"
        />
        
        {/* Eyes */}
        <ellipse 
          cx="38" cy="40" 
          rx="6" ry="7" 
          fill="#38BDF8"
          filter="url(#glow)"
        >
          {state === 'thinking' && (
            <animate 
              attributeName="ry" 
              values="7;2;7" 
              dur="0.8s" 
              repeatCount="indefinite"
            />
          )}
        </ellipse>
        <ellipse 
          cx="62" cy="40" 
          rx="6" ry="7" 
          fill="#38BDF8"
          filter="url(#glow)"
        >
          {state === 'thinking' && (
            <animate 
              attributeName="ry" 
              values="7;2;7" 
              dur="0.8s" 
              repeatCount="indefinite"
              begin="0.1s"
            />
          )}
        </ellipse>
        
        {/* Eye highlights */}
        <circle cx="36" cy="38" r="2" fill="white" opacity="0.6" />
        <circle cx="60" cy="38" r="2" fill="white" opacity="0.6" />
        
        {/* Mouth - horizontal line that curves up when greeting */}
        <path 
          d={state === 'greeting' ? "M 38 52 Q 50 58 62 52" : "M 38 52 Q 50 54 62 52"}
          stroke="#818CF8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Body */}
        <rect 
          x="30" y="70" 
          width="40" height="24" 
          rx="6" ry="6"
          fill="url(#bodyGradient)"
          stroke="url(#accentGradient)"
          strokeWidth="1.5"
        />
        
        {/* Body accent lines */}
        <line x1="38" y1="76" x2="62" y2="76" stroke="#818CF8" strokeWidth="1" opacity="0.5" />
        <line x1="38" y1="82" x2="62" y2="82" stroke="#38BDF8" strokeWidth="1" opacity="0.5" />
        <line x1="38" y1="88" x2="62" y2="88" stroke="#818CF8" strokeWidth="1" opacity="0.5" />
        
        {/* Chest indicator */}
        <circle cx="50" cy="82" r="4" fill="#38BDF8" filter="url(#glow)">
          <animate 
            attributeName="opacity" 
            values="0.6;1;0.6" 
            dur="2s" 
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      
      {/* Glow effect behind robot */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 blur-xl -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(129, 140, 248, 0.2) 50%, transparent 70%)',
        }}
      />
    </div>
  );
}

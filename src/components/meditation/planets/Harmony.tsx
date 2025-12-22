export function Harmony() {
  return (
    <div className="relative" style={{ animation: "float 18s ease-in-out infinite" }}>
      {/* Atmospheric glow - balanced green/pink */}
      <div
        className="absolute rounded-full blur-3xl opacity-45"
        style={{
          width: "300px",
          height: "300px",
          left: "-25px",
          top: "-25px",
          background: "radial-gradient(circle, rgba(0, 168, 107, 0.2) 0%, rgba(255, 105, 180, 0.15) 60%, transparent 75%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 28px rgba(0, 168, 107, 0.3))" }}
      >
        <defs>
          {/* Base planet gradient - teal/emerald */}
          <radialGradient id="harmonyBase" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#20B2AA" />
            <stop offset="50%" stopColor="#2E8B57" />
            <stop offset="100%" stopColor="#006400" />
          </radialGradient>

          {/* Symbol gradient - rose gold */}
          <linearGradient id="harmonySymbol" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4C430" />
            <stop offset="100%" stopColor="#FF69B4" />
          </linearGradient>

          {/* Banding pattern */}
          <linearGradient id="harmonyBands" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          
          <radialGradient id="harmonyShadow" cx="75%" cy="75%" r="60%">
             <stop offset="0%" stopColor="transparent" />
             <stop offset="60%" stopColor="rgba(5, 20, 10, 0.5)" />
             <stop offset="100%" stopColor="rgba(0, 10, 5, 0.9)" />
          </radialGradient>

          <radialGradient id="harmonyHighlight" cx="20%" cy="20%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

           <clipPath id="harmonyClip">
            <circle cx="125" cy="125" r="85" />
          </clipPath>
        </defs>

        {/* Planet Base */}
        <circle cx="125" cy="125" r="85" fill="url(#harmonyBase)" />
        <rect x="0" y="0" width="250" height="250" fill="url(#harmonyBands)" clipPath="url(#harmonyClip)" transform="rotate(25 125 125)" />

        {/* Occult/Sacred Geometry Symbol - Vesica Piscis / Interlocking Circles */}
        <g clipPath="url(#harmonyClip)" opacity="0.7">
            {/* The two main interlocking circles */}
            <circle cx="100" cy="125" r="45" fill="none" stroke="url(#harmonySymbol)" strokeWidth="1.5" />
            <circle cx="150" cy="125" r="45" fill="none" stroke="url(#harmonySymbol)" strokeWidth="1.5" />
            
            {/* Central lens shape highlight */}
             <path d="M125 80 Q 155 125, 125 170 Q 95 125, 125 80" fill="rgba(255, 105, 180, 0.1)" stroke="none" />

            {/* Connecting lines */}
            <line x1="55" y1="125" x2="195" y2="125" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            <circle cx="125" cy="125" r="75" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
            
            {/* Small nodes at intersections */}
            <circle cx="125" cy="80" r="3" fill="#F4C430" opacity="0.8" />
            <circle cx="125" cy="170" r="3" fill="#F4C430" opacity="0.8" />
            <circle cx="100" cy="125" r="2" fill="#FF69B4" opacity="0.8" />
            <circle cx="150" cy="125" r="2" fill="#FF69B4" opacity="0.8" />
        </g>

        <circle cx="125" cy="125" r="85" fill="url(#harmonyShadow)" />
        <circle cx="125" cy="125" r="85" fill="url(#harmonyHighlight)" />
        
        {/* Double Ring System */}
        <g transform="rotate(-15 125 125)" opacity="0.6">
            <ellipse cx="125" cy="125" rx="110" ry="25" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="8"/>
            <ellipse cx="125" cy="125" rx="105" ry="20" fill="none" stroke="rgba(255, 105, 180, 0.2)" strokeWidth="2"/>
        </g>
        
        {/* Glowing Rim */}
         <circle cx="125" cy="125" r="85" fill="none" stroke="rgba(46, 139, 87, 0.5)" strokeWidth="1" />

      </svg>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}

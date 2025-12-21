export function Mercury() {
  return (
    <div className="relative" style={{ animation: "float 10s ease-in-out infinite" }}>
      {/* Subtle glow */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: "200px",
          height: "200px",
          left: "0px",
          top: "0px",
          background: "radial-gradient(circle, rgba(180, 170, 160, 0.15) 0%, transparent 60%)",
        }}
      />

      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 20px rgba(180, 170, 160, 0.2))" }}
      >
        <defs>
          {/* Base gradient - gray rocky surface */}
          <radialGradient id="mercuryBase" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#b5b0a8" />
            <stop offset="40%" stopColor="#8a8580" />
            <stop offset="80%" stopColor="#6b6560" />
            <stop offset="100%" stopColor="#4a4540" />
          </radialGradient>

          {/* Shadow */}
          <radialGradient id="mercuryShadow" cx="70%" cy="70%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="rgba(20, 18, 15, 0.4)" />
            <stop offset="100%" stopColor="rgba(20, 18, 15, 0.8)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="mercuryHighlight" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Crater texture pattern */}
          <pattern id="mercuryCraters" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="4" fill="rgba(60, 55, 50, 0.3)" />
            <circle cx="30" cy="25" r="6" fill="rgba(60, 55, 50, 0.25)" />
            <circle cx="15" cy="35" r="3" fill="rgba(60, 55, 50, 0.2)" />
            <circle cx="35" cy="8" r="2" fill="rgba(60, 55, 50, 0.25)" />
          </pattern>

          <clipPath id="mercuryClip">
            <circle cx="100" cy="100" r="70" />
          </clipPath>
        </defs>

        {/* Planet body */}
        <circle cx="100" cy="100" r="70" fill="url(#mercuryBase)" />

        {/* Crater texture */}
        <circle cx="100" cy="100" r="70" fill="url(#mercuryCraters)" clipPath="url(#mercuryClip)" />

        {/* Large craters */}
        <g clipPath="url(#mercuryClip)">
          <ellipse cx="75" cy="85" rx="12" ry="10" fill="rgba(80, 75, 70, 0.4)" />
          <ellipse cx="75" cy="85" rx="10" ry="8" fill="rgba(100, 95, 90, 0.3)" />
          <ellipse cx="120" cy="110" rx="8" ry="7" fill="rgba(80, 75, 70, 0.35)" />
          <ellipse cx="90" cy="130" rx="6" ry="5" fill="rgba(80, 75, 70, 0.3)" />
          <ellipse cx="110" cy="70" rx="5" ry="4" fill="rgba(80, 75, 70, 0.25)" />
        </g>

        {/* Shadow */}
        <circle cx="100" cy="100" r="70" fill="url(#mercuryShadow)" />

        {/* Highlight */}
        <circle cx="100" cy="100" r="70" fill="url(#mercuryHighlight)" />

        {/* Rim light */}
        <circle
          cx="100"
          cy="100"
          r="69"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
      </svg>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

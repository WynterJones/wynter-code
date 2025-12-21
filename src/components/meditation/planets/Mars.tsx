export function Mars() {
  return (
    <div className="relative" style={{ animation: "float 11s ease-in-out infinite" }}>
      {/* Subtle reddish glow */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: "220px",
          height: "220px",
          left: "-10px",
          top: "-10px",
          background: "radial-gradient(circle, rgba(200, 100, 80, 0.15) 0%, rgba(180, 80, 60, 0.08) 50%, transparent 60%)",
        }}
      />

      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 20px rgba(200, 100, 80, 0.25))" }}
      >
        <defs>
          {/* Base rust/red gradient */}
          <radialGradient id="marsBase" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#d4845a" />
            <stop offset="30%" stopColor="#c46a45" />
            <stop offset="60%" stopColor="#a85535" />
            <stop offset="100%" stopColor="#7a3a25" />
          </radialGradient>

          {/* Dark regions */}
          <radialGradient id="marsDark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6a3020" />
            <stop offset="100%" stopColor="#5a2818" />
          </radialGradient>

          {/* Shadow */}
          <radialGradient id="marsShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(40, 15, 10, 0.4)" />
            <stop offset="100%" stopColor="rgba(25, 10, 5, 0.75)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="marsHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 220, 200, 0.35)" />
            <stop offset="50%" stopColor="rgba(255, 200, 180, 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Thin atmosphere */}
          <radialGradient id="marsAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="90%" stopColor="transparent" />
            <stop offset="98%" stopColor="rgba(255, 180, 150, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 180, 150, 0.15)" />
          </radialGradient>

          <clipPath id="marsClip">
            <circle cx="100" cy="100" r="70" />
          </clipPath>
        </defs>

        {/* Planet body */}
        <circle cx="100" cy="100" r="70" fill="url(#marsBase)" />

        {/* Dark regions (mare) */}
        <g clipPath="url(#marsClip)" opacity="0.5">
          <ellipse cx="80" cy="95" rx="25" ry="18" fill="url(#marsDark)" transform="rotate(-10 80 95)" />
          <ellipse cx="115" cy="110" rx="20" ry="15" fill="url(#marsDark)" transform="rotate(15 115 110)" />
          <ellipse cx="95" cy="130" rx="18" ry="12" fill="url(#marsDark)" transform="rotate(-5 95 130)" />
        </g>

        {/* Lighter regions */}
        <g clipPath="url(#marsClip)" opacity="0.3">
          <ellipse cx="105" cy="75" rx="15" ry="10" fill="rgba(230, 160, 130, 0.6)" />
          <ellipse cx="70" cy="120" rx="12" ry="8" fill="rgba(230, 160, 130, 0.5)" />
        </g>

        {/* Olympus Mons-like feature */}
        <g clipPath="url(#marsClip)">
          <circle cx="90" cy="85" r="8" fill="rgba(180, 110, 80, 0.4)" />
          <circle cx="90" cy="85" r="5" fill="rgba(160, 90, 65, 0.5)" />
        </g>

        {/* Valles Marineris-like canyon */}
        <g clipPath="url(#marsClip)">
          <path
            d="M75 105 Q90 100 110 108 Q125 112 130 105"
            fill="none"
            stroke="rgba(100, 50, 35, 0.4)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Polar ice caps */}
        <g clipPath="url(#marsClip)">
          <ellipse cx="100" cy="35" rx="25" ry="10" fill="rgba(255, 255, 255, 0.85)" />
          <ellipse cx="100" cy="35" rx="20" ry="7" fill="rgba(240, 250, 255, 0.9)" />
          <ellipse cx="100" cy="165" rx="20" ry="8" fill="rgba(255, 255, 255, 0.7)" />
          <ellipse cx="100" cy="165" rx="15" ry="5" fill="rgba(240, 250, 255, 0.8)" />
        </g>

        {/* Shadow */}
        <circle cx="100" cy="100" r="70" fill="url(#marsShadow)" />

        {/* Highlight */}
        <circle cx="100" cy="100" r="70" fill="url(#marsHighlight)" />

        {/* Thin atmosphere rim */}
        <circle cx="100" cy="100" r="72" fill="url(#marsAtmosphere)" />

        {/* Rim light */}
        <circle
          cx="100"
          cy="100"
          r="69"
          fill="none"
          stroke="rgba(255, 200, 180, 0.1)"
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

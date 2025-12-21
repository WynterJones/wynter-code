export function Earth() {
  return (
    <div className="relative" style={{ animation: "float 12s ease-in-out infinite" }}>
      {/* Atmospheric glow - blue */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          left: "-25px",
          top: "-25px",
          background: "radial-gradient(circle, rgba(100, 180, 255, 0.2) 0%, rgba(70, 150, 220, 0.1) 40%, transparent 60%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(100, 180, 255, 0.3))" }}
      >
        <defs>
          {/* Ocean gradient */}
          <radialGradient id="earthOcean" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#5b9bd5" />
            <stop offset="40%" stopColor="#3d7ab8" />
            <stop offset="80%" stopColor="#2a5a8a" />
            <stop offset="100%" stopColor="#1a3a5c" />
          </radialGradient>

          {/* Land color */}
          <linearGradient id="earthLand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5a8a50" />
            <stop offset="50%" stopColor="#4a7a45" />
            <stop offset="100%" stopColor="#3a6a38" />
          </linearGradient>

          {/* Desert/brown land */}
          <linearGradient id="earthDesert" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="100%" stopColor="#a08050" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="earthShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(10, 30, 50, 0.4)" />
            <stop offset="100%" stopColor="rgba(5, 15, 30, 0.8)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="earthHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="50%" stopColor="rgba(200, 230, 255, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Atmosphere rim */}
          <radialGradient id="earthAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="93%" stopColor="rgba(135, 206, 250, 0.3)" />
            <stop offset="100%" stopColor="rgba(135, 206, 250, 0.5)" />
          </radialGradient>

          <clipPath id="earthClip">
            <circle cx="125" cy="125" r="85" />
          </clipPath>
        </defs>

        {/* Ocean base */}
        <circle cx="125" cy="125" r="85" fill="url(#earthOcean)" />

        {/* Continents */}
        <g clipPath="url(#earthClip)">
          {/* North America-ish */}
          <path
            d="M70 70 Q90 60 110 65 Q120 70 115 85 Q110 100 95 105 Q80 108 70 95 Q65 80 70 70Z"
            fill="url(#earthLand)"
          />
          {/* South America-ish */}
          <path
            d="M85 120 Q95 115 100 125 Q105 145 100 165 Q95 175 85 170 Q80 155 82 135 Q83 125 85 120Z"
            fill="url(#earthLand)"
          />
          {/* Europe/Africa-ish */}
          <path
            d="M135 75 Q150 70 160 80 Q165 95 155 100 Q150 105 145 95 Q140 85 135 75Z"
            fill="url(#earthLand)"
          />
          <path
            d="M140 105 Q155 100 165 115 Q170 140 160 165 Q150 175 140 160 Q135 135 140 105Z"
            fill="url(#earthDesert)"
          />
          {/* Asia-ish */}
          <path
            d="M165 65 Q185 60 195 75 Q200 95 190 105 Q175 115 165 100 Q160 85 165 65Z"
            fill="url(#earthLand)"
          />
          {/* Australia-ish */}
          <ellipse cx="185" cy="155" rx="15" ry="12" fill="url(#earthDesert)" />
        </g>

        {/* Ice caps */}
        <g clipPath="url(#earthClip)">
          <ellipse cx="125" cy="45" rx="35" ry="12" fill="rgba(255, 255, 255, 0.8)" />
          <ellipse cx="125" cy="205" rx="30" ry="10" fill="rgba(255, 255, 255, 0.7)" />
        </g>

        {/* Clouds */}
        <g clipPath="url(#earthClip)" opacity="0.7">
          <ellipse cx="95" cy="90" rx="25" ry="8" fill="rgba(255, 255, 255, 0.6)" transform="rotate(-10 95 90)" />
          <ellipse cx="160" cy="85" rx="20" ry="6" fill="rgba(255, 255, 255, 0.5)" transform="rotate(15 160 85)" />
          <ellipse cx="110" cy="145" rx="30" ry="7" fill="rgba(255, 255, 255, 0.55)" transform="rotate(-5 110 145)" />
          <ellipse cx="155" cy="130" rx="18" ry="5" fill="rgba(255, 255, 255, 0.5)" />
          <ellipse cx="80" cy="165" rx="15" ry="5" fill="rgba(255, 255, 255, 0.45)" transform="rotate(10 80 165)" />
        </g>

        {/* Shadow */}
        <circle cx="125" cy="125" r="85" fill="url(#earthShadow)" />

        {/* Highlight */}
        <circle cx="125" cy="125" r="85" fill="url(#earthHighlight)" />

        {/* Atmospheric glow rim */}
        <circle cx="125" cy="125" r="88" fill="url(#earthAtmosphere)" />

        {/* Rim light */}
        <circle
          cx="125"
          cy="125"
          r="84"
          fill="none"
          stroke="rgba(135, 206, 250, 0.2)"
          strokeWidth="1.5"
        />
      </svg>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

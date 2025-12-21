export function Venus() {
  return (
    <div className="relative" style={{ animation: "float 11s ease-in-out infinite" }}>
      {/* Atmospheric glow */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "280px",
          height: "280px",
          left: "-15px",
          top: "-15px",
          background: "radial-gradient(circle, rgba(245, 220, 180, 0.2) 0%, rgba(230, 200, 150, 0.1) 40%, transparent 60%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(245, 220, 180, 0.25))" }}
      >
        <defs>
          {/* Base gradient - yellowish tan */}
          <radialGradient id="venusBase" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f5e6c8" />
            <stop offset="30%" stopColor="#e8d4a8" />
            <stop offset="60%" stopColor="#d4bc8a" />
            <stop offset="100%" stopColor="#b09060" />
          </radialGradient>

          {/* Cloud layer gradient */}
          <linearGradient id="venusClouds" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 250, 240, 0.3)" />
            <stop offset="50%" stopColor="rgba(240, 220, 180, 0.2)" />
            <stop offset="100%" stopColor="rgba(220, 190, 140, 0.3)" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="venusShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(100, 80, 50, 0.3)" />
            <stop offset="100%" stopColor="rgba(60, 45, 25, 0.7)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="venusHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 255, 250, 0.4)" />
            <stop offset="50%" stopColor="rgba(255, 250, 230, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Atmosphere rim */}
          <radialGradient id="venusAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="95%" stopColor="rgba(255, 240, 200, 0.2)" />
            <stop offset="100%" stopColor="rgba(255, 240, 200, 0.4)" />
          </radialGradient>

          <clipPath id="venusClip">
            <circle cx="125" cy="125" r="85" />
          </clipPath>
        </defs>

        {/* Planet body */}
        <circle cx="125" cy="125" r="85" fill="url(#venusBase)" />

        {/* Cloud bands */}
        <g clipPath="url(#venusClip)" opacity="0.6">
          <ellipse cx="125" cy="80" rx="100" ry="15" fill="rgba(255, 250, 235, 0.25)" />
          <ellipse cx="125" cy="105" rx="95" ry="12" fill="rgba(230, 210, 170, 0.2)" />
          <ellipse cx="125" cy="135" rx="100" ry="18" fill="rgba(255, 245, 220, 0.25)" />
          <ellipse cx="125" cy="160" rx="90" ry="10" fill="rgba(220, 195, 150, 0.2)" />
        </g>

        {/* Swirling cloud features */}
        <g clipPath="url(#venusClip)" opacity="0.4">
          <ellipse
            cx="100" cy="110" rx="25" ry="15"
            fill="rgba(255, 250, 230, 0.3)"
            transform="rotate(-15 100 110)"
          />
          <ellipse
            cx="145" cy="140" rx="20" ry="12"
            fill="rgba(255, 248, 225, 0.25)"
            transform="rotate(10 145 140)"
          />
        </g>

        {/* Cloud overlay */}
        <circle cx="125" cy="125" r="85" fill="url(#venusClouds)" />

        {/* Shadow */}
        <circle cx="125" cy="125" r="85" fill="url(#venusShadow)" />

        {/* Highlight */}
        <circle cx="125" cy="125" r="85" fill="url(#venusHighlight)" />

        {/* Atmospheric glow rim */}
        <circle cx="125" cy="125" r="87" fill="url(#venusAtmosphere)" />

        {/* Rim light */}
        <circle
          cx="125"
          cy="125"
          r="84"
          fill="none"
          stroke="rgba(255, 250, 230, 0.15)"
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

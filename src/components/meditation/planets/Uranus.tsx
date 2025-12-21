export function Uranus() {
  return (
    <div className="relative" style={{ animation: "float 13s ease-in-out infinite" }}>
      {/* Cyan glow */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "320px",
          height: "320px",
          left: "-35px",
          top: "-35px",
          background: "radial-gradient(circle, rgba(150, 220, 220, 0.18) 0%, rgba(130, 200, 210, 0.08) 40%, transparent 60%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(150, 220, 220, 0.3))" }}
      >
        <defs>
          {/* Base gradient - pale blue-green */}
          <radialGradient id="uranusBase" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#b8e8e8" />
            <stop offset="30%" stopColor="#90d4d8" />
            <stop offset="60%" stopColor="#70bcc5" />
            <stop offset="100%" stopColor="#4a9098" />
          </radialGradient>

          {/* Subtle bands */}
          <linearGradient id="uranusBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(200, 240, 240, 0.3)" />
            <stop offset="50%" stopColor="rgba(180, 230, 235, 0.2)" />
            <stop offset="100%" stopColor="rgba(200, 240, 240, 0.3)" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="uranusShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(30, 70, 80, 0.35)" />
            <stop offset="100%" stopColor="rgba(20, 50, 60, 0.7)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="uranusHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(230, 255, 255, 0.4)" />
            <stop offset="50%" stopColor="rgba(200, 245, 250, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Ring gradient - very faint */}
          <linearGradient id="uranusRing" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(180, 200, 210, 0)" />
            <stop offset="20%" stopColor="rgba(200, 220, 230, 0.25)" />
            <stop offset="50%" stopColor="rgba(210, 230, 240, 0.35)" />
            <stop offset="80%" stopColor="rgba(200, 220, 230, 0.25)" />
            <stop offset="100%" stopColor="rgba(180, 200, 210, 0)" />
          </linearGradient>

          {/* Atmosphere */}
          <radialGradient id="uranusAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="transparent" />
            <stop offset="95%" stopColor="rgba(180, 230, 235, 0.2)" />
            <stop offset="100%" stopColor="rgba(180, 230, 235, 0.35)" />
          </radialGradient>

          <clipPath id="uranusClip">
            <circle cx="125" cy="125" r="75" />
          </clipPath>

          {/* Clip for ring behind planet */}
          <clipPath id="uranusRingBackClip">
            <rect x="0" y="0" width="250" height="125" />
          </clipPath>

          {/* Clip for ring in front */}
          <clipPath id="uranusRingFrontClip">
            <rect x="0" y="125" width="250" height="125" />
          </clipPath>
        </defs>

        {/* Back ring (Uranus has vertical rings due to axial tilt - simplified here) */}
        <g clipPath="url(#uranusRingBackClip)" opacity="0.4">
          <ellipse cx="125" cy="125" rx="110" ry="15" fill="none" stroke="url(#uranusRing)" strokeWidth="8" />
        </g>

        {/* Planet body */}
        <circle cx="125" cy="125" r="75" fill="url(#uranusBase)" />

        {/* Very subtle bands */}
        <g clipPath="url(#uranusClip)" opacity="0.3">
          <ellipse cx="125" cy="90" rx="85" ry="10" fill="url(#uranusBand)" />
          <ellipse cx="125" cy="125" rx="85" ry="12" fill="url(#uranusBand)" />
          <ellipse cx="125" cy="160" rx="85" ry="10" fill="url(#uranusBand)" />
        </g>

        {/* Slight polar brightening */}
        <g clipPath="url(#uranusClip)" opacity="0.4">
          <ellipse cx="125" cy="55" rx="40" ry="15" fill="rgba(220, 250, 250, 0.4)" />
          <ellipse cx="125" cy="195" rx="35" ry="12" fill="rgba(200, 240, 245, 0.3)" />
        </g>

        {/* Shadow */}
        <circle cx="125" cy="125" r="75" fill="url(#uranusShadow)" />

        {/* Highlight */}
        <circle cx="125" cy="125" r="75" fill="url(#uranusHighlight)" />

        {/* Front ring */}
        <g clipPath="url(#uranusRingFrontClip)" opacity="0.5">
          <ellipse cx="125" cy="125" rx="110" ry="15" fill="none" stroke="url(#uranusRing)" strokeWidth="8" />
          <ellipse cx="125" cy="125" rx="100" ry="13" fill="none" stroke="url(#uranusRing)" strokeWidth="3" opacity="0.5" />
        </g>

        {/* Atmosphere rim */}
        <circle cx="125" cy="125" r="78" fill="url(#uranusAtmosphere)" />

        {/* Rim light */}
        <circle
          cx="125"
          cy="125"
          r="74"
          fill="none"
          stroke="rgba(200, 245, 250, 0.15)"
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

export function Neptune() {
  return (
    <div className="relative" style={{ animation: "float 15s ease-in-out infinite" }}>
      {/* Deep blue glow */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          left: "-25px",
          top: "-25px",
          background: "radial-gradient(circle, rgba(80, 120, 200, 0.2) 0%, rgba(60, 100, 180, 0.1) 40%, transparent 60%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(80, 120, 200, 0.35))" }}
      >
        <defs>
          {/* Base gradient - deep azure blue */}
          <radialGradient id="neptuneBase" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#6090d0" />
            <stop offset="30%" stopColor="#4878c0" />
            <stop offset="60%" stopColor="#3560a8" />
            <stop offset="100%" stopColor="#203870" />
          </radialGradient>

          {/* Band colors */}
          <linearGradient id="neptuneBandLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(120, 160, 220, 0.4)" />
            <stop offset="50%" stopColor="rgba(100, 150, 210, 0.3)" />
            <stop offset="100%" stopColor="rgba(120, 160, 220, 0.4)" />
          </linearGradient>

          <linearGradient id="neptuneBandDark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(40, 70, 130, 0.4)" />
            <stop offset="50%" stopColor="rgba(30, 60, 120, 0.3)" />
            <stop offset="100%" stopColor="rgba(40, 70, 130, 0.4)" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="neptuneShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(15, 30, 60, 0.4)" />
            <stop offset="100%" stopColor="rgba(10, 20, 45, 0.75)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="neptuneHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(180, 210, 255, 0.4)" />
            <stop offset="50%" stopColor="rgba(150, 190, 240, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Ring gradient - very faint */}
          <linearGradient id="neptuneRing" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(100, 140, 180, 0)" />
            <stop offset="25%" stopColor="rgba(120, 160, 200, 0.2)" />
            <stop offset="50%" stopColor="rgba(140, 180, 220, 0.25)" />
            <stop offset="75%" stopColor="rgba(120, 160, 200, 0.2)" />
            <stop offset="100%" stopColor="rgba(100, 140, 180, 0)" />
          </linearGradient>

          {/* Atmosphere */}
          <radialGradient id="neptuneAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="transparent" />
            <stop offset="95%" stopColor="rgba(100, 150, 220, 0.25)" />
            <stop offset="100%" stopColor="rgba(100, 150, 220, 0.4)" />
          </radialGradient>

          <clipPath id="neptuneClip">
            <circle cx="125" cy="125" r="75" />
          </clipPath>

          {/* Ring clips */}
          <clipPath id="neptuneRingBackClip">
            <rect x="0" y="125" width="250" height="125" />
          </clipPath>
          <clipPath id="neptuneRingFrontClip">
            <rect x="0" y="0" width="250" height="125" />
          </clipPath>
        </defs>

        {/* Back ring */}
        <g clipPath="url(#neptuneRingBackClip)" opacity="0.3">
          <ellipse cx="125" cy="125" rx="105" ry="20" fill="none" stroke="url(#neptuneRing)" strokeWidth="6" />
        </g>

        {/* Planet body */}
        <circle cx="125" cy="125" r="75" fill="url(#neptuneBase)" />

        {/* Atmospheric bands */}
        <g clipPath="url(#neptuneClip)">
          <ellipse cx="125" cy="85" rx="85" ry="12" fill="url(#neptuneBandLight)" opacity="0.5" />
          <ellipse cx="125" cy="110" rx="85" ry="10" fill="url(#neptuneBandDark)" opacity="0.4" />
          <ellipse cx="125" cy="140" rx="85" ry="14" fill="url(#neptuneBandLight)" opacity="0.45" />
          <ellipse cx="125" cy="170" rx="85" ry="10" fill="url(#neptuneBandDark)" opacity="0.35" />
        </g>

        {/* Great Dark Spot */}
        <g clipPath="url(#neptuneClip)">
          <ellipse
            cx="105"
            cy="115"
            rx="15"
            ry="10"
            fill="rgba(25, 50, 90, 0.6)"
          />
          <ellipse
            cx="105"
            cy="115"
            rx="12"
            ry="7"
            fill="rgba(20, 40, 80, 0.5)"
          />
          {/* Bright companion cloud */}
          <ellipse
            cx="118"
            cy="108"
            rx="8"
            ry="4"
            fill="rgba(180, 210, 255, 0.5)"
          />
        </g>

        {/* White clouds/storms */}
        <g clipPath="url(#neptuneClip)" opacity="0.6">
          <ellipse cx="145" cy="140" rx="10" ry="5" fill="rgba(200, 220, 255, 0.6)" transform="rotate(-10 145 140)" />
          <ellipse cx="90" cy="160" rx="8" ry="4" fill="rgba(190, 215, 255, 0.5)" transform="rotate(15 90 160)" />
          <ellipse cx="155" cy="95" rx="6" ry="3" fill="rgba(200, 225, 255, 0.5)" />
        </g>

        {/* Shadow */}
        <circle cx="125" cy="125" r="75" fill="url(#neptuneShadow)" />

        {/* Highlight */}
        <circle cx="125" cy="125" r="75" fill="url(#neptuneHighlight)" />

        {/* Front ring */}
        <g clipPath="url(#neptuneRingFrontClip)" opacity="0.4">
          <ellipse cx="125" cy="125" rx="105" ry="20" fill="none" stroke="url(#neptuneRing)" strokeWidth="6" />
          <ellipse cx="125" cy="125" rx="95" ry="18" fill="none" stroke="url(#neptuneRing)" strokeWidth="2" opacity="0.5" />
        </g>

        {/* Atmosphere rim */}
        <circle cx="125" cy="125" r="78" fill="url(#neptuneAtmosphere)" />

        {/* Rim light */}
        <circle
          cx="125"
          cy="125"
          r="74"
          fill="none"
          stroke="rgba(140, 180, 240, 0.18)"
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

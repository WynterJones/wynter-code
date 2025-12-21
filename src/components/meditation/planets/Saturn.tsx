export function Saturn() {
  return (
    <div className="relative" style={{ animation: "float 12s ease-in-out infinite" }}>
      {/* Warm glow */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "400px",
          height: "300px",
          left: "-50px",
          top: "-25px",
          background: "radial-gradient(ellipse, rgba(230, 200, 160, 0.12) 0%, rgba(210, 180, 140, 0.06) 40%, transparent 60%)",
          animation: "pulse-glow 8s ease-in-out infinite",
        }}
      />

      <svg
        width="300"
        height="250"
        viewBox="0 0 300 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(230, 200, 160, 0.2))" }}
      >
        <defs>
          {/* Planet base gradient - pale gold/tan */}
          <radialGradient id="saturnBase" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f0e0c0" />
            <stop offset="30%" stopColor="#e0c898" />
            <stop offset="60%" stopColor="#c8a870" />
            <stop offset="100%" stopColor="#987850" />
          </radialGradient>

          {/* Atmospheric bands */}
          <linearGradient id="saturnBandLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(250, 240, 220, 0.4)" />
            <stop offset="50%" stopColor="rgba(245, 235, 210, 0.3)" />
            <stop offset="100%" stopColor="rgba(250, 240, 220, 0.4)" />
          </linearGradient>

          <linearGradient id="saturnBandMid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(200, 170, 120, 0.35)" />
            <stop offset="50%" stopColor="rgba(190, 160, 110, 0.25)" />
            <stop offset="100%" stopColor="rgba(200, 170, 120, 0.35)" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="saturnShadow" cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(80, 60, 30, 0.3)" />
            <stop offset="100%" stopColor="rgba(50, 35, 15, 0.65)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="saturnHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 255, 250, 0.4)" />
            <stop offset="50%" stopColor="rgba(255, 250, 235, 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Ring gradients - multiple layers for depth */}
          <linearGradient id="ringA" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(200, 180, 150, 0)" />
            <stop offset="10%" stopColor="rgba(220, 200, 170, 0.15)" />
            <stop offset="30%" stopColor="rgba(235, 215, 185, 0.35)" />
            <stop offset="50%" stopColor="rgba(245, 225, 195, 0.45)" />
            <stop offset="70%" stopColor="rgba(235, 215, 185, 0.35)" />
            <stop offset="90%" stopColor="rgba(220, 200, 170, 0.15)" />
            <stop offset="100%" stopColor="rgba(200, 180, 150, 0)" />
          </linearGradient>

          <linearGradient id="ringB" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(180, 160, 130, 0)" />
            <stop offset="15%" stopColor="rgba(200, 180, 150, 0.25)" />
            <stop offset="50%" stopColor="rgba(220, 195, 165, 0.4)" />
            <stop offset="85%" stopColor="rgba(200, 180, 150, 0.25)" />
            <stop offset="100%" stopColor="rgba(180, 160, 130, 0)" />
          </linearGradient>

          <linearGradient id="ringC" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(160, 140, 110, 0)" />
            <stop offset="20%" stopColor="rgba(180, 160, 130, 0.2)" />
            <stop offset="50%" stopColor="rgba(195, 175, 145, 0.3)" />
            <stop offset="80%" stopColor="rgba(180, 160, 130, 0.2)" />
            <stop offset="100%" stopColor="rgba(160, 140, 110, 0)" />
          </linearGradient>

          {/* Ring shadow cast by planet */}
          <linearGradient id="ringShadowGrad" x1="35%" y1="0%" x2="65%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="40%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(30, 20, 10, 0.5)" />
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          <clipPath id="saturnClip">
            <circle cx="150" cy="125" r="60" />
          </clipPath>

          {/* Clip for back ring */}
          <clipPath id="ringBackClip">
            <rect x="0" y="125" width="300" height="125" />
          </clipPath>

          {/* Clip for front ring */}
          <clipPath id="ringFrontClip">
            <rect x="0" y="0" width="300" height="125" />
          </clipPath>
        </defs>

        {/* Back rings (behind planet) */}
        <g clipPath="url(#ringBackClip)" opacity="0.5">
          {/* C Ring (innermost, faintest) */}
          <ellipse cx="150" cy="125" rx="95" ry="22" fill="none" stroke="url(#ringC)" strokeWidth="8" />
          {/* B Ring (middle, brightest) */}
          <ellipse cx="150" cy="125" rx="115" ry="26" fill="none" stroke="url(#ringB)" strokeWidth="15" />
          {/* A Ring (outer) */}
          <ellipse cx="150" cy="125" rx="138" ry="32" fill="none" stroke="url(#ringA)" strokeWidth="12" />
        </g>

        {/* Planet body */}
        <circle cx="150" cy="125" r="60" fill="url(#saturnBase)" />

        {/* Atmospheric bands */}
        <g clipPath="url(#saturnClip)">
          <ellipse cx="150" cy="95" rx="70" ry="8" fill="url(#saturnBandLight)" opacity="0.6" />
          <ellipse cx="150" cy="110" rx="70" ry="6" fill="url(#saturnBandMid)" opacity="0.5" />
          <ellipse cx="150" cy="125" rx="70" ry="5" fill="url(#saturnBandLight)" opacity="0.4" />
          <ellipse cx="150" cy="140" rx="70" ry="7" fill="url(#saturnBandMid)" opacity="0.5" />
          <ellipse cx="150" cy="155" rx="70" ry="6" fill="url(#saturnBandLight)" opacity="0.5" />
        </g>

        {/* Subtle polar darkening */}
        <g clipPath="url(#saturnClip)" opacity="0.3">
          <ellipse cx="150" cy="70" rx="50" ry="15" fill="rgba(180, 150, 100, 0.4)" />
          <ellipse cx="150" cy="180" rx="45" ry="12" fill="rgba(160, 130, 90, 0.3)" />
        </g>

        {/* Shadow */}
        <circle cx="150" cy="125" r="60" fill="url(#saturnShadow)" />

        {/* Highlight */}
        <circle cx="150" cy="125" r="60" fill="url(#saturnHighlight)" />

        {/* Front rings (in front of planet) */}
        <g clipPath="url(#ringFrontClip)">
          {/* C Ring */}
          <ellipse cx="150" cy="125" rx="95" ry="22" fill="none" stroke="url(#ringC)" strokeWidth="8" />
          {/* Cassini Division (gap between B and A rings) */}
          <ellipse cx="150" cy="125" rx="125" ry="29" fill="none" stroke="rgba(20, 15, 10, 0.3)" strokeWidth="2" />
          {/* B Ring */}
          <ellipse cx="150" cy="125" rx="115" ry="26" fill="none" stroke="url(#ringB)" strokeWidth="15" />
          {/* A Ring */}
          <ellipse cx="150" cy="125" rx="138" ry="32" fill="none" stroke="url(#ringA)" strokeWidth="12" />
          {/* Encke Gap */}
          <ellipse cx="150" cy="125" rx="132" ry="30" fill="none" stroke="rgba(20, 15, 10, 0.15)" strokeWidth="1" />
        </g>

        {/* Ring shadow from planet */}
        <g clipPath="url(#ringFrontClip)" opacity="0.4">
          <ellipse cx="165" cy="125" rx="138" ry="32" fill="url(#ringShadowGrad)" />
        </g>

        {/* Rim light on planet */}
        <circle
          cx="150"
          cy="125"
          r="59"
          fill="none"
          stroke="rgba(255, 250, 235, 0.12)"
          strokeWidth="1"
        />
      </svg>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

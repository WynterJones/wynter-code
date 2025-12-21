export function Jupiter() {
  return (
    <div className="relative" style={{ animation: "float 14s ease-in-out infinite" }}>
      {/* Large glow */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "400px",
          height: "400px",
          left: "-50px",
          top: "-50px",
          background: "radial-gradient(circle, rgba(220, 180, 140, 0.15) 0%, rgba(200, 160, 120, 0.08) 40%, transparent 60%)",
        }}
      />

      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 30px rgba(220, 180, 140, 0.25))" }}
      >
        <defs>
          {/* Base gradient */}
          <radialGradient id="jupiterBase" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#f0d8b8" />
            <stop offset="40%" stopColor="#dcc098" />
            <stop offset="70%" stopColor="#c4a070" />
            <stop offset="100%" stopColor="#8a6840" />
          </radialGradient>

          {/* Band colors */}
          <linearGradient id="jupiterBandLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f5e8d5" />
            <stop offset="50%" stopColor="#eedcc5" />
            <stop offset="100%" stopColor="#f5e8d5" />
          </linearGradient>

          <linearGradient id="jupiterBandDark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b08050" />
            <stop offset="50%" stopColor="#a07045" />
            <stop offset="100%" stopColor="#b08050" />
          </linearGradient>

          <linearGradient id="jupiterBandRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c08060" />
            <stop offset="50%" stopColor="#b07055" />
            <stop offset="100%" stopColor="#c08060" />
          </linearGradient>

          {/* Shadow */}
          <radialGradient id="jupiterShadow" cx="70%" cy="65%" r="55%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(60, 40, 20, 0.35)" />
            <stop offset="100%" stopColor="rgba(40, 25, 10, 0.7)" />
          </radialGradient>

          {/* Highlight */}
          <radialGradient id="jupiterHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 255, 250, 0.35)" />
            <stop offset="50%" stopColor="rgba(255, 250, 240, 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <clipPath id="jupiterClip">
            <circle cx="150" cy="150" r="100" />
          </clipPath>
        </defs>

        {/* Planet body */}
        <circle cx="150" cy="150" r="100" fill="url(#jupiterBase)" />

        {/* Atmospheric bands */}
        <g clipPath="url(#jupiterClip)">
          {/* Light zones */}
          <ellipse cx="150" cy="70" rx="110" ry="12" fill="url(#jupiterBandLight)" opacity="0.7" />
          <ellipse cx="150" cy="100" rx="110" ry="10" fill="url(#jupiterBandLight)" opacity="0.6" />
          <ellipse cx="150" cy="130" rx="110" ry="8" fill="url(#jupiterBandLight)" opacity="0.5" />
          <ellipse cx="150" cy="175" rx="110" ry="10" fill="url(#jupiterBandLight)" opacity="0.6" />
          <ellipse cx="150" cy="210" rx="110" ry="12" fill="url(#jupiterBandLight)" opacity="0.5" />

          {/* Dark belts */}
          <ellipse cx="150" cy="85" rx="110" ry="8" fill="url(#jupiterBandDark)" opacity="0.6" />
          <ellipse cx="150" cy="115" rx="110" ry="7" fill="url(#jupiterBandRed)" opacity="0.55" />
          <ellipse cx="150" cy="155" rx="110" ry="12" fill="url(#jupiterBandDark)" opacity="0.65" />
          <ellipse cx="150" cy="190" rx="110" ry="8" fill="url(#jupiterBandRed)" opacity="0.5" />

          {/* Turbulent edges on bands */}
          <path
            d="M55 150 Q70 145 85 152 Q100 148 115 153 Q130 147 150 152 Q170 148 190 153 Q210 147 230 152 Q245 148 250 150"
            fill="none"
            stroke="rgba(160, 100, 60, 0.3)"
            strokeWidth="3"
          />
        </g>

        {/* Great Red Spot */}
        <g clipPath="url(#jupiterClip)">
          <ellipse
            cx="115"
            cy="160"
            rx="18"
            ry="12"
            fill="#c45a40"
            opacity="0.7"
          />
          <ellipse
            cx="115"
            cy="160"
            rx="14"
            ry="9"
            fill="#d46850"
            opacity="0.6"
          />
          <ellipse
            cx="113"
            cy="158"
            rx="8"
            ry="5"
            fill="#e08060"
            opacity="0.5"
          />
          {/* Swirl detail */}
          <path
            d="M105 155 Q115 152 125 158"
            fill="none"
            stroke="rgba(200, 120, 90, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Smaller storms */}
        <g clipPath="url(#jupiterClip)" opacity="0.4">
          <ellipse cx="180" cy="110" rx="6" ry="4" fill="#f5e8d5" />
          <ellipse cx="90" cy="185" rx="5" ry="3" fill="#d4b080" />
          <ellipse cx="200" cy="170" rx="4" ry="3" fill="#f0dcc0" />
        </g>

        {/* Shadow */}
        <circle cx="150" cy="150" r="100" fill="url(#jupiterShadow)" />

        {/* Highlight */}
        <circle cx="150" cy="150" r="100" fill="url(#jupiterHighlight)" />

        {/* Rim light */}
        <circle
          cx="150"
          cy="150"
          r="99"
          fill="none"
          stroke="rgba(255, 250, 240, 0.12)"
          strokeWidth="1.5"
        />
      </svg>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}

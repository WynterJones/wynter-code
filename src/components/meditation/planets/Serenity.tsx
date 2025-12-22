export function Serenity() {
  return (
    <div className="relative" style={{ animation: "float 14s ease-in-out infinite" }}>
      {/* Atmospheric glow - soft lavender/blue */}
      <div
        className="absolute rounded-full blur-3xl opacity-40"
        style={{
          width: "320px",
          height: "320px",
          left: "-35px",
          top: "-35px",
          background: "radial-gradient(circle, rgba(200, 220, 255, 0.25) 0%, rgba(180, 160, 220, 0.15) 50%, transparent 70%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 30px rgba(180, 190, 255, 0.25))" }}
      >
        <defs>
          {/* Base planet gradient - pearlescent */}
          <radialGradient id="serenityBase" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#f0f8ff" />
            <stop offset="40%" stopColor="#dcd0ff" />
            <stop offset="80%" stopColor="#b0c4de" />
            <stop offset="100%" stopColor="#778899" />
          </radialGradient>

          {/* Symbol gradient - gold/white */}
          <linearGradient id="serenitySymbol" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0.4)" />
          </linearGradient>

          {/* Clouds/Atmosphere patterns */}
          <pattern id="serenityClouds" width="50" height="50" patternUnits="userSpaceOnUse">
             <path d="M0 25 Q 12.5 10, 25 25 T 50 25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          </pattern>

          {/* Shadow */}
          <radialGradient id="serenityShadow" cx="70%" cy="70%" r="55%">
             <stop offset="0%" stopColor="transparent" />
             <stop offset="50%" stopColor="rgba(30, 20, 50, 0.3)" />
             <stop offset="100%" stopColor="rgba(10, 5, 30, 0.6)" />
          </radialGradient>
          
           {/* Highlight */}
          <radialGradient id="serenityHighlight" cx="30%" cy="30%" r="45%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

           <clipPath id="serenityClip">
            <circle cx="125" cy="125" r="85" />
          </clipPath>
        </defs>

        {/* Planet Base */}
        <circle cx="125" cy="125" r="85" fill="url(#serenityBase)" />

        {/* Occult/Sacred Geometry Symbol - Stylized Lotus/Flower of Life */}
        <g clipPath="url(#serenityClip)" opacity="0.6">
             {/* Central rings */}
            <circle cx="125" cy="125" r="30" fill="none" stroke="url(#serenitySymbol)" strokeWidth="1" />
            <circle cx="125" cy="125" r="50" fill="none" stroke="url(#serenitySymbol)" strokeWidth="0.5" />
            
             {/* Flower petals (simple geometric representation) */}
            <g transform="translate(125, 125)">
                 {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                    <ellipse 
                        key={i}
                        cx="0" 
                        cy="-20" 
                        rx="8" 
                        ry="20" 
                        fill="none" 
                        stroke="rgba(255, 255, 255, 0.4)" 
                        strokeWidth="1"
                        transform={`rotate(${angle})`} 
                    />
                 ))}
             </g>
             
              {/* Outer geometric hints */}
              <path d="M125 40 L125 210" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <path d="M40 125 L210 125" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </g>

        {/* Clouds - Gentle bands */}
        <g clipPath="url(#serenityClip)" opacity="0.4">
             <rect x="0" y="80" width="250" height="20" fill="url(#serenityClouds)" transform="rotate(-5 125 125)" />
             <rect x="0" y="140" width="250" height="30" fill="url(#serenityClouds)" transform="rotate(5 125 125)" />
        </g>

        <circle cx="125" cy="125" r="85" fill="url(#serenityShadow)" />
        <circle cx="125" cy="125" r="85" fill="url(#serenityHighlight)" />
        
        {/* Glowing Rim */}
         <circle cx="125" cy="125" r="85" fill="none" stroke="rgba(200, 220, 255, 0.4)" strokeWidth="1.5" />

      </svg>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}

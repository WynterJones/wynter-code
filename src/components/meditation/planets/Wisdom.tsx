export function Wisdom() {
  return (
    <div className="relative" style={{ animation: "float 16s ease-in-out infinite" }}>
      {/* Atmospheric glow - deep purple/indigo */}
      <div
        className="absolute rounded-full blur-3xl opacity-50"
        style={{
          width: "310px",
          height: "310px",
          left: "-30px",
          top: "-30px",
          background: "radial-gradient(circle, rgba(75, 0, 130, 0.3) 0%, rgba(138, 43, 226, 0.2) 60%, transparent 80%)",
        }}
      />

      <svg
        width="250"
        height="250"
        viewBox="0 0 250 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 25px rgba(138, 43, 226, 0.4))" }}
      >
        <defs>
          {/* Base planet gradient - nebula like */}
          <radialGradient id="wisdomBase" cx="30%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#8A2BE2" /> 
            <stop offset="50%" stopColor="#4B0082" />
            <stop offset="90%" stopColor="#191970" />
          </radialGradient>

          {/* Symbol gradient - silver/cyan */}
          <linearGradient id="wisdomSymbol" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(173, 216, 230, 0.9)" />
            <stop offset="100%" stopColor="rgba(224, 255, 255, 0.6)" />
          </linearGradient>

          {/* Mysterious surface swirls */}
          <pattern id="wisdomSwirls" width="100" height="100" patternUnits="userSpaceOnUse">
             <path d="M10 10 Q 50 90, 90 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
             <path d="M0 50 Q 50 0, 100 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          </pattern>
          
          <radialGradient id="wisdomShadow" cx="70%" cy="75%" r="60%">
             <stop offset="0%" stopColor="transparent" />
             <stop offset="40%" stopColor="rgba(10, 5, 20, 0.5)" />
             <stop offset="100%" stopColor="rgba(0, 0, 10, 0.9)" />
          </radialGradient>

          <radialGradient id="wisdomHighlight" cx="25%" cy="25%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 240, 255, 0.4)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

           <clipPath id="wisdomClip">
            <circle cx="125" cy="125" r="85" />
          </clipPath>
        </defs>

        {/* Planet Base */}
        <circle cx="125" cy="125" r="85" fill="url(#wisdomBase)" />
        <circle cx="125" cy="125" r="85" fill="url(#wisdomSwirls)" opacity="0.6" />

        {/* Occult/Sacred Geometry Symbol - The Eye / Star */}
        <g clipPath="url(#wisdomClip)">
             {/* Central Eye Shape */}
             <path 
                d="M125 75 Q 165 100, 125 125 Q 85 150, 125 175" 
                fill="none" 
                stroke="url(#wisdomSymbol)" 
                strokeWidth="1.5"
                opacity="0.8"
             />
              <path 
                d="M125 175 Q 165 150, 125 125 Q 85 100, 125 75" 
                fill="none" 
                stroke="url(#wisdomSymbol)" 
                strokeWidth="1.5"
                opacity="0.8"
             />
             
             {/* Iris */}
             <circle cx="125" cy="125" r="12" fill="none" stroke="rgba(200, 240, 255, 0.8)" strokeWidth="2" />
             <circle cx="125" cy="125" r="4" fill="rgba(200, 240, 255, 0.9)" />
             
             {/* Radiating rays */}
             <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                    <line 
                        key={i}
                        x1="125" y1="125" 
                        x2={125 + Math.cos(angle * Math.PI / 180) * 80} 
                        y2={125 + Math.sin(angle * Math.PI / 180) * 80}
                        strokeDasharray="4 6"
                    />
                ))}
             </g>
        </g>

         {/* Northern/Southern Auroras */}
         <g clipPath="url(#wisdomClip)" filter="blur(3px)">
             <path d="M60 60 Q 125 80, 190 60" stroke="#00FFFF" strokeWidth="3" opacity="0.3" fill="none"/>
             <path d="M70 190 Q 125 170, 180 190" stroke="#00FFFF" strokeWidth="3" opacity="0.3" fill="none"/>
         </g>

        <circle cx="125" cy="125" r="85" fill="url(#wisdomShadow)" />
        <circle cx="125" cy="125" r="85" fill="url(#wisdomHighlight)" />
        
        {/* Glowing Rim */}
         <circle cx="125" cy="125" r="85" fill="none" stroke="rgba(138, 43, 226, 0.5)" strokeWidth="1" />

      </svg>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
           50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

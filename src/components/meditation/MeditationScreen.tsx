import { useEffect, useCallback, useMemo, useState } from "react";
import { PlanetCarousel } from "./PlanetCarousel";
import { MeditationAudioPlayer } from "./MeditationAudioPlayer";
import { useMeditationStore } from "@/stores/meditationStore";

export function MeditationScreen() {
  const {
    setActive,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
  } = useMeditationStore();

  const [ambientPhase, setAmbientPhase] = useState(0);
  const [supernovaActive, setSupernovaActive] = useState(false);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);

  const POSITIVE_PHRASES = [
    "Create", "Dream", "Love", "Believe", "Be", "Shine", "Grow",
    "Peace", "Flow", "Trust", "Heal", "Light", "Inspire"
  ];

  // Ambient light cycle (dusk to night) - slower cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setAmbientPhase((p) => (p + 1) % 360);

      // Random events
      if (Math.random() < 1/200 && !supernovaActive) {
        setSupernovaActive(true);
        setTimeout(() => setSupernovaActive(false), 4000); // 4s full duration
      }

      if (Math.random() < 1/400 && !activePhrase) {
        const phrase = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
        setActivePhrase(phrase);
        setTimeout(() => setActivePhrase(null), 6000); // 6s duration
      }

    }, 300); // Complete cycle every ~108 seconds
    return () => clearInterval(interval);
  }, [supernovaActive, activePhrase]);

  const handleClose = useCallback(() => {
    setActive(false);
  }, [setActive]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") nextTrack();
      if (e.key === "ArrowLeft") prevTrack();
      if (e.key === "ArrowUp") { e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); }
      if (e.key === "ArrowDown") { e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); }
    },
    [handleClose, togglePlay, nextTrack, prevTrack, volume, setVolume]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Generate static stars
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.15,
      twinkleDelay: Math.random() * 8,
      twinkleDuration: 3 + Math.random() * 4,
    }));
  }, []);

  // Generate shooting stars - very rare (once every 2-4 minutes)
  const shootingStars = useMemo(() => {
    return Array.from({ length: 1 }).map((_, i) => ({
      id: i,
      startX: 5 + Math.random() * 35,
      startY: Math.random() * 25,
      angle: 25 + Math.random() * 35,
      delay: 60 + Math.random() * 60, // First one after 1-2 minutes
      cycleDuration: 120 + Math.random() * 120, // Then every 2-4 minutes
      duration: 1.5,
      length: 120 + Math.random() * 60,
    }));
  }, []);

  // Calculate ambient light color based on phase
  const ambientColor = useMemo(() => {
    const phase = ambientPhase / 360;
    if (phase < 0.33) {
      const t = phase / 0.33;
      return `rgba(${25 + t * 40}, ${18 + t * 15}, ${50 + t * 35}, ${0.12 + t * 0.08})`;
    } else if (phase < 0.66) {
      const t = (phase - 0.33) / 0.33;
      return `rgba(${65 - t * 30}, ${33 - t * 8}, ${85 - t * 15}, ${0.20 - t * 0.04})`;
    } else {
      const t = (phase - 0.66) / 0.34;
      return `rgba(${35 - t * 10}, ${25 - t * 7}, ${70 - t * 20}, ${0.16 - t * 0.04})`;
    }
  }, [ambientPhase]);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ top: "44px" }}>
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#08080f]" />

      {/* Ambient light effect - slow moving gradient */}
      <div
        className="absolute inset-0 transition-all duration-[2000ms]"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at ${50 + Math.sin(ambientPhase * 0.015) * 15}% ${35 + Math.cos(ambientPhase * 0.012) * 8}%, ${ambientColor} 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at ${65 + Math.cos(ambientPhase * 0.018) * 12}% ${55 + Math.sin(ambientPhase * 0.015) * 12}%, rgba(100, 130, 200, 0.05) 0%, transparent 45%)
          `,
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `twinkle ${star.twinkleDuration}s ease-in-out infinite`,
              animationDelay: `${star.twinkleDelay}s`,
            }}
          />
        ))}
      </div>

      {/* Shooting stars - very rare */}
      <div className="absolute inset-0 overflow-hidden">
        {shootingStars.map((star) => (
          <div
            key={star.id}
            className="absolute"
            style={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              width: `${star.length}px`,
              height: "1.5px",
              background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 40%, rgba(255, 255, 255, 0.9) 80%, white 100%)`,
              transform: `rotate(${star.angle}deg)`,
              animation: `shooting-star ${star.cycleDuration}s linear infinite`,
              animationDelay: `${star.delay}s`,
              opacity: 0,
              filter: "blur(0.3px)",
              boxShadow: "0 0 6px rgba(255, 255, 255, 0.6)",
            }}
          />
        ))}
      </div>

      {/* Nebula-like clouds - very subtle */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: `
            radial-gradient(ellipse 35% 25% at 15% 75%, rgba(180, 140, 200, 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 45% 35% at 85% 25%, rgba(120, 160, 220, 0.2) 0%, transparent 60%)
          `,
          animation: "nebula-drift 90s ease-in-out infinite",
        }}
      />

      {/* Supernova Effect */}
      {supernovaActive && (
        <div 
            className="absolute"
            style={{
                top: '20%',
                left: '70%',
                width: '100px',
                height: '100px',
                animation: 'supernova-flash 4s ease-out forwards',
                zIndex: 5
            }}
        >
             <div className="absolute inset-0 bg-white rounded-full blur-xl animate-pulse" />
             <div className="absolute inset-0 bg-blue-100 rounded-full blur-md" />
             {/* Rays */}
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-[200%] h-[2px] bg-white absolute rotate-0 blur-[1px]" />
                 <div className="w-[200%] h-[2px] bg-white absolute rotate-45 blur-[1px]" />
                 <div className="w-[200%] h-[2px] bg-white absolute rotate-90 blur-[1px]" />
                 <div className="w-[200%] h-[2px] bg-white absolute rotate-135 blur-[1px]" />
            </div>
        </div>
      )}

      {/* Planet carousel - full screen movement */}
      <PlanetCarousel />

      {/* Positive Phrase Overlay */}
      {activePhrase && (
          <div 
            className="absolute top-[25%] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            style={{
                animation: 'phrase-fade 6s ease-in-out forwards'
            }}
          >
              <div className="text-3xl font-light tracking-[0.2em] text-white/80 font-sans blur-[0.5px]">
                  {activePhrase}
              </div>
          </div>
      )}

      {/* Audio controls - bottom right, subtle */}
      <div className="fixed bottom-6 right-6 z-50 opacity-60 hover:opacity-100 transition-opacity duration-500">
        <MeditationAudioPlayer />
      </div>

      {/* Keyboard hints - bottom left, very subtle */}
      <div className="fixed bottom-6 left-6 text-white/15 text-xs space-y-1 opacity-40 hover:opacity-100 transition-opacity duration-700">
        <div>Space - Play/Pause</div>
        <div>← → - Change Track</div>
        <div>↑ ↓ - Volume</div>
        <div>Esc - Close</div>
      </div>

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 20%, rgba(0, 0, 0, 0.5) 100%)",
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }

        @keyframes shooting-star {
          0%, 98% { opacity: 0; transform: translateX(-50px); }
          98.5% { opacity: 1; transform: translateX(0px); }
          100% { opacity: 0; transform: translateX(300px); }
        }

        @keyframes nebula-drift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          25% { transform: translate(15px, -8px) scale(1.03); opacity: 0.18; }
          50% { transform: translate(-8px, 12px) scale(0.98); opacity: 0.12; }
          75% { transform: translate(10px, 5px) scale(1.02); opacity: 0.16; }
        }

        @keyframes supernova-flash {
            0% { transform: scale(0); opacity: 0; }
            10% { transform: scale(1.5); opacity: 1; }
            30% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(0.2); opacity: 0; }
        }

        @keyframes ufo-flyby {
            0% { transform: translateX(-20vw) rotate(-5deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateX(120vw) rotate(5deg); opacity: 0; }
        }

        @keyframes phrase-fade {
            0% { opacity: 0; transform: translateY(10px); blur(4px); }
            20% { opacity: 1; transform: translateY(0); blur(0px); }
            80% { opacity: 1; transform: translateY(0); blur(0px); }
            100% { opacity: 0; transform: translateY(-10px); blur(4px); }
        }
      `}</style>
    </div>
  );
}

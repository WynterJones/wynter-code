import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { Radio } from "lucide-react";
import { PlanetCarousel } from "./PlanetCarousel";
import { MeditationAudioPlayer } from "./MeditationAudioPlayer";
import { AudioVisualizer } from "./AudioVisualizer";
import { useMeditationStore } from "@/stores/meditationStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function MeditationScreen() {
  const {
    setActive,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
  } = useMeditationStore();

  const compactProjectTabs = useSettingsStore((s) => s.compactProjectTabs);
  const headerHeight = compactProjectTabs ? 36 : 44;

  const [ambientPhase, setAmbientPhase] = useState(0);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const phraseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const POSITIVE_PHRASES = [
    "Create", "Dream", "Love", "Believe", "Be", "Shine", "Grow",
    "Peace", "Flow", "Trust", "Heal", "Light", "Inspire"
  ];

  // Ambient light cycle (dusk to night) - slower cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setAmbientPhase((p) => (p + 1) % 360);

      // Positive phrase - once every 5-9 minutes (average ~7 min)
      if (Math.random() < 1/1400 && !activePhrase) {
        const phrase = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
        setActivePhrase(phrase);
        // Clear any existing timeout before setting a new one
        if (phraseTimeoutRef.current) {
          clearTimeout(phraseTimeoutRef.current);
        }
        phraseTimeoutRef.current = setTimeout(() => {
          setActivePhrase(null);
          phraseTimeoutRef.current = null;
        }, 6000); // 6s duration
      }

    }, 300); // Complete cycle every ~108 seconds
    return () => {
      clearInterval(interval);
      // Clean up pending phrase timeout to prevent memory leaks
      if (phraseTimeoutRef.current) {
        clearTimeout(phraseTimeoutRef.current);
        phraseTimeoutRef.current = null;
      }
    };
  }, [activePhrase]);

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

  // Generate static stars with pre-computed styles
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.5 + 0.15;
      const twinkleDelay = Math.random() * 8;
      const twinkleDuration = 3 + Math.random() * 4;
      return {
        id: i,
        style: {
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          opacity,
          animation: `twinkle ${twinkleDuration}s ease-in-out infinite`,
          animationDelay: `${twinkleDelay}s`,
        } as React.CSSProperties,
      };
    });
  }, []);

  // Generate shooting stars with pre-computed styles - very rare (once every 2-4 minutes)
  const shootingStars = useMemo(() => {
    return Array.from({ length: 1 }).map((_, i) => {
      const startX = 5 + Math.random() * 35;
      const startY = Math.random() * 25;
      const angle = 25 + Math.random() * 35;
      const delay = 60 + Math.random() * 60;
      const cycleDuration = 120 + Math.random() * 120;
      const length = 120 + Math.random() * 60;
      return {
        id: i,
        style: {
          left: `${startX}%`,
          top: `${startY}%`,
          width: `${length}px`,
          height: "1.5px",
          background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 40%, rgba(255, 255, 255, 0.9) 80%, white 100%)`,
          transform: `rotate(${angle}deg)`,
          animation: `shooting-star ${cycleDuration}s linear infinite`,
          animationDelay: `${delay}s`,
          opacity: 0,
          filter: "blur(0.3px)",
          boxShadow: "0 0 6px rgba(255, 255, 255, 0.6)",
        } as React.CSSProperties,
      };
    });
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
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ top: `${headerHeight}px` }}>
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
            style={star.style}
          />
        ))}
      </div>

      {/* Shooting stars - very rare */}
      <div className="absolute inset-0 overflow-hidden">
        {shootingStars.map((star) => (
          <div
            key={star.id}
            className="absolute"
            style={star.style}
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

      {/* Radio button - center bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("open-settings", { detail: { tab: "music" } })
            );
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary/60 border border-border/30 text-text-secondary hover:text-text-primary hover:bg-bg-secondary/80 hover:border-accent-cyan/30 transition-all duration-300 backdrop-blur-sm group"
        >
          <Radio className="w-4 h-4 text-accent-cyan group-hover:animate-pulse" />
          <span className="text-sm font-medium">Radio</span>
        </button>
      </div>

      {/* Audio controls - bottom right, subtle */}
      <div className="fixed bottom-6 right-6 z-50 opacity-60 hover:opacity-100 transition-opacity duration-500">
        <MeditationAudioPlayer />
      </div>

      {/* Visualizer and keyboard hints - bottom left */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-4">
        <AudioVisualizer variant="full" />
        <div className="text-white/15 text-xs space-y-1 opacity-40 hover:opacity-100 transition-opacity duration-700">
          <div>Space - Play/Pause</div>
          <div>← → - Change Track</div>
          <div>↑ ↓ - Volume</div>
          <div>Esc - Close</div>
        </div>
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

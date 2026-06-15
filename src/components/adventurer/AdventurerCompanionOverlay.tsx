/**
 * AdventurerCompanionOverlay
 *
 * Floating pixel-art companion rendered *inside* the main app window (not a
 * separate OS window). Pinned via the adventurer store; reads live "mood"
 * straight from the store. Draggable anywhere within the window (position is
 * persisted), settles to a static frame after a short idle spell, and exposes
 * hover controls to flip direction, toggle a status label, and unpin.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { X, FlipHorizontal2, MessageSquare } from "lucide-react";
import {
  useAdventurerStore,
  getPinnedAdventurer,
  getClipForMood,
  MOOD_LABELS,
  type AdventurerMood,
} from "@/stores/adventurerStore";
import { SpriteAnimation } from "./SpriteAnimation";
import { clipSrcs, baseSpriteSrc } from "@/services/adventurerAssets";

const IDLE_STATIC_AFTER_MS = 9000;
const SIZE = 160;
const MARGIN = 24;

/** Dot colour per mood, used in the status badge. */
const MOOD_DOT: Record<AdventurerMood, string> = {
  idle: "bg-zinc-400",
  active: "bg-sky-400",
  thinking: "bg-amber-400",
  celebrate: "bg-emerald-400",
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export function AdventurerCompanionOverlay() {
  const adventurers = useAdventurerStore((s) => s.adventurers);
  const pinnedId = useAdventurerStore((s) => s.pinnedId);
  const adventurer = useMemo(
    () => getPinnedAdventurer({ adventurers, pinnedId }),
    [adventurers, pinnedId]
  );

  const mood = useAdventurerStore((s) => s.mood);
  const flipped = useAdventurerStore((s) => s.companionFlipped);
  const showStatus = useAdventurerStore((s) => s.companionShowStatus);
  const storedPos = useAdventurerStore((s) => s.companionPos);
  const setCompanionFlipped = useAdventurerStore((s) => s.setCompanionFlipped);
  const setCompanionShowStatus = useAdventurerStore((s) => s.setCompanionShowStatus);
  const setCompanionPos = useAdventurerStore((s) => s.setCompanionPos);
  const setPinned = useAdventurerStore((s) => s.setPinned);

  const [idleStatic, setIdleStatic] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState(storedPos);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Seed a sensible default position (bottom-right) the first time.
  useEffect(() => {
    if (storedPos) return;
    const x = Math.max(0, window.innerWidth - SIZE - MARGIN);
    const y = Math.max(0, window.innerHeight - SIZE - MARGIN);
    setCompanionPos({ x, y });
  }, [storedPos, setCompanionPos]);

  // Mirror the persisted position into local state when not mid-drag.
  useEffect(() => {
    if (!dragRef.current && storedPos) setPos(storedPos);
  }, [storedPos]);

  // Keep the companion on-screen if the window is resized.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        if (!p) return p;
        const next = {
          x: clamp(p.x, 0, window.innerWidth - SIZE),
          y: clamp(p.y, 0, window.innerHeight - SIZE),
        };
        if (next.x !== p.x || next.y !== p.y) setCompanionPos(next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setCompanionPos]);

  // While idle, animate briefly then freeze on a static frame.
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (mood !== "idle") {
      setIdleStatic(false);
      return;
    }
    setIdleStatic(false);
    idleTimerRef.current = setTimeout(() => setIdleStatic(true), IDLE_STATIC_AFTER_MS);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [mood]);

  const activeClip = useMemo(
    () => (adventurer ? getClipForMood(adventurer, mood) : null),
    [adventurer, mood]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const start = pos ?? storedPos ?? { x: 0, y: 0 };
    dragRef.current = { dx: e.clientX - start.x, dy: e.clientY - start.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPos({
      x: clamp(e.clientX - dragRef.current.dx, 0, window.innerWidth - SIZE),
      y: clamp(e.clientY - dragRef.current.dy, 0, window.innerHeight - SIZE),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (pos) setCompanionPos(pos);
  };

  if (!adventurer) return null;

  const current = pos ?? storedPos ?? { x: MARGIN, y: MARGIN };

  return (
    <div
      className="fixed z-40 select-none cursor-grab active:cursor-grabbing"
      style={{ left: current.x, top: current.y, width: SIZE, height: SIZE }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="pointer-events-none"
          style={{ transform: flipped ? "scaleX(-1)" : undefined }}
        >
          {activeClip && !idleStatic ? (
            <SpriteAnimation frames={clipSrcs(activeClip)} fps={activeClip.fps} size={128} />
          ) : (
            <SpriteAnimation
              frames={[baseSpriteSrc(adventurer) ?? ""].filter(Boolean)}
              size={128}
            />
          )}
        </div>

        {/* Persistent status badge (toggled via the controls). */}
        {showStatus && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-medium whitespace-nowrap pointer-events-none">
            <span className={`w-1.5 h-1.5 rounded-full ${MOOD_DOT[mood]}`} />
            {MOOD_LABELS[mood]}
          </div>
        )}

        {/* Hover controls: flip, toggle status, unpin. */}
        {hovered && (
          <div
            className="absolute top-1 right-1 flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCompanionFlipped(!flipped)}
              className="w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
              aria-label="Flip direction"
              title="Flip direction"
            >
              <FlipHorizontal2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCompanionShowStatus(!showStatus)}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                showStatus ? "bg-accent/80 hover:bg-accent" : "bg-black/50 hover:bg-black/70"
              }`}
              aria-label="Toggle status label"
              aria-pressed={showStatus}
              title="Toggle status label"
            >
              <MessageSquare className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPinned(null)}
              className="w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
              aria-label="Unpin companion"
              title="Unpin"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Name tooltip on hover. */}
        {hovered && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium whitespace-nowrap pointer-events-none">
            {adventurer.name}
          </div>
        )}
      </div>
    </div>
  );
}

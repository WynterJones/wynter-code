import { useState, useEffect, useCallback, useRef, ComponentType } from "react";
import {
  Mercury,
  Venus,
  Earth,
  Mars,
  Jupiter,
  Saturn,
  Uranus,
  Neptune,
} from "./planets";

interface Planet {
  name: string;
  Component: ComponentType;
}

const PLANETS: Planet[] = [
  { name: "Mercury", Component: Mercury },
  { name: "Venus", Component: Venus },
  { name: "Earth", Component: Earth },
  { name: "Mars", Component: Mars },
  { name: "Jupiter", Component: Jupiter },
  { name: "Saturn", Component: Saturn },
  { name: "Uranus", Component: Uranus },
  { name: "Neptune", Component: Neptune },
];

const IDLE_DURATION = 55000; // 55 seconds at center
const TRANSITION_DURATION = 15000; // 15 seconds for movement

export function PlanetCarousel() {
  const getRandomPlanetIndex = useCallback((excludeIndex?: number): number => {
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * PLANETS.length);
    } while (excludeIndex !== undefined && newIndex === excludeIndex);
    return newIndex;
  }, []);

  const [currentIndex, setCurrentIndex] = useState(() => getRandomPlanetIndex());
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStarted, setTransitionStarted] = useState(false);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start idle timer when not transitioning
  useEffect(() => {
    if (isTransitioning) return;

    cycleRef.current = setTimeout(() => {
      // Prepare next planet
      const next = getRandomPlanetIndex(currentIndex);
      setNextIndex(next);
      setIsTransitioning(true);
      setTransitionStarted(false);
    }, IDLE_DURATION);

    return () => {
      if (cycleRef.current) clearTimeout(cycleRef.current);
    };
  }, [isTransitioning, currentIndex, getRandomPlanetIndex]);

  // Trigger the actual movement after next planet is mounted
  useEffect(() => {
    if (!isTransitioning || nextIndex === null || transitionStarted) return;

    // Small delay to ensure DOM is ready, then start movement
    const startTimer = setTimeout(() => {
      setTransitionStarted(true);
    }, 50);

    return () => clearTimeout(startTimer);
  }, [isTransitioning, nextIndex, transitionStarted]);

  // Complete the transition
  useEffect(() => {
    if (!transitionStarted) return;

    const completeTimer = setTimeout(() => {
      // Swap: next becomes current
      setCurrentIndex(nextIndex!);
      setNextIndex(null);
      setIsTransitioning(false);
      setTransitionStarted(false);
    }, TRANSITION_DURATION + 100);

    return () => clearTimeout(completeTimer);
  }, [transitionStarted, nextIndex]);

  const CurrentPlanetComponent = PLANETS[currentIndex].Component;
  const NextPlanetComponent = nextIndex !== null ? PLANETS[nextIndex].Component : null;

  return (
    <>
      {/* Current planet */}
      <div
        key={`current-${currentIndex}`}
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: transitionStarted ? 'translateX(-120vw)' : 'translateX(0)',
          opacity: transitionStarted ? 0 : 1,
          transition: isTransitioning
            ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${TRANSITION_DURATION * 0.7}ms ease-out`
            : 'none',
          top: "44px",
        }}
      >
        <CurrentPlanetComponent />
        {/* Planet name */}
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/25 text-xs font-light tracking-[0.3em] uppercase"
          style={{
            opacity: transitionStarted ? 0 : 0.4,
            transition: 'opacity 1s ease-out',
          }}
        >
          {PLANETS[currentIndex].name}
        </div>
      </div>

      {/* Next planet (during transition) */}
      {nextIndex !== null && NextPlanetComponent && (
        <div
          key={`next-${nextIndex}`}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: transitionStarted ? 'translateX(0)' : 'translateX(120vw)',
            opacity: transitionStarted ? 1 : 0,
            transition: `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${TRANSITION_DURATION * 0.7}ms ease-in`,
            top: "44px",
          }}
        >
          <NextPlanetComponent />
          {/* Planet name */}
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/25 text-xs font-light tracking-[0.3em] uppercase"
            style={{
              opacity: transitionStarted ? 0.4 : 0,
              transition: `opacity 1s ease-in ${TRANSITION_DURATION * 0.8}ms`,
            }}
          >
            {PLANETS[nextIndex].name}
          </div>
        </div>
      )}
    </>
  );
}

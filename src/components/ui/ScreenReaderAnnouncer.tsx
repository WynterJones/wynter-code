import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

type AnnouncementPriority = "polite" | "assertive";

interface AnnouncerContextType {
  announce: (message: string, priority?: AnnouncementPriority) => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

/**
 * Hook to access the screen reader announcer.
 * Use announce("message") for polite announcements (default)
 * Use announce("message", "assertive") for urgent/important announcements
 */
export function useAnnounce() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // Return no-op if provider not found (graceful degradation)
    return { announce: () => {} };
  }
  return context;
}

interface ScreenReaderAnnouncerProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages screen reader announcements.
 * Add this near the root of your app, inside any other providers.
 *
 * Usage:
 * <ScreenReaderAnnouncerProvider>
 *   <App />
 * </ScreenReaderAnnouncerProvider>
 *
 * Then in any component:
 * const { announce } = useAnnounce();
 * announce("Loading complete");
 */
export function ScreenReaderAnnouncerProvider({ children }: ScreenReaderAnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, priority: AnnouncementPriority = "polite") => {
    if (!message) return;

    if (priority === "assertive") {
      // Clear first, then set - ensures screen reader picks up change
      setAssertiveMessage("");
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
        // Clear after announcement to avoid re-reading on focus
        setTimeout(() => setAssertiveMessage(""), 1000);
      });
    } else {
      setPoliteMessage("");
      requestAnimationFrame(() => {
        setPoliteMessage(message);
        setTimeout(() => setPoliteMessage(""), 1000);
      });
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Hidden live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

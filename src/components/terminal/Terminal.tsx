import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import { CanvasAddon } from "@xterm/addon-canvas";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore, TERMINAL_SHELLS, type TerminalShell } from "@/stores/settingsStore";
import { terminalTheme } from "@/lib/terminalTheme";
import "@xterm/xterm/css/xterm.css";

// Single reliable font stack - JetBrains Mono Nerd Font is the gold standard
// for terminal emulators with full Unicode, powerline, and devicon support
const TERMINAL_FONT_FAMILY = [
  '"JetBrainsMono Nerd Font"',
  '"JetBrainsMono NF"',
  '"JetBrains Mono"',
  '"Menlo"',
  'monospace',
].join(", ");

function getShellPath(shell: TerminalShell): string | null {
  const shellConfig = TERMINAL_SHELLS.find(s => s.id === shell);
  return shellConfig?.path ?? null;
}

interface TerminalProps {
  projectPath: string;
  ptyId: string | null;
  onPtyCreated: (ptyId: string) => void;
  onPtyClosed?: () => void;
  isVisible?: boolean;
  isFocused?: boolean;
  onSearchAddonReady?: (searchAddon: SearchAddon) => void;
}

export function Terminal({ projectPath, ptyId, onPtyCreated, onPtyClosed, isVisible = true, isFocused = true, onSearchAddonReady }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);

  // Track if terminal is ready to be shown (after fit is complete)
  const [isReady, setIsReady] = useState(false);
  // Track transition overlay to hide flash when returning to terminal
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const prevFocusedRef = useRef(isFocused);

  // Get terminal settings
  const terminalShell = useSettingsStore((s) => s.terminalShell);
  const terminalFontSize = useSettingsStore((s) => s.terminalFontSize);
  const terminalCursorBlink = useSettingsStore((s) => s.terminalCursorBlink);

  // Stable refs to capture initial values - effect only runs once on mount
  const initialPtyId = useRef(ptyId);
  const initialProjectPath = useRef(projectPath);
  const initialShellPath = useRef(getShellPath(terminalShell));
  const initialFontSize = useRef(terminalFontSize);
  const initialCursorBlink = useRef(terminalCursorBlink);
  const onPtyCreatedRef = useRef(onPtyCreated);
  const onPtyClosedRef = useRef(onPtyClosed);
  const onSearchAddonReadyRef = useRef(onSearchAddonReady);

  // Keep callback refs updated
  onPtyCreatedRef.current = onPtyCreated;
  onPtyClosedRef.current = onPtyClosed;
  onSearchAddonReadyRef.current = onSearchAddonReady;

  // Handle WebGL context loss gracefully
  const handleWebGLContextLoss = useCallback((term: XTerm) => {
    console.warn("WebGL context lost, falling back to Canvas renderer");
    if (webglAddonRef.current) {
      webglAddonRef.current.dispose();
      webglAddonRef.current = null;
    }
    // Fall back to canvas renderer
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
    } catch (e) {
      console.warn("Canvas fallback also failed, using default renderer:", e);
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Track if this effect instance is still active (for cleanup race condition)
    let isActive = true;
    let unlisten: UnlistenFn | null = null;
    let initRafId: number | null = null;

    const term = new XTerm({
      cursorBlink: initialCursorBlink.current,
      fontSize: initialFontSize.current,
      fontFamily: TERMINAL_FONT_FAMILY,
      theme: terminalTheme,
      allowProposedApi: true,
      scrollback: 10000,
      // Critical for proper character rendering
      letterSpacing: 0,
      lineHeight: 1.0,  // Must be 1.0 for TUI apps (btop, claude-cli) to position correctly
      // Font weight settings
      fontWeight: "normal",
      fontWeightBold: "bold",
      // Disable this to prevent color bleeding issues
      drawBoldTextInBrightColors: false,
      // Cursor style - underline feels more native on macOS
      cursorStyle: "bar",
      cursorWidth: 2,
      cursorInactiveStyle: "outline",
      // Minimum contrast ratio for accessibility
      minimumContrastRatio: 1,
      // Smoother scrolling for native feel
      smoothScrollDuration: 100,
      // macOS-like behavior
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      // Selection behavior
      rightClickSelectsWord: true,
      // Fast scrolling with alt key
      fastScrollModifier: "alt",
      fastScrollSensitivity: 5,
      // Tab stop width
      tabStopWidth: 4,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const unicodeAddon = new Unicode11Addon();
    const clipboardAddon = new ClipboardAddon();

    // Load addons before opening terminal
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(unicodeAddon);
    term.loadAddon(clipboardAddon);

    // Open the terminal first
    term.open(terminalRef.current);

    // Enable Unicode 11 for proper character width handling
    term.unicode.activeVersion = "11";

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Notify parent that search addon is ready
    if (onSearchAddonReadyRef.current) {
      onSearchAddonReadyRef.current(searchAddon);
    }

    // Wait for fonts to be ready, then fit, focus, and load GPU renderer
    const initializeTerminal = async () => {
      // Wait for document fonts to be ready for proper character width calculation
      try {
        await document.fonts.ready;
      } catch (e) {
        // Font API not available, continue anyway
        console.debug("Font API not available:", e);
      }

      if (!isActive) return;

      // Small delay to ensure DOM is fully rendered and terminal is ready
      initRafId = requestAnimationFrame(() => {
        // Double-check we're still active and terminal exists
        if (!isActive) return;

        const currentTerm = xtermRef.current;
        const currentFitAddon = fitAddonRef.current;
        if (!currentTerm || !currentFitAddon) return;

        // Load GPU-accelerated renderer after terminal is fully ready
        // This must happen after open() and after DOM is rendered
        // Wrap in try-catch to handle disposed terminal edge cases
        try {
          // Check if terminal is disposed before loading addon
          if (!isActive) return;

          const webglAddon = new WebglAddon();
          webglAddon.onContextLoss(() => {
            // Only handle context loss if terminal is still active
            if (isActive && xtermRef.current) {
              handleWebGLContextLoss(xtermRef.current);
            }
          });
          currentTerm.loadAddon(webglAddon);
          webglAddonRef.current = webglAddon;
        } catch (e) {
          // Could be WebGL2 not supported OR terminal disposed
          if (!isActive) return;
          console.warn("WebGL2 not available, falling back to Canvas renderer:", e);

          // Fall back to canvas renderer for better performance than default DOM
          try {
            if (!isActive || !xtermRef.current) return;
            const canvasAddon = new CanvasAddon();
            xtermRef.current.loadAddon(canvasAddon);
          } catch (canvasError) {
            // Terminal might be disposed, just ignore
            if (isActive) {
              console.warn("Canvas addon failed, using default DOM renderer:", canvasError);
            }
          }
        }

        // Final check before fit/focus
        if (!isActive || !xtermRef.current || !fitAddonRef.current) return;
        fitAddonRef.current.fit();
        xtermRef.current.focus();

        // Mark terminal as ready to show (triggers fade-in)
        setIsReady(true);
      });
    };

    initializeTerminal();

    // Create or attach to PTY
    const initPty = async () => {
      // If cleanup already ran, don't proceed
      if (!isActive) return;

      // Wait for fonts to be ready for proper character width calculation
      try {
        await document.fonts.ready;
      } catch {
        // Font API not available, continue anyway
      }

      if (!isActive) return;

      // Wait for container to have proper dimensions before creating PTY
      // This ensures the shell starts with the correct COLUMNS/LINES
      const waitForDimensions = (): Promise<void> => {
        return new Promise((resolve) => {
          const check = () => {
            if (!isActive) {
              resolve();
              return;
            }
            const container = terminalRef.current;
            if (container) {
              const { width, height } = container.getBoundingClientRect();
              if (width > 0 && height > 0) {
                // Container ready - fit terminal to get correct cols/rows
                fitAddon.fit();
                resolve();
                return;
              }
            }
            // Container not ready, try again next frame
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
      };

      await waitForDimensions();
      if (!isActive) return;

      try {
        // Use initial values from refs - these won't change during the effect lifecycle
        let id = initialPtyId.current;
        if (!id) {
          // Now term.cols and term.rows have the correct fitted values
          id = await invoke<string>("create_pty", {
            cwd: initialProjectPath.current,
            cols: term.cols,
            rows: term.rows,
            shell: initialShellPath.current,
          });

          // Check again after async call
          if (!isActive) {
            // Cleanup was called while we were creating PTY, close it
            invoke("close_pty", { ptyId: id }).catch(() => {});
            return;
          }

          onPtyCreatedRef.current(id);
        }

        // Check again before setting up listener
        if (!isActive) return;

        // Listen for PTY output
        unlisten = await listen<{ ptyId: string; data: string }>(
          "pty-output",
          (event) => {
            if (!isActive) return;
            if (event.payload.ptyId === id && xtermRef.current) {
              xtermRef.current.write(event.payload.data);
            }
          }
        );

        // Check if cleanup was called while setting up listener
        if (!isActive && unlisten) {
          unlisten();
          unlisten = null;
          return;
        }

        // Send input to PTY
        term.onData((data) => {
          if (isActive && id) {
            invoke("write_pty", { ptyId: id, data });
          }
        });

        // Handle resize
        term.onResize(({ cols, rows }) => {
          if (isActive && id) {
            invoke("resize_pty", { ptyId: id, cols, rows });
          }
        });

        // Do a few extra fits after initialization to catch any layout shifts
        setTimeout(() => { if (isActive) fitAddon.fit(); }, 100);
        setTimeout(() => { if (isActive) fitAddon.fit(); }, 300);
      } catch (error) {
        if (isActive) {
          term.writeln(`\x1b[31mFailed to initialize terminal: ${error}\x1b[0m`);
        }
      }
    };

    initPty();

    return () => {
      // Mark as inactive FIRST - this prevents any pending callbacks from proceeding
      isActive = false;

      // Cancel pending animation frame to prevent WebGL loading on disposed terminal
      if (initRafId !== null) {
        cancelAnimationFrame(initRafId);
        initRafId = null;
      }

      // Clean up the event listener
      if (unlisten) {
        unlisten();
        unlisten = null;
      }

      // NOTE: We intentionally do NOT close the PTY on unmount.
      // The PTY should persist when switching tabs so we can reconnect to it.
      // PTY will be closed when:
      // 1. The process exits naturally
      // 2. The panel is explicitly closed (handled by Panel.tsx)

      // Dispose WebGL addon first (before terminal)
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        webglAddonRef.current = null;
      }

      // Dispose xterm
      try {
        term.dispose();
      } catch {
        // Ignore disposal errors
      }
      xtermRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
    // Empty dependency array - effect only runs once on mount
    // Uses refs to capture initial values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleWebGLContextLoss]);

  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle focus changes - fit and focus/blur terminal
  useEffect(() => {
    if (!isFocused) {
      // When losing focus, blur the terminal (keyboard capture released)
      xtermRef.current?.blur();
      prevFocusedRef.current = false;
      return;
    }

    // Show transition overlay when returning to terminal (was unfocused, now focused)
    if (!prevFocusedRef.current && isFocused && isReady) {
      setShowTransitionOverlay(true);
      const timer = setTimeout(() => setShowTransitionOverlay(false), 100);
      // Cleanup timeout on unmount
      prevFocusedRef.current = true;
      return () => clearTimeout(timer);
    }

    prevFocusedRef.current = true;

    // When gaining focus, ensure terminal is fitted and focused
    if (xtermRef.current && fitAddonRef.current && terminalRef.current) {
      const rafId = requestAnimationFrame(() => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          xtermRef.current.refresh(0, xtermRef.current.rows);
          xtermRef.current.focus();
        }
      });

      return () => cancelAnimationFrame(rafId);
    }
  }, [isFocused, isReady]);

  const handleClick = () => {
    // Focus the terminal when clicked to ensure it receives keyboard input
    xtermRef.current?.focus();
  };

  return (
    <div className="relative w-full h-full bg-bg-tertiary">
      {/* Loading spinner shown while terminal is fitting */}
      {isVisible && !isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{
          padding: "4px 8px",
          // Prevent CSS inheritance from affecting terminal rendering
          letterSpacing: "normal",
          wordSpacing: "normal",
          fontVariantLigatures: "none",
          fontFeatureSettings: '"liga" 0, "calt" 0',
          textRendering: "auto",
          // Fade in after fit is complete, dim when unfocused
          opacity: isReady ? (isFocused ? 1 : 0.6) : 0,
          transition: "opacity 150ms ease-out, filter 150ms ease-out",
          // Desaturate slightly when unfocused for visual distinction
          filter: isFocused ? "none" : "saturate(0.8)",
        }}
        onClick={handleClick}
      />

      {/* Transition overlay to hide flash when returning to terminal */}
      <div
        className="absolute inset-0 bg-bg-tertiary pointer-events-none"
        style={{
          opacity: showTransitionOverlay ? 1 : 0,
          transition: "opacity 900ms ease-out",
        }}
      />
    </div>
  );
}

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Terminal as XTerm, type IDisposable } from "@xterm/xterm";
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
import { filterAnsiSequences } from "@/lib/ansiFilter";
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

/**
 * Safely load an xterm addon with fallback handling
 * Returns true if addon loaded successfully
 */
function tryLoadAddon(
  term: XTerm | null,
  addon: { activate(terminal: XTerm): void; dispose(): void },
  addonName: string,
  onSuccess?: () => void
): boolean {
  if (!term) return false;
  try {
    term.loadAddon(addon);
    onSuccess?.();
    return true;
  } catch (error) {
    console.warn(`${addonName} addon failed to load:`, error);
    return false;
  }
}

/**
 * Wait for container to have valid dimensions
 * Resolves when container has width/height > 0 or when cleanup is called
 */
function waitForDimensions(
  containerRef: React.RefObject<HTMLDivElement | null>,
  fitAddon: FitAddon,
  isActiveRef: { current: boolean }
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!isActiveRef.current) {
        resolve();
        return;
      }
      const container = containerRef.current;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          fitAddon.fit();
          resolve();
          return;
        }
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
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

  // Additional addon refs for proper disposal (Issue #1)
  const webLinksAddonRef = useRef<WebLinksAddon | null>(null);
  const unicode11AddonRef = useRef<Unicode11Addon | null>(null);
  const clipboardAddonRef = useRef<ClipboardAddon | null>(null);
  const canvasAddonRef = useRef<CanvasAddon | null>(null);

  // Event disposable refs for cleanup (Issue #2)
  const onDataDisposableRef = useRef<IDisposable | null>(null);
  const onResizeDisposableRef = useRef<IDisposable | null>(null);

  // Debounce and timing refs (Issues #3, #7)
  const debouncedFitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOutputTimeRef = useRef<number>(0);
  const resizeQuietPeriodMs = 500;

  // PTY health monitoring (Issue #5)
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPtyIdRef = useRef<string | null>(null);
  const [isPtyHealthy, setIsPtyHealthy] = useState(true);

  // Output buffering for reconnection (Issue #6)
  const outputBufferRef = useRef<string[]>([]);
  const isBufferingRef = useRef(false);
  const bufferFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if terminal is ready to be shown (after fit is complete)
  const [isReady, setIsReady] = useState(false);
  // Track transition overlay to hide flash when returning to terminal
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const prevFocusedRef = useRef(isFocused);

  // Get terminal settings
  const terminalShell = useSettingsStore((s) => s.terminalShell);
  const terminalFontSize = useSettingsStore((s) => s.terminalFontSize);
  const terminalCursorBlink = useSettingsStore((s) => s.terminalCursorBlink);
  const terminalAnsiFilter = useSettingsStore((s) => s.terminalAnsiFilter);

  // Stable refs to capture initial values - effect only runs once on mount
  const initialPtyId = useRef(ptyId);
  const initialProjectPath = useRef(projectPath);
  const initialShellPath = useRef(getShellPath(terminalShell));
  const initialFontSize = useRef(terminalFontSize);
  const initialCursorBlink = useRef(terminalCursorBlink);
  const onPtyCreatedRef = useRef(onPtyCreated);
  const onPtyClosedRef = useRef(onPtyClosed);
  const onSearchAddonReadyRef = useRef(onSearchAddonReady);
  // Ref for ANSI filter - updated dynamically so listener always uses current value
  const ansiFilterRef = useRef(terminalAnsiFilter);

  // Keep callback refs updated
  onPtyCreatedRef.current = onPtyCreated;
  onPtyClosedRef.current = onPtyClosed;
  onSearchAddonReadyRef.current = onSearchAddonReady;
  ansiFilterRef.current = terminalAnsiFilter;

  // Handle WebGL context loss gracefully
  const handleWebGLContextLoss = useCallback((term: XTerm) => {
    console.warn("WebGL context lost, falling back to Canvas renderer");
    if (webglAddonRef.current) {
      webglAddonRef.current.dispose();
      webglAddonRef.current = null;
    }
    // Fall back to canvas renderer - track for disposal (Issue #8)
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
      canvasAddonRef.current = canvasAddon;
    } catch (error) {
      console.warn("Canvas fallback also failed, using default renderer:", error);
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

    // Store refs for all addons (Issue #1, #3 - track for disposal)
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    webLinksAddonRef.current = webLinksAddon;
    unicode11AddonRef.current = unicodeAddon;
    clipboardAddonRef.current = clipboardAddon;

    // Notify parent that search addon is ready
    if (onSearchAddonReadyRef.current) {
      onSearchAddonReadyRef.current(searchAddon);
    }

    // Wait for fonts to be ready, then fit, focus, and load GPU renderer
    const initializeTerminal = async () => {
      // Wait for document fonts to be ready for proper character width calculation
      await document.fonts.ready.catch(() => {});
      if (!isActive) return;

      // Small delay to ensure DOM is fully rendered and terminal is ready
      initRafId = requestAnimationFrame(() => {
        if (!isActive) return;
        const currentTerm = xtermRef.current;
        const currentFitAddon = fitAddonRef.current;
        if (!currentTerm || !currentFitAddon) return;

        // Load GPU-accelerated renderer (WebGL > Canvas > DOM fallback)
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          if (isActive && xtermRef.current) {
            handleWebGLContextLoss(xtermRef.current);
          }
        });

        const webglLoaded = tryLoadAddon(currentTerm, webglAddon, "WebGL", () => {
          webglAddonRef.current = webglAddon;
        });

        // Track canvas addon for disposal (Issue #8)
        if (!webglLoaded && isActive) {
          const canvas = new CanvasAddon();
          tryLoadAddon(currentTerm, canvas, "Canvas", () => {
            canvasAddonRef.current = canvas;
          });
        }

        // Final fit and focus
        if (!isActive || !xtermRef.current || !fitAddonRef.current) return;
        fitAddonRef.current.fit();
        xtermRef.current.focus();
        setIsReady(true);
      });
    };

    initializeTerminal();

    // Create or attach to PTY
    const isActiveRef = { current: isActive };
    const initPty = async () => {
      if (!isActiveRef.current) return;

      // Wait for fonts and container dimensions
      await document.fonts.ready.catch(() => {});
      if (!isActiveRef.current) return;

      await waitForDimensions(terminalRef, fitAddon, isActiveRef);
      if (!isActiveRef.current) return;

      try {
        let id = initialPtyId.current;
        if (!id) {
          id = await invoke<string>("create_pty", {
            cwd: initialProjectPath.current,
            cols: term.cols,
            rows: term.rows,
            shell: initialShellPath.current,
          });

          if (!isActiveRef.current) {
            invoke("close_pty", { ptyId: id }).catch(() => {});
            return;
          }
          onPtyCreatedRef.current(id);
        }

        if (!isActiveRef.current) return;

        // Track PTY ID for health monitoring (Issue #5)
        currentPtyIdRef.current = id;

        // Enable buffering for reconnection (Issue #6)
        const isReconnecting = !!initialPtyId.current;
        if (isReconnecting) {
          isBufferingRef.current = true;
          bufferFlushTimeoutRef.current = setTimeout(() => {
            // Flush buffered output
            if (xtermRef.current && outputBufferRef.current.length > 0) {
              const buffered = outputBufferRef.current.join("");
              outputBufferRef.current = [];
              xtermRef.current.write(buffered);
            }
            isBufferingRef.current = false;
          }, 100);
        }

        // Listen for PTY output
        unlisten = await listen<{ ptyId: string; data: string }>("pty-output", (event) => {
          if (isActiveRef.current && event.payload.ptyId === id && xtermRef.current) {
            // Track output time for resize quiet period (Issue #7)
            lastOutputTimeRef.current = Date.now();

            // Apply ANSI filter if enabled (fixes Claude Code CLI blank lines issue)
            const data = ansiFilterRef.current
              ? filterAnsiSequences(event.payload.data)
              : event.payload.data;

            // Buffer output on reconnection (Issue #6)
            if (isBufferingRef.current) {
              outputBufferRef.current.push(data);
            } else {
              xtermRef.current.write(data);
            }
          }
        });

        if (!isActiveRef.current && unlisten) {
          unlisten();
          unlisten = null;
          return;
        }

        // Wire up input and resize handlers - store disposables (Issue #2)
        onDataDisposableRef.current = term.onData((data) => {
          if (isActiveRef.current && id) invoke("write_pty", { ptyId: id, data });
        });

        onResizeDisposableRef.current = term.onResize(({ cols, rows }) => {
          if (isActiveRef.current && id) invoke("resize_pty", { ptyId: id, cols, rows });
        });

        // Extra fits to catch layout shifts
        setTimeout(() => { if (isActiveRef.current) fitAddon.fit(); }, 100);
        setTimeout(() => { if (isActiveRef.current) fitAddon.fit(); }, 300);
      } catch (error) {
        if (isActiveRef.current) {
          term.writeln(`\x1b[31mFailed to initialize terminal: ${error}\x1b[0m`);
        }
      }
    };

    initPty();

    return () => {
      // Mark as inactive FIRST - this prevents any pending callbacks from proceeding
      isActive = false;
      isActiveRef.current = false;

      // Cancel pending animation frame to prevent WebGL loading on disposed terminal
      if (initRafId !== null) {
        cancelAnimationFrame(initRafId);
        initRafId = null;
      }

      // Cancel pending debounce timer (Issue #3)
      if (debouncedFitRef.current) {
        clearTimeout(debouncedFitRef.current);
        debouncedFitRef.current = null;
      }

      // Cancel buffer flush timeout (Issue #6)
      if (bufferFlushTimeoutRef.current) {
        clearTimeout(bufferFlushTimeoutRef.current);
        bufferFlushTimeoutRef.current = null;
      }
      outputBufferRef.current = [];
      isBufferingRef.current = false;

      // Dispose event disposables FIRST (Issue #2)
      if (onDataDisposableRef.current) {
        try {
          onDataDisposableRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        onDataDisposableRef.current = null;
      }

      if (onResizeDisposableRef.current) {
        try {
          onResizeDisposableRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        onResizeDisposableRef.current = null;
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

      // Clear PTY ID ref
      currentPtyIdRef.current = null;

      // Dispose addons in reverse order of loading (Issues #1, #8)
      // GPU renderers first
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        webglAddonRef.current = null;
      }

      if (canvasAddonRef.current) {
        try {
          canvasAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        canvasAddonRef.current = null;
      }

      // Then other addons
      if (clipboardAddonRef.current) {
        try {
          clipboardAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        clipboardAddonRef.current = null;
      }

      if (unicode11AddonRef.current) {
        try {
          unicode11AddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        unicode11AddonRef.current = null;
      }

      if (searchAddonRef.current) {
        try {
          searchAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        searchAddonRef.current = null;
      }

      if (webLinksAddonRef.current) {
        try {
          webLinksAddonRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
        webLinksAddonRef.current = null;
      }

      // FitAddon disposal (technically not needed but good practice)
      fitAddonRef.current = null;

      // Finally dispose xterm instance
      try {
        term.dispose();
      } catch {
        // Ignore disposal errors
      }
      xtermRef.current = null;
    };
  }, [handleWebGLContextLoss]);

  // Debounced resize handler with quiet period respect (Issues #3, #7)
  useEffect(() => {
    const handleResize = () => {
      // Cancel any pending debounced fit
      if (debouncedFitRef.current) {
        clearTimeout(debouncedFitRef.current);
      }

      // Check quiet period - defer if output is active (Issue #7)
      const timeSinceOutput = Date.now() - lastOutputTimeRef.current;
      const delay = timeSinceOutput < resizeQuietPeriodMs ? resizeQuietPeriodMs : 150;

      // Debounce the fit call (Issue #3)
      debouncedFitRef.current = setTimeout(() => {
        debouncedFitRef.current = null;
        fitAddonRef.current?.fit();
      }, delay);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      // Cleanup debounce timer
      if (debouncedFitRef.current) {
        clearTimeout(debouncedFitRef.current);
        debouncedFitRef.current = null;
      }
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

  // PTY health monitoring (Issue #5)
  useEffect(() => {
    // Only monitor when terminal is visible and we have a PTY
    if (!isVisible || !currentPtyIdRef.current) {
      return;
    }

    const checkHealth = async () => {
      const ptyId = currentPtyIdRef.current;
      if (!ptyId) return;

      try {
        const isActive = await invoke<boolean>("is_pty_active", { ptyId });
        setIsPtyHealthy(isActive);

        // If PTY died, notify parent
        if (!isActive && onPtyClosedRef.current) {
          onPtyClosedRef.current();
        }
      } catch {
        // If check fails, assume unhealthy
        setIsPtyHealthy(false);
      }
    };

    // Check every 30 seconds
    healthCheckIntervalRef.current = setInterval(checkHealth, 30000);

    // Initial check after a short delay
    const initialCheck = setTimeout(checkHealth, 1000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      clearTimeout(initialCheck);
    };
  }, [isVisible]);

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

      {/* PTY health indicator (Issue #5) */}
      {isReady && !isPtyHealthy && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-accent-red/20 text-accent-red text-xs">
          Process ended
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
          // Critical: Reset line-height to prevent inherited values (body has 1.5)
          // from affecting xterm's character measurement and cell height calculations
          lineHeight: 1,
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

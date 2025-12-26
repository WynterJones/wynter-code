import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { CanvasAddon } from "@xterm/addon-canvas";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore, TERMINAL_SHELLS, type TerminalShell } from "@/stores/settingsStore";
import { terminalTheme } from "@/lib/terminalTheme";
import "@xterm/xterm/css/xterm.css";

function getShellPath(shell: TerminalShell): string | null {
  const shellConfig = TERMINAL_SHELLS.find(s => s.id === shell);
  return shellConfig?.path ?? null;
}

interface TerminalProps {
  projectPath: string;
  ptyId: string | null;
  onPtyCreated: (ptyId: string) => void;
  isVisible?: boolean;
  onSearchAddonReady?: (searchAddon: SearchAddon) => void;
}

export function Terminal({ projectPath, ptyId, onPtyCreated, isVisible = true, onSearchAddonReady }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

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
  const onSearchAddonReadyRef = useRef(onSearchAddonReady);

  // Keep callback refs updated
  onPtyCreatedRef.current = onPtyCreated;
  onSearchAddonReadyRef.current = onSearchAddonReady;

  useEffect(() => {
    if (!terminalRef.current) return;

    // Track if this effect instance is still active (for cleanup race condition)
    let isActive = true;
    let unlisten: UnlistenFn | null = null;
    let createdPtyId: string | null = null;

    const term = new XTerm({
      cursorBlink: initialCursorBlink.current,
      fontSize: initialFontSize.current,
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, monospace',
      theme: terminalTheme,
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const unicodeAddon = new Unicode11Addon();
    const canvasAddon = new CanvasAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(unicodeAddon);
    term.loadAddon(canvasAddon);
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

    // Initial fit and focus
    setTimeout(() => {
      if (isActive) {
        fitAddon.fit();
        term.focus();
      }
    }, 0);

    // Create or attach to PTY
    const initPty = async () => {
      // If cleanup already ran, don't proceed
      if (!isActive) return;

      try {
        // Use initial values from refs - these won't change during the effect lifecycle
        let id = initialPtyId.current;
        if (!id) {
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

          createdPtyId = id;
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
      } catch (error) {
        if (isActive) {
          term.writeln(`\x1b[31mFailed to initialize terminal: ${error}\x1b[0m`);
        }
      }
    };

    initPty();

    return () => {
      // Mark as inactive FIRST
      isActive = false;

      // Clean up the event listener
      if (unlisten) {
        unlisten();
        unlisten = null;
      }

      // Close the PTY if we created it
      if (createdPtyId) {
        invoke("close_pty", { ptyId: createdPtyId }).catch(() => {});
      }

      // Dispose xterm
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
    // Empty dependency array - effect only runs once on mount
    // Uses refs to capture initial values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Refresh terminal when becoming visible (fixes black screen on tab switch)
  useEffect(() => {
    if (isVisible && xtermRef.current && fitAddonRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        fitAddonRef.current?.fit();
        xtermRef.current?.refresh(0, xtermRef.current.rows);
        xtermRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible]);

  const handleClick = () => {
    // Focus the terminal when clicked to ensure it receives keyboard input
    xtermRef.current?.focus();
  };

  return (
    <div
      ref={terminalRef}
      className="w-full h-full bg-bg-tertiary"
      style={{ padding: "4px 8px" }}
      onClick={handleClick}
    />
  );
}

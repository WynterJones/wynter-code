import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore, TERMINAL_SHELLS, type TerminalShell } from "@/stores/settingsStore";
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
}

export function Terminal({ projectPath, ptyId, onPtyCreated, isVisible = true }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Get the configured shell setting
  const terminalShell = useSettingsStore((s) => s.terminalShell);

  // Stable refs to capture initial values - effect only runs once on mount
  const initialPtyId = useRef(ptyId);
  const initialProjectPath = useRef(projectPath);
  const initialShellPath = useRef(getShellPath(terminalShell));
  const onPtyCreatedRef = useRef(onPtyCreated);

  // Keep callback ref updated
  onPtyCreatedRef.current = onPtyCreated;

  useEffect(() => {
    if (!terminalRef.current) return;

    // Track if this effect instance is still active (for cleanup race condition)
    let isActive = true;
    let unlisten: UnlistenFn | null = null;
    let createdPtyId: string | null = null;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, monospace',
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#e4e4e7",
        cursorAccent: "#0a0a0a",
        selectionBackground: "#27272a",
        selectionForeground: "#e4e4e7",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

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
      className="w-full h-full bg-[#0a0a0a]"
      style={{ padding: "4px 8px" }}
      onClick={handleClick}
    />
  );
}

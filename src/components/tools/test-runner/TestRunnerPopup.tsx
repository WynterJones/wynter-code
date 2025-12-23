import { useState, useEffect, useCallback } from "react";
import {
  FlaskConical,
  Play,
  Square,
  RefreshCw,
  Zap,
  Coffee,
  Leaf,
  Theater,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui";
import { Terminal } from "@/components/terminal/Terminal";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface TestRunnerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type TestStatus = "detecting" | "no-tests" | "idle" | "running" | "passed" | "failed";

interface DetectedFramework {
  name: string;
  displayName: string;
  command: string;
  watchCommand?: string;
  configFile?: string;
  icon: LucideIcon;
  color: string;
}

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const FRAMEWORK_CHECKS = [
  {
    name: "vitest",
    displayName: "Vitest",
    packages: ["vitest", "@vitest/ui"],
    configFiles: ["vitest.config.ts", "vitest.config.js", "vitest.config.mjs"],
    command: "npx vitest run",
    watchCommand: "npx vitest",
    icon: Zap,
    color: "text-yellow-400",
  },
  {
    name: "jest",
    displayName: "Jest",
    packages: ["jest", "@jest/core"],
    configFiles: ["jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.json"],
    command: "npx jest",
    watchCommand: "npx jest --watch",
    icon: FlaskConical,
    color: "text-red-400",
  },
  {
    name: "playwright",
    displayName: "Playwright",
    packages: ["@playwright/test", "playwright"],
    configFiles: ["playwright.config.ts", "playwright.config.js"],
    command: "npx playwright test",
    icon: Theater,
    color: "text-green-400",
  },
  {
    name: "cypress",
    displayName: "Cypress",
    packages: ["cypress"],
    configFiles: ["cypress.config.ts", "cypress.config.js", "cypress.config.mjs"],
    command: "npx cypress run",
    icon: Leaf,
    color: "text-emerald-400",
  },
  {
    name: "mocha",
    displayName: "Mocha",
    packages: ["mocha"],
    configFiles: [".mocharc.json", ".mocharc.js", ".mocharc.yaml"],
    command: "npx mocha",
    icon: Coffee,
    color: "text-amber-400",
  },
];

const INSTALL_SUGGESTIONS = [
  { name: "Vitest", command: "npm install -D vitest", icon: Zap, color: "text-yellow-400" },
  { name: "Jest", command: "npm install -D jest", icon: FlaskConical, color: "text-red-400" },
  { name: "Playwright", command: "npm install -D @playwright/test", icon: Theater, color: "text-green-400" },
  { name: "Cypress", command: "npm install -D cypress", icon: Leaf, color: "text-emerald-400" },
];

export function TestRunnerPopup({ isOpen, onClose }: TestRunnerPopupProps) {
  const [status, setStatus] = useState<TestStatus>("detecting");
  const [frameworks, setFrameworks] = useState<DetectedFramework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<DetectedFramework | null>(null);
  const [ptyId, setPtyId] = useState<string | null>(null);

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  const detectFrameworks = useCallback(async () => {
    if (!activeProject?.path) {
      setStatus("no-tests");
      return;
    }

    setStatus("detecting");
    const detected: DetectedFramework[] = [];

    try {
      // Read package.json
      let packageJson: PackageJson | null = null;
      try {
        const content = await invoke<string>("read_file_content", {
          path: `${activeProject.path}/package.json`,
        });
        packageJson = JSON.parse(content);
      } catch {
        // No package.json
      }

      const allDeps = {
        ...packageJson?.dependencies,
        ...packageJson?.devDependencies,
      };

      // Check each framework
      for (const check of FRAMEWORK_CHECKS) {
        const hasPackage = check.packages.some((pkg) => pkg in allDeps);

        let configFile: string | undefined;
        for (const cfg of check.configFiles) {
          try {
            await invoke<string>("read_file_content", {
              path: `${activeProject.path}/${cfg}`,
            });
            configFile = cfg;
            break;
          } catch {
            // Config doesn't exist
          }
        }

        if (hasPackage || configFile) {
          detected.push({
            name: check.name,
            displayName: check.displayName,
            command: check.command,
            watchCommand: check.watchCommand,
            configFile,
            icon: check.icon,
            color: check.color,
          });
        }
      }

      // Fallback: check npm test script
      if (detected.length === 0 && packageJson?.scripts?.test) {
        const testScript = packageJson.scripts.test;
        if (testScript && !testScript.includes("no test specified")) {
          detected.push({
            name: "npm",
            displayName: "npm test",
            command: "npm test",
            icon: Package,
            color: "text-orange-400",
          });
        }
      }

      setFrameworks(detected);
      if (detected.length > 0) {
        setSelectedFramework(detected[0]);
        setStatus("idle");
      } else {
        setStatus("no-tests");
      }
    } catch (error) {
      console.error("Failed to detect frameworks:", error);
      setStatus("no-tests");
    }
  }, [activeProject?.path]);

  useEffect(() => {
    if (isOpen) {
      setStatus("detecting");
      setFrameworks([]);
      setSelectedFramework(null);
      setPtyId(null);
      detectFrameworks();
    }
  }, [isOpen, detectFrameworks]);

  const handlePtyCreated = async (id: string) => {
    setPtyId(id);
    if (selectedFramework) {
      await invoke("write_pty", { ptyId: id, data: selectedFramework.command + "\n" });
    }
  };

  const handleRunTests = () => {
    setStatus("running");
    setPtyId(null);
  };

  const handleStopTests = async () => {
    if (ptyId) {
      // Send Ctrl+C
      await invoke("write_pty", { ptyId, data: "\x03" });
    }
    setStatus("idle");
  };

  const renderDetecting = () => (
    <div className="flex-1 h-full flex flex-col items-center justify-center text-text-secondary p-8">
      <Loader2 className="w-12 h-12 animate-spin opacity-50 mb-4" />
      <p className="text-sm">Detecting test frameworks...</p>
    </div>
  );

  const renderNoTests = () => (
    <div className="flex-1 h-full flex flex-col items-center justify-center text-text-secondary p-8">
      <AlertCircle className="w-16 h-16 opacity-20 mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">No Test Frameworks Detected</h3>
      <p className="text-sm text-center max-w-md mb-6">
        This project doesn&apos;t appear to have any test frameworks installed. Consider adding one:
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {INSTALL_SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <div
              key={suggestion.name}
              className={cn(
                "flex flex-col gap-1 p-3 rounded-lg border border-border",
                "bg-bg-secondary"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", suggestion.color)} />
                <span className="font-medium text-sm text-text-primary">{suggestion.name}</span>
              </div>
              <code className="text-xs text-text-secondary font-mono truncate">{suggestion.command}</code>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderIdle = () => (
    <div className="flex-1 flex flex-col p-4">
      {/* Framework Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Select Test Framework
        </label>
        <div className="flex flex-wrap gap-2">
          {frameworks.map((framework) => {
            const Icon = framework.icon;
            const isSelected = selectedFramework?.name === framework.name;
            return (
              <button
                key={framework.name}
                onClick={() => setSelectedFramework(framework)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                )}
              >
                <Icon className={cn("w-4 h-4", isSelected ? "text-accent" : framework.color)} />
                <span className="text-sm font-medium">{framework.displayName}</span>
                {framework.configFile && (
                  <span className="text-xs opacity-60">({framework.configFile})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Command Preview */}
      {selectedFramework && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">Command</label>
          <code className="block px-3 py-2 rounded-md bg-bg-tertiary text-text-secondary text-sm font-mono">
            {selectedFramework.command}
          </code>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRunTests}
          disabled={!selectedFramework}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-colors",
            "bg-accent text-white hover:bg-accent/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4" />
          Run Tests
        </button>
        {selectedFramework?.watchCommand && (
          <button
            onClick={() => {
              if (selectedFramework) {
                setSelectedFramework({
                  ...selectedFramework,
                  command: selectedFramework.watchCommand!,
                });
                handleRunTests();
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border border-border",
              "bg-bg-secondary text-text-secondary hover:bg-bg-hover transition-colors"
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Watch Mode
          </button>
        )}
      </div>

      {/* Empty space placeholder */}
      <div className="flex-1 flex items-center justify-center mt-8">
        <div className="text-center text-text-secondary">
          <FlaskConical className="w-16 h-16 opacity-10 mx-auto mb-4" />
          <p className="text-sm">Select a framework and click Run Tests</p>
        </div>
      </div>
    </div>
  );

  const renderRunning = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          {selectedFramework && (
            <>
              <selectedFramework.icon className={cn("w-4 h-4", selectedFramework.color)} />
              <span className="font-medium text-sm">{selectedFramework.displayName}</span>
            </>
          )}
          {status === "running" && (
            <span className="flex items-center gap-1 text-text-secondary text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          )}
          {status === "passed" && (
            <span className="flex items-center gap-1 text-green-500 text-sm">
              <CheckCircle2 className="w-3 h-3" />
              Passed
            </span>
          )}
          {status === "failed" && (
            <span className="flex items-center gap-1 text-red-500 text-sm">
              <XCircle className="w-3 h-3" />
              Failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "running" && (
            <button
              onClick={handleStopTests}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                "bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              )}
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
          {(status === "passed" || status === "failed") && (
            <button
              onClick={handleRunTests}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                "bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              )}
            >
              <RefreshCw className="w-3 h-3" />
              Re-run
            </button>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        {activeProject && (
          <Terminal projectPath={activeProject.path} ptyId={ptyId} onPtyCreated={handlePtyCreated} />
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case "detecting":
        return renderDetecting();
      case "no-tests":
        return renderNoTests();
      case "idle":
        return renderIdle();
      case "running":
      case "passed":
      case "failed":
        return renderRunning();
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Runner" size="lg" className="h-[550px]">
      <div className="flex flex-col h-full">{renderContent()}</div>
    </Modal>
  );
}

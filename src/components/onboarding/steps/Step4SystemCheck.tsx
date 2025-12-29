import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Check, X, RefreshCw, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useOnboardingStore, type SystemCheckResults } from "@/stores";

interface Step4SystemCheckProps {
  onComplete: () => void;
  onPrevious: () => void;
}

interface CheckItem {
  key: keyof SystemCheckResults;
  label: string;
  installCommand?: string;
  installUrl?: string;
}

// Required items must be installed
const requiredItems: CheckItem[] = [
  {
    key: "node",
    label: "Node.js",
    installUrl: "https://nodejs.org",
  },
  {
    key: "npm",
    label: "npm",
    installUrl: "https://nodejs.org",
  },
  {
    key: "git",
    label: "Git",
    installUrl: "https://git-scm.com",
  },
  {
    key: "claude",
    label: "Claude Code CLI",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    installUrl: "https://docs.anthropic.com/en/docs/claude-code",
  },
];

// Optional items enhance functionality but aren't required
const optionalItems: CheckItem[] = [
  {
    key: "codex",
    label: "Codex CLI (Optional)",
    installCommand: "npm install -g @openai/codex",
    installUrl: "https://github.com/openai/codex-cli",
  },
  {
    key: "gemini",
    label: "Gemini CLI (Optional)",
    installCommand: "npm install -g @google/gemini-cli",
    installUrl: "https://github.com/google-gemini/gemini-cli",
  },
];

const checkItems = [...requiredItems, ...optionalItems];

export function Step4SystemCheck({ onComplete, onPrevious }: Step4SystemCheckProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const { systemCheckResults, isCheckingSystem, setSystemCheckResults, setIsCheckingSystem } =
    useOnboardingStore();

  useEffect(() => {
    if (!systemCheckResults) {
      runSystemCheck();
    }
  }, []);

  const runSystemCheck = async () => {
    setIsCheckingSystem(true);
    try {
      const results = await invoke<SystemCheckResults>("check_system_requirements");
      setSystemCheckResults(results);
    } catch (error) {
      console.error("System check failed:", error);
      setSystemCheckResults({
        node: null,
        npm: null,
        git: null,
        claude: null,
        codex: null,
        gemini: null,
      });
    } finally {
      setIsCheckingSystem(false);
    }
  };

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Only required items need to pass
  const allPassed =
    systemCheckResults &&
    requiredItems.every((item) => systemCheckResults[item.key] !== null);

  // Show missing items section if any required items are missing
  const hasMissingItems =
    systemCheckResults &&
    requiredItems.some((item) => systemCheckResults[item.key] === null);

  const missingItemsWithCommands = checkItems.filter(
    (item) => systemCheckResults?.[item.key] === null && item.installCommand
  );

  return (
    <div className="flex flex-col min-h-[450px] px-8 py-10">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-2">
          System Check
        </h2>

        <p className="text-text-secondary text-center mb-6">
          {isCheckingSystem
            ? "Checking your system..."
            : allPassed
            ? "All set! You're ready to go."
            : "Some requirements are missing"}
        </p>

        <div className="max-w-md mx-auto rounded-lg bg-bg-tertiary/50 border border-border overflow-hidden">
          {checkItems.map((item, index) => {
            const version = systemCheckResults?.[item.key];
            const isLoading = isCheckingSystem && !systemCheckResults;
            const isInstalled = version !== null;

            return (
              <div
                key={item.key}
                className={`flex items-center justify-between px-3 py-2 ${
                  index !== checkItems.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isLoading
                        ? "bg-text-secondary/20"
                        : isInstalled
                        ? "bg-accent-green/20"
                        : "bg-accent-red/20"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 text-text-secondary animate-spin" />
                    ) : isInstalled ? (
                      <Check className="w-3 h-3 text-accent-green" />
                    ) : (
                      <X className="w-3 h-3 text-accent-red" />
                    )}
                  </div>
                  <span className="text-sm text-text-primary">
                    {item.label}
                  </span>
                  {version && (
                    <span className="text-xs text-text-secondary">
                      {version}
                    </span>
                  )}
                </div>

                {!isInstalled && !isLoading && item.installUrl && (
                  <button
                    onClick={() => window.open(item.installUrl, "_blank")}
                    className="text-xs text-accent hover:text-accent-light flex items-center gap-1"
                  >
                    Install
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {missingItemsWithCommands.length > 0 && !isCheckingSystem && (
          <div className="mt-4 max-w-md mx-auto p-3 rounded-lg bg-bg-primary/50 border border-border">
            <p className="text-xs text-text-secondary mb-2">Install commands:</p>
            <div className="space-y-1.5">
              {missingItemsWithCommands.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 rounded bg-bg-tertiary text-xs font-mono text-accent truncate">
                    {item.installCommand}
                  </code>
                  <button
                    onClick={() => copyCommand(item.installCommand!)}
                    className="p-1 hover:bg-bg-tertiary rounded"
                  >
                    {copiedCommand === item.installCommand ? (
                      <Check className="w-3 h-3 text-accent-green" />
                    ) : (
                      <Copy className="w-3 h-3 text-text-secondary" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onPrevious} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {hasMissingItems && !isCheckingSystem && (
            <Button
              variant="outline"
              onClick={runSystemCheck}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Re-check
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onComplete}
            disabled={isCheckingSystem}
          >
            {allPassed ? "Get Started" : "Skip for now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

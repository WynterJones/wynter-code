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

const checkItems: CheckItem[] = [
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

  const allPassed =
    systemCheckResults &&
    checkItems.every((item) => systemCheckResults[item.key] !== null);

  const hasMissingItems =
    systemCheckResults &&
    checkItems.some((item) => systemCheckResults[item.key] === null);

  return (
    <div className="flex flex-col min-h-[450px] px-8 py-10">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-2">
          System Check
        </h2>

        <p className="text-text-secondary text-center mb-8">
          {isCheckingSystem
            ? "Checking your system..."
            : allPassed
            ? "All set! You're ready to go."
            : "Some requirements are missing"}
        </p>

        <div className="space-y-3 max-w-md mx-auto">
          {checkItems.map((item) => {
            const version = systemCheckResults?.[item.key];
            const isLoading = isCheckingSystem && !systemCheckResults;
            const isInstalled = version !== null;

            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-lg bg-bg-tertiary/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isLoading
                        ? "bg-text-secondary/20"
                        : isInstalled
                        ? "bg-accent-green/20"
                        : "bg-accent-red/20"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
                    ) : isInstalled ? (
                      <Check className="w-4 h-4 text-accent-green" />
                    ) : (
                      <X className="w-4 h-4 text-accent-red" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-text-primary">
                      {item.label}
                    </span>
                    {version && (
                      <span className="ml-2 text-sm text-text-secondary">
                        {version}
                      </span>
                    )}
                  </div>
                </div>

                {!isInstalled && !isLoading && item.installUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.installUrl, "_blank")}
                    className="gap-1"
                  >
                    Install
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {hasMissingItems && !isCheckingSystem && (
          <div className="mt-6 max-w-md mx-auto">
            {checkItems
              .filter(
                (item) =>
                  systemCheckResults?.[item.key] === null && item.installCommand
              )
              .map((item) => (
                <div
                  key={item.key}
                  className="p-4 rounded-lg bg-bg-primary/50 border border-border mb-3"
                >
                  <p className="text-sm text-text-secondary mb-2">
                    To install {item.label}:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-bg-tertiary text-sm font-mono text-accent">
                      {item.installCommand}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCommand(item.installCommand!)}
                    >
                      {copiedCommand === item.installCommand ? (
                        <Check className="w-4 h-4 text-accent-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
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

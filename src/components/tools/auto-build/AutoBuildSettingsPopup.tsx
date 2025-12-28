import { X } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

interface AutoBuildSettingsPopupProps {
  onClose: () => void;
}

export function AutoBuildSettingsPopup({ onClose }: AutoBuildSettingsPopupProps) {
  const { settings, updateSettings, status } = useAutoBuildStore();
  const isDisabled = status === "running";

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Settings Panel */}
      <div className="relative w-80 rounded-lg border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between border-b border-border px-4 py-3 cursor-grab active:cursor-grabbing"
        >
          <h3 className="font-medium" data-tauri-drag-region>Settings</h3>
          <IconButton size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-4">
          {/* Verification Section */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Verification
            </h4>
            <div className="flex flex-col gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runLint}
                  onChange={(e) => updateSettings({ runLint: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Run Lint</div>
                  <div className="text-xs text-text-secondary">npm run lint</div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runTests}
                  onChange={(e) => updateSettings({ runTests: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Run Tests</div>
                  <div className="text-xs text-text-secondary">npm run test</div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runBuild}
                  onChange={(e) => updateSettings({ runBuild: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Run Build</div>
                  <div className="text-xs text-text-secondary">npm run build</div>
                </div>
              </label>
            </div>
          </div>

          {/* Workflow Section */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Workflow
            </h4>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                isDisabled && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="checkbox"
                checked={settings.requireHumanReview}
                onChange={(e) => updateSettings({ requireHumanReview: e.target.checked })}
                disabled={isDisabled}
                className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
              />
              <div>
                <div className="text-sm">Require Human Review</div>
                <div className="text-xs text-text-secondary">
                  Review each issue before completion
                </div>
              </div>
            </label>
          </div>

          {/* Commit Section */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Git
            </h4>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                isDisabled && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="checkbox"
                checked={settings.autoCommit}
                onChange={(e) => updateSettings({ autoCommit: e.target.checked })}
                disabled={isDisabled}
                className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
              />
              <div>
                <div className="text-sm">Auto Commit</div>
                <div className="text-xs text-text-secondary">
                  Commit after each completed issue
                </div>
              </div>
            </label>
          </div>

          {/* Error Handling */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Error Handling
            </h4>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="text-sm">Max Retries</div>
                <div className="text-xs text-text-secondary">
                  Retry before marking blocked
                </div>
              </div>
              <select
                value={settings.maxRetries}
                onChange={(e) => updateSettings({ maxRetries: Number(e.target.value) })}
                disabled={isDisabled}
                className={cn(
                  "rounded border border-border bg-bg-secondary px-2 py-1 text-sm",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Filter
            </h4>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="text-sm">Min Priority</div>
                <div className="text-xs text-text-secondary">
                  Only work on issues at or above
                </div>
              </div>
              <select
                value={settings.priorityThreshold}
                onChange={(e) =>
                  updateSettings({ priorityThreshold: Number(e.target.value) })
                }
                disabled={isDisabled}
                className={cn(
                  "rounded border border-border bg-bg-secondary px-2 py-1 text-sm",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <option value={0}>P0 only</option>
                <option value={1}>P0-P1</option>
                <option value={2}>P0-P2</option>
                <option value={3}>P0-P3</option>
                <option value={4}>All</option>
              </select>
            </div>
          </div>

          {/* AI Audits Section */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              AI Audits
            </h4>
            <div className="flex flex-col gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runSecurityAudit}
                  onChange={(e) => updateSettings({ runSecurityAudit: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Security Audit</div>
                  <div className="text-xs text-text-secondary">OWASP vulnerability scan</div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runPerformanceAudit}
                  onChange={(e) => updateSettings({ runPerformanceAudit: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Performance Audit</div>
                  <div className="text-xs text-text-secondary">Memory leaks, anti-patterns</div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runCodeQualityAudit}
                  onChange={(e) => updateSettings({ runCodeQualityAudit: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Code Quality Audit</div>
                  <div className="text-xs text-text-secondary">DRY, complexity, naming</div>
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-bg-secondary",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.runAccessibilityAudit}
                  onChange={(e) => updateSettings({ runAccessibilityAudit: e.target.checked })}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-border bg-bg-secondary accent-accent"
                />
                <div>
                  <div className="text-sm">Accessibility Audit</div>
                  <div className="text-xs text-text-secondary">WCAG 2.1 (UI files only)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isDisabled && (
          <div className="border-t border-border px-4 py-3 text-center text-xs text-text-secondary">
            Settings cannot be changed while running
          </div>
        )}
      </div>
    </div>
  );
}

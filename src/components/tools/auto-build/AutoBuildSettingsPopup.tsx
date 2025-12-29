import { X, Shield, Zap, Code2, Accessibility, GitCommit, Users, RotateCcw, Filter, CheckSquare, GitBranch, GitPullRequest, AlertCircle } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AutoBuildSettingsPopupProps {
  onClose: () => void;
}

export function AutoBuildSettingsPopup({ onClose }: AutoBuildSettingsPopupProps) {
  const { settings, updateSettings, status, projectPath } = useAutoBuildStore();
  const isDisabled = status === "running";
  const [ghAvailable, setGhAvailable] = useState<boolean | null>(null);

  // Check if gh CLI is installed
  useEffect(() => {
    async function checkGh() {
      if (!projectPath) {
        setGhAvailable(false);
        return;
      }
      try {
        const result = await invoke<{ success: boolean; output: string }>("run_command", {
          command: "gh",
          args: ["--version"],
          cwd: projectPath,
        });
        setGhAvailable(result.success);
      } catch {
        setGhAvailable(false);
      }
    }
    checkGh();
  }, [projectPath]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Settings Panel */}
      <div className="relative w-[720px] rounded-lg border border-border bg-[#0a0a0a] shadow-2xl animate-in zoom-in-95 duration-100">
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

        {/* Content - 3 Column Grid */}
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Column 1: Verification & Workflow */}
          <div className="flex flex-col gap-4">
            {/* Verification Section */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-secondary">
                <CheckSquare className="h-3 w-3" />
                Verification
              </h4>
              <div className="flex flex-col gap-1.5">
                <SettingToggle
                  label="Lint"
                  description="npm run lint"
                  checked={settings.runLint}
                  onChange={(v) => updateSettings({ runLint: v })}
                  disabled={isDisabled}
                />
                <SettingToggle
                  label="Tests"
                  description="npm run test"
                  checked={settings.runTests}
                  onChange={(v) => updateSettings({ runTests: v })}
                  disabled={isDisabled}
                />
                <SettingToggle
                  label="Build"
                  description="npm run build"
                  checked={settings.runBuild}
                  onChange={(v) => updateSettings({ runBuild: v })}
                  disabled={isDisabled}
                />
              </div>
            </div>

            {/* Workflow Section */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-secondary">
                <Users className="h-3 w-3" />
                Workflow
              </h4>
              <SettingToggle
                label="Human Review"
                description="Review before completion"
                checked={settings.requireHumanReview}
                onChange={(v) => updateSettings({ requireHumanReview: v })}
                disabled={isDisabled}
              />
            </div>

            {/* Git Section */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-secondary">
                <GitCommit className="h-3 w-3" />
                Git
              </h4>
              <div className="flex flex-col gap-1.5">
                <SettingToggle
                  label="Auto Commit"
                  description="Commit after each issue"
                  checked={settings.autoCommit}
                  onChange={(v) => updateSettings({ autoCommit: v })}
                  disabled={isDisabled}
                />
                <SettingToggle
                  label="Feature Branches"
                  description="Create per-epic branches"
                  icon={<GitBranch className="h-3.5 w-3.5 text-purple-400" />}
                  checked={settings.useFeatureBranches}
                  onChange={(v) => updateSettings({ useFeatureBranches: v })}
                  disabled={isDisabled}
                />
                <SettingToggle
                  label="Auto PR"
                  description={ghAvailable === false ? "gh CLI not installed" : "Create PR on completion"}
                  icon={ghAvailable === false
                    ? <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
                    : <GitPullRequest className="h-3.5 w-3.5 text-cyan-400" />
                  }
                  checked={settings.autoCreatePR}
                  onChange={(v) => updateSettings({ autoCreatePR: v })}
                  disabled={isDisabled || !settings.useFeatureBranches || ghAvailable === false}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Error Handling & Filters */}
          <div className="flex flex-col gap-4">
            {/* Error Handling */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-secondary">
                <RotateCcw className="h-3 w-3" />
                Error Handling
              </h4>
              <div className="rounded-lg border border-border bg-bg-secondary/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">Max Retries</div>
                    <div className="text-xs text-text-secondary">Before marking blocked</div>
                  </div>
                  <select
                    value={settings.maxRetries}
                    onChange={(e) => updateSettings({ maxRetries: Number(e.target.value) })}
                    disabled={isDisabled}
                    className={cn(
                      "rounded border border-border bg-bg-primary px-2 py-1 text-sm",
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
            </div>

            {/* Priority Filter */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-text-secondary">
                <Filter className="h-3 w-3" />
                Filter
              </h4>
              <div className="rounded-lg border border-border bg-bg-secondary/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">Min Priority</div>
                    <div className="text-xs text-text-secondary">Work on issues at or above</div>
                  </div>
                  <select
                    value={settings.priorityThreshold}
                    onChange={(e) => updateSettings({ priorityThreshold: Number(e.target.value) })}
                    disabled={isDisabled}
                    className={cn(
                      "rounded border border-border bg-bg-primary px-2 py-1 text-sm",
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
            </div>
          </div>

          {/* Column 3: AI Audits */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              AI Audits
            </h4>
            <div className="flex flex-col gap-1.5">
              <SettingToggle
                label="Security"
                description="OWASP vulnerability scan"
                icon={<Shield className="h-3.5 w-3.5 text-red-400" />}
                checked={settings.runSecurityAudit}
                onChange={(v) => updateSettings({ runSecurityAudit: v })}
                disabled={isDisabled}
              />
              <SettingToggle
                label="Performance"
                description="Memory leaks, anti-patterns"
                icon={<Zap className="h-3.5 w-3.5 text-yellow-400" />}
                checked={settings.runPerformanceAudit}
                onChange={(v) => updateSettings({ runPerformanceAudit: v })}
                disabled={isDisabled}
              />
              <SettingToggle
                label="Code Quality"
                description="DRY, complexity, naming"
                icon={<Code2 className="h-3.5 w-3.5 text-blue-400" />}
                checked={settings.runCodeQualityAudit}
                onChange={(v) => updateSettings({ runCodeQualityAudit: v })}
                disabled={isDisabled}
              />
              <SettingToggle
                label="Accessibility"
                description="WCAG 2.1 (UI files)"
                icon={<Accessibility className="h-3.5 w-3.5 text-green-400" />}
                checked={settings.runAccessibilityAudit}
                onChange={(v) => updateSettings({ runAccessibilityAudit: v })}
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {isDisabled && (
          <div className="border-t border-border px-4 py-2 text-center text-xs text-text-secondary">
            Settings locked while running
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function SettingToggle({ label, description, checked, onChange, disabled, icon }: SettingToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2 transition-colors hover:bg-bg-secondary",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-3.5 w-3.5 rounded border-border bg-bg-secondary accent-accent"
      />
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-sm">{label}</div>
        <div className="truncate text-xs text-text-secondary">{description}</div>
      </div>
    </label>
  );
}

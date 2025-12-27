import { X, Inbox, Loader2, FlaskConical, Eye, CheckCircle2, ArrowRight, Wrench, GitCommit } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface AutoBuildHelpPopupProps {
  onClose: () => void;
}

export function AutoBuildHelpPopup({ onClose }: AutoBuildHelpPopupProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Help Panel */}
      <div className="relative w-[520px] max-h-[80vh] rounded-lg border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between border-b border-border px-4 py-3 cursor-grab active:cursor-grabbing"
        >
          <h3 className="font-medium" data-tauri-drag-region>How Auto Build Works</h3>
          <IconButton size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Content */}
        <OverlayScrollbarsComponent
          className="max-h-[calc(80vh-60px)]"
          options={{ scrollbars: { autoHide: "scroll" } }}
        >
          <div className="flex flex-col gap-6 p-4">
            {/* Overview */}
            <div>
              <p className="text-sm text-text-secondary">
                Auto Build is an autonomous agent that works through your issue backlog,
                implementing changes, running tests, and optionally committing code.
              </p>
            </div>

            {/* Workflow Diagram */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Workflow
              </h4>
              <div className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary p-4">
                <WorkflowStep icon={<Inbox className="h-4 w-4" />} label="Backlog" color="blue" />
                <ArrowRight className="h-4 w-4 text-text-secondary" />
                <WorkflowStep icon={<Loader2 className="h-4 w-4" />} label="Doing" color="amber" />
                <ArrowRight className="h-4 w-4 text-text-secondary" />
                <WorkflowStep icon={<FlaskConical className="h-4 w-4" />} label="Testing" color="purple" />
                <ArrowRight className="h-4 w-4 text-text-secondary" />
                <WorkflowStep icon={<Eye className="h-4 w-4" />} label="Review" color="orange" />
                <ArrowRight className="h-4 w-4 text-text-secondary" />
                <WorkflowStep icon={<CheckCircle2 className="h-4 w-4" />} label="Done" color="green" />
              </div>
            </div>

            {/* Phases */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Phases Explained
              </h4>
              <div className="flex flex-col gap-2">
                <PhaseExplanation
                  icon={<Inbox className="h-4 w-4" />}
                  title="Backlog"
                  color="blue"
                  description="Queue up issues from your Beads tracker. Add issues manually or they'll be pulled automatically."
                />
                <PhaseExplanation
                  icon={<Loader2 className="h-4 w-4" />}
                  title="Doing"
                  color="amber"
                  description="Claude reads the issue, analyzes the codebase, and implements the required changes using streaming mode."
                />
                <PhaseExplanation
                  icon={<FlaskConical className="h-4 w-4" />}
                  title="Testing"
                  color="purple"
                  description="Runs lint, tests, and build. If failures occur, enters a fix loop where Claude attempts repairs."
                />
                <PhaseExplanation
                  icon={<Wrench className="h-4 w-4" />}
                  title="Fixing"
                  color="red"
                  description="When tests fail, Claude analyzes errors and attempts to fix them. Retries up to the configured max."
                />
                <PhaseExplanation
                  icon={<Eye className="h-4 w-4" />}
                  title="Human Review"
                  color="orange"
                  description="If enabled, completed work pauses for your approval. You can complete or request a refactor."
                />
                <PhaseExplanation
                  icon={<GitCommit className="h-4 w-4" />}
                  title="Commit"
                  color="cyan"
                  description="If auto-commit is enabled, changes are committed with the issue title as the message."
                />
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Requirements
              </h4>
              <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    <strong className="text-text-primary">Beads</strong> must be initialized in your project (run <code className="rounded bg-bg-secondary px-1">bd init</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    <strong className="text-text-primary">Claude CLI</strong> must be installed and authenticated
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    Project must have <code className="rounded bg-bg-secondary px-1">npm run lint</code>, <code className="rounded bg-bg-secondary px-1">test</code>, and <code className="rounded bg-bg-secondary px-1">build</code> scripts (optional but recommended)
                  </span>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Tips
              </h4>
              <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  Write clear, specific issue titles and descriptions for best results
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  Start with smaller tasks to calibrate expectations
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  Enable Human Review when first using Auto Build
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  Check the activity log for detailed progress information
                </li>
              </ul>
            </div>
          </div>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  );
}

interface WorkflowStepProps {
  icon: React.ReactNode;
  label: string;
  color: "blue" | "amber" | "purple" | "orange" | "green";
}

function WorkflowStep({ icon, label, color }: WorkflowStepProps) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    purple: "bg-purple-500/20 text-purple-400",
    orange: "bg-orange-500/20 text-orange-400",
    green: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

interface PhaseExplanationProps {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "amber" | "purple" | "red" | "orange" | "cyan" | "green";
  description: string;
}

function PhaseExplanation({ icon, title, color, description }: PhaseExplanationProps) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    purple: "bg-purple-500/20 text-purple-400",
    red: "bg-red-500/20 text-red-400",
    orange: "bg-orange-500/20 text-orange-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    green: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2">
      <div className={`shrink-0 rounded p-1.5 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-text-secondary">{description}</div>
      </div>
    </div>
  );
}

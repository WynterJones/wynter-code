import { X, Inbox, Loader2, FlaskConical, Eye, CheckCircle2, ArrowRight, Wrench, GitCommit, Users, Layers, FileCheck, Zap, Settings, AlertTriangle, FolderOpen, Search } from "lucide-react";
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

      {/* Help Panel - Made larger */}
      <div className="relative w-[700px] max-h-[85vh] rounded-lg border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between border-b border-border px-4 py-3 cursor-grab active:cursor-grabbing"
        >
          <h3 className="font-medium" data-tauri-drag-region>How Auto Build Works</h3>
          <IconButton size="sm" onClick={onClose} aria-label="Close help">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Content */}
        <OverlayScrollbarsComponent
          className="max-h-[calc(85vh-60px)]"
          options={{ scrollbars: { autoHide: "scroll" } }}
        >
          <div className="flex flex-col gap-6 p-5">
            {/* Overview */}
            <div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Auto Build is an autonomous agent that works through your issue backlog,
                implementing changes, running tests, and optionally committing code.
                It supports <strong className="text-text-primary">concurrent execution</strong> with
                multiple workers, <strong className="text-text-primary">phase-based ordering</strong> for
                dependencies, and <strong className="text-text-primary">smart test attribution</strong> to
                ignore unrelated failures.
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

            {/* Two Column Layout for Features */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Phases */}
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                  Phases Explained
                </h4>
                <div className="flex flex-col gap-2">
                  <PhaseExplanation
                    icon={<Inbox className="h-4 w-4" />}
                    title="Backlog"
                    color="blue"
                    description="Queue up issues. Use the epic button to queue all children of an epic at once."
                  />
                  <PhaseExplanation
                    icon={<Loader2 className="h-4 w-4" />}
                    title="Doing"
                    color="amber"
                    description="Claude implements changes. Progress saved to _SILO for context."
                  />
                  <PhaseExplanation
                    icon={<Eye className="h-4 w-4" />}
                    title="Self-Review"
                    color="cyan"
                    description="Claude reviews its own code for issues before testing."
                  />
                  <PhaseExplanation
                    icon={<Search className="h-4 w-4" />}
                    title="AI Audits"
                    color="orange"
                    description="Optional parallel subagent audits (security, performance, etc)."
                  />
                  <PhaseExplanation
                    icon={<FlaskConical className="h-4 w-4" />}
                    title="Testing"
                    color="purple"
                    description="Runs lint, tests, and build. Enters fix loop on failure."
                  />
                  <PhaseExplanation
                    icon={<Wrench className="h-4 w-4" />}
                    title="Fixing"
                    color="red"
                    description="Claude analyzes errors and attempts fixes up to max retries."
                  />
                  <PhaseExplanation
                    icon={<Eye className="h-4 w-4" />}
                    title="Human Review"
                    color="orange"
                    description="If enabled, work pauses for your approval before completion."
                  />
                  <PhaseExplanation
                    icon={<GitCommit className="h-4 w-4" />}
                    title="Commit"
                    color="cyan"
                    description="Auto-commits changes with issue title as the message."
                  />
                </div>
              </div>

              {/* Right Column - Features */}
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                  Key Features
                </h4>
                <div className="flex flex-col gap-2">
                  <FeatureCard
                    icon={<Users className="h-4 w-4" />}
                    title="Concurrent Workers"
                    color="accent"
                    description="Run 1-10 workers simultaneously. Each picks issues from the queue and works independently."
                  />
                  <FeatureCard
                    icon={<Zap className="h-4 w-4" />}
                    title="Phase Ordering"
                    color="purple"
                    description="Assign phases (P1-P5) to control execution order. Lower phases run first."
                  />
                  <FeatureCard
                    icon={<FileCheck className="h-4 w-4" />}
                    title="File Coordination"
                    color="green"
                    description="Automatic file locking prevents workers from overwriting each other's changes."
                  />
                  <FeatureCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title="Smart Test Attribution"
                    color="amber"
                    description="Ignores test failures unrelated to modified files. Warns but continues."
                  />
                  <FeatureCard
                    icon={<Layers className="h-4 w-4" />}
                    title="Epic Queue"
                    color="purple"
                    description="Queue all children of an epic at once with auto-assigned phases."
                  />
                  <FeatureCard
                    icon={<Settings className="h-4 w-4" />}
                    title="Configurable"
                    color="blue"
                    description="Toggle lint/tests/build, set max retries, enable/disable human review."
                  />
                </div>
              </div>
            </div>

            {/* Concurrent Mode */}
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-accent">
                <Users className="h-4 w-4" />
                Concurrent Mode Details
              </h4>
              <div className="text-sm text-text-secondary space-y-2">
                <p>
                  When running with more than 1 worker, Auto Build starts a <strong className="text-text-primary">File Coordinator</strong> server
                  that manages file locks between workers.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Each worker must acquire a lock before editing a file</li>
                  <li>If a file is locked, the worker waits 10 seconds and retries</li>
                  <li>Locks auto-release after 5 minutes (safety net)</li>
                  <li>Workers track which files they modify for test attribution</li>
                </ul>
                <p className="mt-2">
                  <strong className="text-text-primary">Worker Status Bar:</strong> When running, you'll see a status bar at the top
                  showing all active workers, their current phase, the issue they're working on, and elapsed time.
                </p>
              </div>
            </div>

            {/* SILO Context System */}
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-400">
                <FolderOpen className="h-4 w-4" />
                Context Tracking (_SILO)
              </h4>
              <div className="text-sm text-text-secondary space-y-2">
                <p>
                  Each issue's work is tracked in <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs">_SILO/ISSUE-xxx.md</code> files.
                  This provides context handoff between phases for smarter execution.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-text-primary">Auto-tracked:</strong> All modified files are recorded automatically</li>
                  <li><strong className="text-text-primary">Self-Review:</strong> Uses SILO to know exactly which files to review</li>
                  <li><strong className="text-text-primary">Fix Phase:</strong> Claude sees what was done to fix errors intelligently</li>
                  <li><strong className="text-text-primary">AI Audits:</strong> Subagents audit only the relevant modified files</li>
                </ul>
                <p className="mt-2">
                  <strong className="text-text-primary">Resume Capability:</strong> If interrupted, work can resume with full context
                  of what was previously done.
                </p>
              </div>
            </div>

            {/* AI Audits */}
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-400">
                <Search className="h-4 w-4" />
                AI Quality Audits
              </h4>
              <div className="text-sm text-text-secondary space-y-2">
                <p>
                  Optional AI-powered code audits run after implementation, using real Claude Code subagents in parallel.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-text-primary">Security Audit:</strong> OWASP vulnerabilities, injection, XSS</li>
                  <li><strong className="text-text-primary">Performance Audit:</strong> Memory leaks, N+1 queries, anti-patterns</li>
                  <li><strong className="text-text-primary">Code Quality:</strong> DRY violations, complexity, naming issues</li>
                  <li><strong className="text-text-primary">Accessibility:</strong> WCAG 2.1 compliance (UI files only)</li>
                </ul>
                <p className="mt-2">
                  Results are written to <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs">_AUDIT/*.md</code> files.
                  If issues are found, a fix session runs automatically before npm verification.
                </p>
              </div>
            </div>

            {/* Phase System */}
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-400">
                <Zap className="h-4 w-4" />
                Phase System
              </h4>
              <div className="text-sm text-text-secondary space-y-2">
                <p>
                  Phases control the order issues are picked up by workers:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-text-primary">P1</strong> issues run before <strong className="text-text-primary">P2</strong>, etc.</li>
                  <li>Issues without a phase run after all phased issues</li>
                  <li>Within the same phase, sorted by priority then creation date</li>
                  <li>Set phases in the Issues tab or auto-assign when queueing epics</li>
                </ul>
                <p className="mt-2">
                  <strong className="text-text-primary">Use Case:</strong> If issue B depends on issue A's code,
                  give A phase 1 and B phase 2 to ensure correct order.
                </p>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Requirements
              </h4>
              <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    <strong className="text-text-primary">Beads</strong> must be initialized (<code className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs">bd init</code>)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    <strong className="text-text-primary">Claude CLI</strong> must be installed and authenticated
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    Project should have <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs">npm run lint/test/build</code> scripts (configurable)
                  </span>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Tips for Best Results
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-text-secondary">
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Write clear, specific issue descriptions</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Start with 2-3 concurrent workers</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Use phases for dependent issues</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Enable Human Review initially</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Check logs for detailed progress</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>Break large features into smaller issues</span>
                </div>
              </div>
            </div>

            {/* Settings Quick Reference */}
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h4 className="mb-3 text-xs font-medium uppercase text-text-secondary">
                Settings Quick Reference
              </h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <SettingItem name="Concurrent Workers" description="1-10 parallel workers" />
                <SettingItem name="Lint/Tests/Build" description="Toggle verification steps" />
                <SettingItem name="Max Retries" description="Fix attempts before blocking" />
                <SettingItem name="Human Review" description="Require approval before done" />
                <SettingItem name="Auto Commit" description="Commit on completion" />
                <SettingItem name="Ignore Unrelated" description="Skip unrelated test failures" />
              </div>
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
    <div className="flex items-start gap-2 rounded-lg border border-border bg-bg-secondary px-2.5 py-2">
      <div className={`shrink-0 rounded p-1 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium">{title}</div>
        <div className="text-xs text-text-secondary leading-snug">{description}</div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  color: "accent" | "purple" | "green" | "amber" | "blue";
  description: string;
}

function FeatureCard({ icon, title, color, description }: FeatureCardProps) {
  const colorClasses = {
    accent: "bg-accent/20 text-accent",
    purple: "bg-purple-500/20 text-purple-400",
    green: "bg-green-500/20 text-green-400",
    amber: "bg-amber-500/20 text-amber-400",
    blue: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-bg-secondary px-2.5 py-2">
      <div className={`shrink-0 rounded p-1 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium">{title}</div>
        <div className="text-xs text-text-secondary leading-snug">{description}</div>
      </div>
    </div>
  );
}

function SettingItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-text-primary font-medium text-xs">{name}</span>
      <span className="text-text-secondary text-xs">{description}</span>
    </div>
  );
}

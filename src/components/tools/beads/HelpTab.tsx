import { ExternalLink } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { open } from "@tauri-apps/plugin-shell";

export function HelpTab() {
  const handleOpenLink = (url: string) => {
    open(url);
  };

  return (
    <OverlayScrollbarsComponent
      className="h-full os-theme-custom"
      options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
    >
      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            What is Beads?
          </h1>
          <p className="text-text-secondary">
            Beads is a distributed, git-backed graph issue tracker designed for AI
            agents. It replaces traditional markdown task lists with a
            dependency-aware graph structure, enabling agents to maintain context
            across long-horizon development tasks.
          </p>
        </div>

        {/* Key Features */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Key Features
          </h2>
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>
                <strong className="text-text-primary">Git-backed storage</strong> -
                Issues stored as JSONL files in .beads/ directory
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>
                <strong className="text-text-primary">Dependency tracking</strong> -
                Issues can block other issues, forming a graph
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>
                <strong className="text-text-primary">Epic support</strong> - Group
                related tasks under parent epics
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>
                <strong className="text-text-primary">AI-optimized</strong> -
                Designed for AI agents to track work across sessions
              </span>
            </li>
          </ul>
        </div>

        {/* CLI Commands */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Common CLI Commands
          </h2>
          <div className="space-y-3">
            <CommandRow
              command="bd init"
              description="Initialize beads in the current directory"
            />
            <CommandRow
              command="bd create 'Title' -t task -p 2"
              description="Create a new issue (type: task/feature/bug/epic, priority: 0-4)"
            />
            <CommandRow
              command="bd list"
              description="List open issues"
            />
            <CommandRow
              command="bd list --status closed"
              description="List closed issues"
            />
            <CommandRow
              command="bd show <id>"
              description="Show issue details"
            />
            <CommandRow
              command="bd update <id> --status in_progress"
              description="Update issue status"
            />
            <CommandRow
              command="bd close <id> --reason 'Done'"
              description="Close an issue with a reason"
            />
            <CommandRow
              command="bd ready"
              description="Show issues ready to work on (no blockers)"
            />
            <CommandRow
              command="bd status"
              description="Show database overview and statistics"
            />
            <CommandRow
              command="bd epic"
              description="Epic management commands"
            />
            <CommandRow
              command="bd dep add <child> <parent>"
              description="Add dependency between issues"
            />
          </div>
        </div>

        {/* Issue Types */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Issue Types
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <TypeCard
              type="Task"
              color="bg-blue-500/20 text-blue-400 border-blue-500/30"
              description="General work items"
            />
            <TypeCard
              type="Feature"
              color="bg-green-500/20 text-green-400 border-green-500/30"
              description="New functionality"
            />
            <TypeCard
              type="Bug"
              color="bg-red-500/20 text-red-400 border-red-500/30"
              description="Something broken"
            />
            <TypeCard
              type="Epic"
              color="bg-purple-500/20 text-purple-400 border-purple-500/30"
              description="Parent container for related issues"
            />
          </div>
        </div>

        {/* Priority Levels */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Priority Levels
          </h2>
          <div className="space-y-2">
            <PriorityRow level={0} name="Critical" color="text-red-400" />
            <PriorityRow level={1} name="High" color="text-orange-400" />
            <PriorityRow level={2} name="Medium" color="text-yellow-400" />
            <PriorityRow level={3} name="Low" color="text-blue-400" />
            <PriorityRow level={4} name="Trivial" color="text-neutral-400" />
          </div>
        </div>

        {/* Links */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Resources
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleOpenLink("https://github.com/steveyegge/beads")}
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Beads GitHub Repository
            </button>
            <button
              onClick={() => handleOpenLink("https://github.com/mantoni/beads-ui")}
              className="flex items-center gap-2 text-accent hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Beads UI (Web Interface)
            </button>
          </div>
        </div>
      </div>
    </OverlayScrollbarsComponent>
  );
}

function CommandRow({
  command,
  description,
}: {
  command: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <code className="flex-shrink-0 px-2 py-1 bg-bg-tertiary rounded text-xs text-accent font-mono">
        {command}
      </code>
      <span className="text-sm text-text-secondary">{description}</span>
    </div>
  );
}

function TypeCard({
  type,
  color,
  description,
}: {
  type: string;
  color: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-tertiary/30">
      <span className={`px-2 py-0.5 text-xs rounded border ${color}`}>{type}</span>
      <span className="text-sm text-text-secondary">{description}</span>
    </div>
  );
}

function PriorityRow({
  level,
  name,
  color,
}: {
  level: number;
  name: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-xs text-text-secondary font-mono">
        {level}
      </span>
      <span className={`text-sm ${color}`}>{name}</span>
    </div>
  );
}

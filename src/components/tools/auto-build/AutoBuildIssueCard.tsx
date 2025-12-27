import { useState, useEffect, useMemo } from "react";
import { X, GripVertical, Bug, Sparkles, CheckSquare, Zap, Check, RefreshCw } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { cn } from "@/lib/utils";
import type { BeadsIssue, BeadsIssueType } from "@/types/beads";
import { PRIORITY_COLORS } from "@/types/beads";

// Catpuccin Mocha palette colors for the orb
const CATPUCCIN_COLORS = [
  "#f5c2e7", // Pink
  "#cba6f7", // Mauve
  "#f38ba8", // Red
  "#fab387", // Peach
  "#f9e2af", // Yellow
  "#a6e3a1", // Green
  "#94e2d5", // Teal
  "#89dceb", // Sky
  "#74c7ec", // Sapphire
  "#89b4fa", // Blue
  "#b4befe", // Lavender
];

interface AutoBuildIssueCardProps {
  issue: BeadsIssue;
  isActive: boolean;
  columnId: string;
}

const TYPE_ICONS: Record<BeadsIssueType, React.ReactNode> = {
  task: <CheckSquare className="h-3 w-3" />,
  feature: <Sparkles className="h-3 w-3" />,
  bug: <Bug className="h-3 w-3" />,
  epic: <Sparkles className="h-3 w-3" />,
};

const TYPE_COLORS: Record<BeadsIssueType, string> = {
  task: "bg-blue-500/20 text-blue-400",
  feature: "bg-green-500/20 text-green-400",
  bug: "bg-red-500/20 text-red-400",
  epic: "bg-purple-500/20 text-purple-400",
};

function formatElapsed(startTime: number): string {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

export function AutoBuildIssueCard({ issue, isActive, columnId }: AutoBuildIssueCardProps) {
  const { removeFromQueue, progress, currentPhase, streamingState, completeReview, requestRefactor } =
    useAutoBuildStore();
  const [showRefactorInput, setShowRefactorInput] = useState(false);
  const [refactorReason, setRefactorReason] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [colorIndex, setColorIndex] = useState(0);

  // Random starting index for color cycling (stable per issue)
  const startingIndex = useMemo(
    () => Math.floor(Math.random() * CATPUCCIN_COLORS.length),
    []
  );

  // Slow color cycling effect for active orb
  useEffect(() => {
    if (!isActive) return;
    setColorIndex(startingIndex);
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % CATPUCCIN_COLORS.length);
    }, 2000); // Change color every 2 seconds
    return () => clearInterval(interval);
  }, [isActive, startingIndex]);

  const currentColor = CATPUCCIN_COLORS[colorIndex];
  const nextColor = CATPUCCIN_COLORS[(colorIndex + 1) % CATPUCCIN_COLORS.length];

  const canRemove = columnId === "backlog";
  const isReview = columnId === "review";
  const showProgress = isActive && (columnId === "doing" || columnId === "testing");
  const showStreamingStatus = isActive && streamingState?.isStreaming;

  // Update elapsed time every second when streaming
  useEffect(() => {
    if (!streamingState?.isStreaming) return;

    const interval = setInterval(() => {
      setElapsedTime(formatElapsed(streamingState.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [streamingState?.isStreaming, streamingState?.startTime]);

  const handleRefactorSubmit = () => {
    if (refactorReason.trim()) {
      requestRefactor(issue.id, refactorReason.trim());
      setShowRefactorInput(false);
      setRefactorReason("");
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-bg-primary p-3 transition-all",
        isActive
          ? "border-accent shadow-md shadow-accent/10"
          : isReview
            ? "border-orange-500/50"
            : "border-border hover:border-text-secondary"
      )}
    >
      {/* Drag handle for backlog */}
      {columnId === "backlog" && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-50">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Remove button for backlog */}
      {canRemove && (
        <button
          onClick={() => removeFromQueue(issue.id)}
          className="absolute -right-1 -top-1 hidden rounded-full bg-bg-secondary p-0.5 text-text-secondary transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:block"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Type badge */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-xs", TYPE_COLORS[issue.issue_type])}
        >
          {TYPE_ICONS[issue.issue_type]}
          {issue.issue_type}
        </span>
        <span className={cn("text-xs", PRIORITY_COLORS[issue.priority])}>P{issue.priority}</span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-medium">{issue.title}</h3>

      {/* Issue ID */}
      <div className="mt-2 text-xs text-text-secondary">{issue.id}</div>

      {/* Streaming Status Line with gradient animation */}
      {showStreamingStatus && (
        <div className="mt-3 flex items-center gap-2 overflow-hidden">
          <span className="streaming-gradient-icon">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <span className="streaming-gradient-text truncate text-xs font-medium">
            {streamingState.currentAction || "Working"}
          </span>
          <span className="streaming-gradient-dots text-xs">...</span>
          <span className="ml-auto shrink-0 font-mono text-xs text-text-secondary">{elapsedTime}</span>
        </div>
      )}

      {/* Progress bar for active issues (when not streaming) */}
      {showProgress && !showStreamingStatus && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
            <span>
              {currentPhase === "working" && "Working..."}
              {currentPhase === "testing" && "Testing..."}
              {currentPhase === "fixing" && "Fixing..."}
              {currentPhase === "committing" && "Committing..."}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                currentPhase === "committing" ? "bg-green-500" : currentPhase === "fixing" ? "bg-amber-500" : "bg-accent"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Review Actions */}
      {isReview && !showRefactorInput && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => completeReview(issue.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-green-500/20 px-2 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/30"
          >
            <Check className="h-3 w-3" />
            Complete
          </button>
          <button
            onClick={() => setShowRefactorInput(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500/20 px-2 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
          >
            <RefreshCw className="h-3 w-3" />
            Refactor
          </button>
        </div>
      )}

      {/* Refactor Input */}
      {isReview && showRefactorInput && (
        <div className="mt-3 space-y-2">
          <textarea
            value={refactorReason}
            onChange={(e) => setRefactorReason(e.target.value)}
            placeholder="What needs to be refactored?"
            className="w-full rounded border border-border bg-bg-secondary px-2 py-1.5 text-xs placeholder:text-text-secondary focus:border-accent focus:outline-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleRefactorSubmit}
              disabled={!refactorReason.trim()}
              className="flex-1 rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setShowRefactorInput(false);
                setRefactorReason("");
              }}
              className="flex-1 rounded bg-bg-secondary px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active indicator - 3D sphere with Catpuccin color cycling */}
      {isActive && (
        <div className="absolute right-[10px] top-[10px] h-4 w-4">
          {/* Pulsing glow ring - same color as orb */}
          <span
            className="absolute inset-[-4px] animate-[pulse_2s_ease-in-out_infinite] rounded-full blur-md transition-colors duration-[2000ms]"
            style={{
              background: `radial-gradient(circle, ${currentColor}60 0%, ${currentColor}20 50%, transparent 70%)`,
            }}
          />
          {/* Expanding pulse ring */}
          <span
            className="absolute inset-[-2px] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full transition-colors duration-[2000ms]"
            style={{
              background: `${currentColor}40`,
            }}
          />
          {/* Shimmering border ring */}
          <span
            className="absolute inset-[-1px] rounded-full animate-shimmer-rotate transition-colors duration-[2000ms]"
            style={{
              background: `conic-gradient(from 0deg, ${currentColor}, ${nextColor}, ${currentColor}, ${nextColor}, ${currentColor})`,
            }}
          />
          {/* Dark drop shadow base */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)",
            }}
          />
          {/* 3D Sphere core with color transition */}
          <span
            className="absolute inset-[1px] rounded-full transition-all duration-[2000ms]"
            style={{
              background: `
                radial-gradient(circle at 30% 30%,
                  ${nextColor} 0%,
                  ${currentColor} 40%,
                  color-mix(in srgb, ${currentColor} 60%, black) 80%,
                  color-mix(in srgb, ${currentColor} 30%, black) 100%)
              `,
              boxShadow: `
                0 3px 8px rgba(0, 0, 0, 0.5),
                0 1px 3px rgba(0, 0, 0, 0.3),
                inset 0 -2px 4px rgba(0, 0, 0, 0.3),
                inset 0 2px 4px rgba(255, 255, 255, 0.15)
              `,
            }}
          />
          {/* Highlight reflection */}
          <span
            className="absolute left-[4px] top-[4px] h-1 w-1 rounded-full opacity-70"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

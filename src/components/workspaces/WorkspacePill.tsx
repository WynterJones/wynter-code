import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types/workspace";
import { WorkspaceAvatar } from "./WorkspaceAvatar";

interface WorkspacePillProps {
  workspace: Workspace | null;
  isOpen?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export const WorkspacePill = forwardRef<HTMLButtonElement, WorkspacePillProps>(
  ({ workspace, isOpen, onClick, compact }, ref) => {
    if (!workspace) {
      return (
        <button
          ref={ref}
          onClick={onClick}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full",
            "bg-bg-tertiary hover:bg-bg-hover border border-border",
            "text-text-secondary hover:text-text-primary",
            "transition-colors text-xs"
          )}
        >
          <span>No Workspace</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </button>
      );
    }

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 rounded-full",
          "bg-bg-tertiary hover:bg-bg-hover border border-border",
          "transition-colors group",
          compact ? "px-1.5 py-0.5" : "px-2 py-1"
        )}
      >
        <WorkspaceAvatar
          avatar={workspace.avatar}
          color={workspace.color}
          size="sm"
        />
        {!compact && (
          <>
            <span className="text-xs text-text-primary max-w-24 truncate">
              {workspace.name}
            </span>
            <ChevronDown
              className={cn(
                "w-3 h-3 text-text-secondary group-hover:text-text-primary transition-all",
                isOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>
    );
  }
);

WorkspacePill.displayName = "WorkspacePill";

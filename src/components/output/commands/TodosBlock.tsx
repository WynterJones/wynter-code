import { CheckCircle2, Circle, Loader2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodosResponse, TodoItem } from "@/types/slashCommandResponse";

interface TodosBlockProps {
  data: TodosResponse;
}

function getStatusIcon(status: TodoItem["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case "in_progress":
      return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    case "pending":
    default:
      return <Circle className="w-4 h-4 text-text-secondary" />;
  }
}

function getStatusColor(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return "text-text-secondary line-through";
    case "in_progress":
      return "text-accent";
    case "pending":
    default:
      return "text-text-primary";
  }
}

export function TodosBlock({ data }: TodosBlockProps) {
  const { todos, completedCount, totalCount } = data;

  // Group todos by status
  const inProgress = todos.filter((t) => t.status === "in_progress");
  const pending = todos.filter((t) => t.status === "pending");
  const completed = todos.filter((t) => t.status === "completed");

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-primary">
              {completedCount} of {totalCount} completed
            </span>
            <span className="text-xs text-text-secondary">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Todo list */}
      <div className="space-y-3">
        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-secondary mb-1.5">In Progress</div>
            {inProgress.map((todo, index) => (
              <div
                key={`in_progress-${index}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded bg-accent/5 border border-accent/20"
              >
                {getStatusIcon(todo.status)}
                <span className={cn("text-sm flex-1", getStatusColor(todo.status))}>
                  {todo.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-secondary mb-1.5">Pending</div>
            {pending.map((todo, index) => (
              <div
                key={`pending-${index}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded bg-bg-hover/50"
              >
                {getStatusIcon(todo.status)}
                <span className={cn("text-sm flex-1", getStatusColor(todo.status))}>
                  {todo.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-secondary mb-1.5">
              Completed ({completed.length})
            </div>
            {completed.slice(0, 5).map((todo, index) => (
              <div
                key={`completed-${index}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded bg-bg-hover/30"
              >
                {getStatusIcon(todo.status)}
                <span className={cn("text-sm flex-1", getStatusColor(todo.status))}>
                  {todo.content}
                </span>
              </div>
            ))}
            {completed.length > 5 && (
              <div className="text-xs text-text-secondary text-center py-1">
                +{completed.length - 5} more completed
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="text-center py-6 text-text-secondary">
            <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No todos found</p>
          </div>
        )}
      </div>
    </div>
  );
}

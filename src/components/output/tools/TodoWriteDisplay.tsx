import { useMemo } from "react";
import { ListTodo, Circle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
}

interface TodoWriteDisplayProps {
  input: {
    todos?: TodoItem[];
  };
  output?: string;
}

function getStatusIcon(status: TodoItem["status"]) {
  switch (status) {
    case "pending":
      return <Circle className="w-3 h-3 text-text-secondary/50" />;
    case "in_progress":
      return <Loader2 className="w-3 h-3 text-accent-blue animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-accent-green" />;
    default:
      return <Circle className="w-3 h-3 text-text-secondary/50" />;
  }
}

function getStatusColor(status: TodoItem["status"]) {
  switch (status) {
    case "pending":
      return "text-text-secondary/70";
    case "in_progress":
      return "text-accent-blue";
    case "completed":
      return "text-text-secondary/50 line-through";
    default:
      return "text-text-secondary/70";
  }
}

export function TodoWriteDisplay({ input }: TodoWriteDisplayProps) {
  const todos = input.todos || [];

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.status === "completed").length;
    const inProgress = todos.filter((t) => t.status === "in_progress").length;
    const pending = todos.filter((t) => t.status === "pending").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, progress };
  }, [todos]);

  if (todos.length === 0) {
    return (
      <div className="rounded-lg bg-bg-tertiary border border-border p-3 text-center">
        <span className="text-[10px] text-text-secondary">No todos</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with stats */}
      <div className="rounded-lg bg-bg-tertiary border border-border overflow-hidden">
        <div className="px-2 py-1.5 bg-bg-hover border-b border-border flex items-center gap-2">
          <ListTodo className="w-3 h-3 text-accent-cyan" />
          <span className="text-[10px] text-text-secondary font-medium">Todo List</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] text-text-secondary/60">
              {stats.completed}/{stats.total}
            </span>
            <span
              className={cn(
                "text-[9px] font-medium",
                stats.progress === 100 ? "text-accent-green" : "text-accent-cyan"
              )}
            >
              {stats.progress}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-secondary">
          <div
            className={cn(
              "h-full transition-all duration-300",
              stats.progress === 100 ? "bg-accent-green" : "bg-accent-cyan"
            )}
            style={{ width: `${stats.progress}%` }}
          />
        </div>

        {/* Todo items */}
        <div className="divide-y divide-border/50">
          {todos.map((todo, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5",
                todo.status === "in_progress" && "bg-accent-blue/5"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{getStatusIcon(todo.status)}</div>
              <div className="flex-1 min-w-0">
                <span className={cn("text-[10px] font-mono", getStatusColor(todo.status))}>
                  {todo.status === "in_progress" && todo.activeForm
                    ? todo.activeForm
                    : todo.content}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

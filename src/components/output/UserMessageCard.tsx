import { cn } from "@/lib/utils";

interface UserMessageCardProps {
  content: string;
  isBackground?: boolean;
}

export function UserMessageCard({ content, isBackground = false }: UserMessageCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 transition-all duration-200",
        isBackground
          ? "bg-bg-hover/50 border border-border/30 opacity-60 hover:opacity-100"
          : "bg-bg-hover border border-border"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-accent font-mono text-sm">$</span>
        <span className="text-xs text-text-secondary">You</span>
      </div>
      <p className="text-sm text-text-primary font-mono whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}

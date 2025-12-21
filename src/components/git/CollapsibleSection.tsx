import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  count?: number;
  badge?: { text: string; variant: BadgeProps["variant"] };
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  iconColor = "text-text-secondary",
  count,
  badge,
  defaultOpen = true,
  actions,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg bg-bg-secondary border border-border overflow-hidden", className)}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-hover transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="w-4 h-4 flex items-center justify-center text-text-secondary">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <Icon className={cn("w-4 h-4", iconColor)} />
        <span className="text-xs font-medium text-text-primary flex-1">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 text-text-secondary">({count})</span>
          )}
        </span>
        {badge && (
          <Badge variant={badge.variant} className="ml-auto">
            {badge.text}
          </Badge>
        )}
        {actions && (
          <div
            className="flex items-center gap-1 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      {isOpen && <div className="border-t border-border py-2">{children}</div>}
    </div>
  );
}

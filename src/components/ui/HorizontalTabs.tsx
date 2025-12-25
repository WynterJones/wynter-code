import { createContext, useContext, useState, ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalTabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const HorizontalTabsContext = createContext<HorizontalTabsContextValue | null>(null);

function useHorizontalTabsContext() {
  const context = useContext(HorizontalTabsContext);
  if (!context) {
    throw new Error("HorizontalTabs components must be used within a HorizontalTabs provider");
  }
  return context;
}

export interface HorizontalTabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function HorizontalTabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: HorizontalTabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <HorizontalTabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </HorizontalTabsContext.Provider>
  );
}

export interface HorizontalTabsListProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalTabsList({ children, className }: HorizontalTabsListProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 bg-bg-secondary rounded-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface HorizontalTabsTriggerProps {
  value: string;
  children?: ReactNode;
  icon?: LucideIcon;
  label?: string;
  className?: string;
}

export function HorizontalTabsTrigger({
  value,
  children,
  icon: Icon,
  label,
  className,
}: HorizontalTabsTriggerProps) {
  const { activeTab, setActiveTab } = useHorizontalTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
        isActive
          ? "bg-bg-hover text-text-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50",
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label || children}
    </button>
  );
}

export interface HorizontalTabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function HorizontalTabsContent({ value, children, className }: HorizontalTabsContentProps) {
  const { activeTab } = useHorizontalTabsContext();

  if (activeTab !== value) {
    return null;
  }

  return <div className={cn("flex-1 overflow-hidden", className)}>{children}</div>;
}

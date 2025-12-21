import { useState, useRef, useEffect } from "react";
import { CreditCard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { SubscriptionDropdown } from "./SubscriptionDropdown";

interface SubscriptionButtonProps {
  onOpenManage: () => void;
}

export function SubscriptionButton({ onOpenManage }: SubscriptionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { calculateSummary, subscriptions } = useSubscriptionStore();

  const summary = calculateSummary();
  const hasSubscriptions = subscriptions.length > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 h-8 rounded-md text-sm",
          "bg-bg-tertiary border border-border hover:bg-bg-hover transition-colors"
        )}
      >
        <CreditCard className="w-3.5 h-3.5 text-accent-green" />
        {hasSubscriptions && summary.totalMonthly > 0 && (
          <span className="text-text-primary font-mono text-xs">
            {formatCurrency(summary.totalMonthly)}/mo
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {isOpen && (
        <SubscriptionDropdown
          onClose={() => setIsOpen(false)}
          onOpenManage={() => {
            setIsOpen(false);
            onOpenManage();
          }}
        />
      )}
    </div>
  );
}

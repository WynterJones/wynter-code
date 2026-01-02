import { HTMLAttributes, forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps extends HTMLAttributes<HTMLDivElement> {
  /** Error message to display */
  message: string;
  /** Whether to show the AlertCircle icon (default: true) */
  showIcon?: boolean;
}

/**
 * Standardized error banner component for displaying error messages.
 * Replaces the repeated pattern of `bg-red-500/10 border border-red-500/20 rounded-lg text-red-400`
 */
export const ErrorBanner = forwardRef<HTMLDivElement, ErrorBannerProps>(
  ({ className, message, showIcon = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-red-500/10 border border-red-500/20 text-red-400",
          "text-sm",
          className
        )}
        role="alert"
        {...props}
      >
        {showIcon && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        <span>{message}</span>
      </div>
    );
  }
);

ErrorBanner.displayName = "ErrorBanner";

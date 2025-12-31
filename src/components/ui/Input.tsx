import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 py-1",
          "text-sm text-text-primary placeholder:text-text-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "font-mono",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

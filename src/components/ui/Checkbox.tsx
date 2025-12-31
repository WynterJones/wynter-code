import { InputHTMLAttributes, forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, defaultChecked, onChange, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    // Track internal state for uncontrolled usage
    const [isChecked, setIsChecked] = useState(defaultChecked ?? false);

    // Sync with controlled checked prop
    useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsChecked(e.target.checked);
      }
      onChange?.(e);
    };

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer select-none",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "w-4 h-4 rounded border bg-bg-tertiary",
              "flex items-center justify-center",
              "transition-all duration-150",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50",
              isChecked
                ? "border-accent"
                : "border-border hover:border-text-secondary"
            )}
          >
            {/* Rounded square pip */}
            <div
              className={cn(
                "w-2 h-2 rounded-sm bg-accent transition-all duration-150",
                isChecked ? "opacity-100 scale-100" : "opacity-0 scale-0"
              )}
            />
          </div>
        </div>
        {label && (
          <span className="text-sm text-text-secondary">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

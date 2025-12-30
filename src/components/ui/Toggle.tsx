import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> {
  label?: string;
  labelPosition?: "left" | "right";
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      className,
      label,
      labelPosition = "left",
      checked,
      onChange,
      disabled,
      size = "md",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        track: "w-8 h-4",
        thumb: "w-3 h-3",
        thumbTranslate: checked ? "left-4" : "left-0.5",
      },
      md: {
        track: "w-10 h-5",
        thumb: "w-4 h-4",
        thumbTranslate: checked ? "left-5" : "left-0.5",
      },
    };

    const sizes = sizeClasses[size];

    const toggle = (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative rounded-full transition-colors duration-200",
          sizes.track,
          checked ? "bg-accent" : "bg-neutral-600",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 bg-white rounded-full transition-all duration-200 shadow-sm",
            sizes.thumb,
            sizes.thumbTranslate
          )}
        />
      </button>
    );

    if (!label) {
      return (
        <div className={className}>
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          {toggle}
        </div>
      );
    }

    return (
      <label
        className={cn(
          "inline-flex items-center gap-3",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        {labelPosition === "left" && (
          <span
            className={cn(
              "text-xs text-text-tertiary select-none",
              disabled && "opacity-50"
            )}
          >
            {label}
          </span>
        )}
        {toggle}
        {labelPosition === "right" && (
          <span
            className={cn(
              "text-xs text-text-tertiary select-none",
              disabled && "opacity-50"
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  }
);

Toggle.displayName = "Toggle";

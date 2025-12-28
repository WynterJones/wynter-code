import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  onChange: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      label,
      value,
      min = 0,
      max = 100,
      step = 1,
      unit = "",
      showValue = true,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("space-y-1.5", className)}>
        {(label || showValue) && (
          <div className="flex justify-between items-center">
            {label && (
              <label className="text-xs text-text-tertiary">{label}</label>
            )}
            {showValue && (
              <span className="text-xs text-text-tertiary tabular-nums">
                {value}
                {unit}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={cn(
              "w-full h-1.5 rounded-full appearance-none cursor-pointer",
              "bg-bg-tertiary",
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:w-3.5",
              "[&::-webkit-slider-thumb]:h-3.5",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-accent",
              "[&::-webkit-slider-thumb]:shadow-sm",
              "[&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-webkit-slider-thumb]:transition-transform",
              "[&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-webkit-slider-thumb]:active:scale-95",
              "[&::-moz-range-thumb]:w-3.5",
              "[&::-moz-range-thumb]:h-3.5",
              "[&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:bg-accent",
              "[&::-moz-range-thumb]:border-0",
              "[&::-moz-range-thumb]:cursor-pointer",
              "focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-accent/50",
              disabled && "opacity-50 cursor-not-allowed",
              disabled && "[&::-webkit-slider-thumb]:cursor-not-allowed",
              disabled && "[&::-moz-range-thumb]:cursor-not-allowed"
            )}
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percentage}%, var(--color-bg-tertiary) ${percentage}%, var(--color-bg-tertiary) 100%)`,
            }}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";

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
        <div className="relative h-2">
          {/* Track background */}
          <div className="absolute inset-0 rounded-full bg-neutral-500" />
          {/* Filled track */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-accent"
            style={{ width: `${percentage}%` }}
          />
          {/* Input */}
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
              "absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent",
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:w-4",
              "[&::-webkit-slider-thumb]:h-4",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-accent",
              "[&::-webkit-slider-thumb]:shadow-md",
              "[&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-webkit-slider-thumb]:transition-transform",
              "[&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-webkit-slider-thumb]:active:scale-95",
              "[&::-moz-range-thumb]:w-4",
              "[&::-moz-range-thumb]:h-4",
              "[&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:bg-accent",
              "[&::-moz-range-thumb]:border-0",
              "[&::-moz-range-thumb]:cursor-pointer",
              "[&::-webkit-slider-runnable-track]:bg-transparent",
              "[&::-moz-range-track]:bg-transparent",
              "focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-accent/50",
              disabled && "opacity-50 cursor-not-allowed",
              disabled && "[&::-webkit-slider-thumb]:cursor-not-allowed",
              disabled && "[&::-moz-range-thumb]:cursor-not-allowed"
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";

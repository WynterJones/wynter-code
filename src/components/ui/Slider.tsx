import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  showMinMax?: boolean;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      label,
      description,
      value,
      min = 0,
      max = 100,
      step = 1,
      unit = "",
      showValue = true,
      showMinMax = false,
      minLabel,
      maxLabel,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("space-y-2", className)}>
        {(label || showValue) && (
          <div className="flex justify-between items-center">
            <div>
              {label && (
                <label className="text-sm font-medium text-text-primary">
                  {label}
                </label>
              )}
              {description && (
                <p className="text-xs text-text-secondary">{description}</p>
              )}
            </div>
            {showValue && (
              <span className="text-sm text-text-primary font-mono tabular-nums">
                {value}
                {unit}
              </span>
            )}
          </div>
        )}
        <div className="relative h-2.5">
          {/* Track background - Catppuccin surface0 */}
          <div className="absolute inset-0 rounded-full bg-[#45475a]" />
          {/* Filled track - Catppuccin mauve/lavender */}
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-all",
              "bg-[#cba6f7]",
              disabled && "opacity-50"
            )}
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
              // WebKit thumb - white oval like the screenshot
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:w-5",
              "[&::-webkit-slider-thumb]:h-5",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-white",
              "[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.3)]",
              "[&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-webkit-slider-thumb]:transition-all",
              "[&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-webkit-slider-thumb]:hover:shadow-[0_2px_10px_rgba(203,166,247,0.4)]",
              "[&::-webkit-slider-thumb]:active:scale-95",
              // Firefox thumb
              "[&::-moz-range-thumb]:w-5",
              "[&::-moz-range-thumb]:h-5",
              "[&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:bg-white",
              "[&::-moz-range-thumb]:border-0",
              "[&::-moz-range-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.3)]",
              "[&::-moz-range-thumb]:cursor-pointer",
              // Track styling
              "[&::-webkit-slider-runnable-track]:bg-transparent",
              "[&::-moz-range-track]:bg-transparent",
              // Focus states
              "focus:outline-none",
              "focus-visible:[&::-webkit-slider-thumb]:ring-2",
              "focus-visible:[&::-webkit-slider-thumb]:ring-[#cba6f7]/50",
              // Disabled states
              disabled && "opacity-50 cursor-not-allowed",
              disabled && "[&::-webkit-slider-thumb]:cursor-not-allowed",
              disabled && "[&::-moz-range-thumb]:cursor-not-allowed"
            )}
            {...props}
          />
        </div>
        {showMinMax && (
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{minLabel || `${min}${unit}`}</span>
            <span>{maxLabel || `${max}${unit}`}</span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";

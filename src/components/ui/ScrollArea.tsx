import { HTMLAttributes, forwardRef } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import "overlayscrollbars/overlayscrollbars.css";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Scrollbar visibility: 'auto' hides when not scrolling, 'visible' always shows, 'hidden' never shows */
  scrollbarVisibility?: "auto" | "visible" | "hidden";
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, scrollbarVisibility = "auto", ...props }, ref) => {
    return (
      <OverlayScrollbarsComponent
        ref={ref as any}
        className={cn("os-theme-custom", className)}
        options={{
          scrollbars: {
            theme: "os-theme-custom",
            visibility: scrollbarVisibility === "hidden" ? "hidden" : "auto",
            autoHide: scrollbarVisibility === "auto" ? "leave" : "never",
            autoHideDelay: 400,
          },
          overflow: {
            x: "scroll",
            y: "scroll",
          },
        }}
        defer
        {...props}
      >
        {children}
      </OverlayScrollbarsComponent>
    );
  }
);

ScrollArea.displayName = "ScrollArea";

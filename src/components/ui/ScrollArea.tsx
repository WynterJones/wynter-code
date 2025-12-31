import { HTMLAttributes, forwardRef } from "react";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_AUTO_HIDE_DELAY } from "@/lib/constants";
import "overlayscrollbars/overlayscrollbars.css";

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Scrollbar visibility: 'auto' hides when not scrolling, 'visible' always shows, 'hidden' never shows */
  scrollbarVisibility?: "auto" | "visible" | "hidden";
}

export const ScrollArea = forwardRef<OverlayScrollbarsComponentRef, ScrollAreaProps>(
  ({ className, children, scrollbarVisibility = "auto", ...props }, ref) => {
    return (
      <OverlayScrollbarsComponent
        ref={ref}
        className={cn("os-theme-custom", className)}
        options={{
          scrollbars: {
            theme: "os-theme-custom",
            visibility: scrollbarVisibility === "hidden" ? "hidden" : "auto",
            autoHide: scrollbarVisibility === "auto" ? "leave" : "never",
            autoHideDelay: SCROLLBAR_AUTO_HIDE_DELAY,
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

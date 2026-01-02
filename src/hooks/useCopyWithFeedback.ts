import { useState, useCallback, useRef } from "react";
import { COPY_FEEDBACK_TIMEOUT } from "@/lib/constants";

/**
 * Hook for clipboard copy operations with visual feedback.
 * Handles the common pattern of copying text and showing a temporary "copied" state.
 *
 * @param timeout - Duration in ms to show feedback (default: COPY_FEEDBACK_TIMEOUT)
 * @returns Object with copy function and state helpers
 *
 * @example Simple usage (boolean state):
 * ```tsx
 * const { copied, copy } = useCopyWithFeedback();
 * <button onClick={() => copy(text)}>
 *   {copied ? <Check /> : <Copy />}
 * </button>
 * ```
 *
 * @example Multiple items (key-based state):
 * ```tsx
 * const { copied, copy, isCopied } = useCopyWithFeedback();
 * {items.map(item => (
 *   <button onClick={() => copy(item.value, item.id)}>
 *     {isCopied(item.id) ? <Check /> : <Copy />}
 *   </button>
 * ))}
 * ```
 */
export function useCopyWithFeedback(timeout = COPY_FEEDBACK_TIMEOUT) {
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, id?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(id ?? text);

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setCopied(null);
          timeoutRef.current = null;
        }, timeout);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    },
    [timeout]
  );

  const isCopied = useCallback((id: string) => copied === id, [copied]);

  return {
    /** The currently copied item's ID, or the text itself if no ID was provided */
    copied,
    /** Copy text to clipboard with optional ID for multi-item scenarios */
    copy,
    /** Check if a specific ID was just copied (for multi-item scenarios) */
    isCopied,
  };
}

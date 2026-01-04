import { memo, useMemo } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CompactActivityItem } from "./ActivityFeed";
import type { ToolCall } from "@/types";

interface InterspersedResponseProps {
  content: string;
  toolCalls: ToolCall[];
  toolPositions: Map<string, number>;
  isStreaming?: boolean;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

interface ContentBlock {
  type: "text" | "tool";
  content?: string;
  toolCall?: ToolCall;
}

/**
 * Renders response content with tool calls interspersed at their original positions.
 * When a tool was called during streaming, its position in the text is recorded.
 * This component splits the text at those positions and renders tool cards inline.
 *
 * During streaming: Shows only tool cards (text is batched until complete)
 * After streaming: Shows full content with tools interspersed at their positions
 */
export const InterspersedResponse = memo(function InterspersedResponse({
  content,
  toolCalls,
  toolPositions,
  isStreaming = false,
  onApprove,
  onReject,
}: InterspersedResponseProps) {
  // Memoize the blocks computation (expensive content splitting)
  const blocks = useMemo(() => {
    // During streaming, we don't need blocks
    if (isStreaming) return [];

    if (toolCalls.length === 0) {
      return [{ type: "text" as const, content }];
    }

    // Sort tools by their position in the text
    const sortedTools = [...toolCalls].sort((a, b) => {
      const posA = toolPositions.get(a.id) ?? content.length;
      const posB = toolPositions.get(b.id) ?? content.length;
      return posA - posB;
    });

    const result: ContentBlock[] = [];
    let lastPos = 0;

    for (const tool of sortedTools) {
      const pos = toolPositions.get(tool.id) ?? content.length;

      // Add text block if there's content before this tool
      if (pos > lastPos) {
        const textSlice = content.slice(lastPos, pos);
        if (textSlice.trim()) {
          result.push({ type: "text", content: textSlice });
        }
      }

      // Add the tool block
      result.push({ type: "tool", toolCall: tool });
      lastPos = pos;
    }

    // Add remaining text after the last tool
    if (lastPos < content.length) {
      const remainingText = content.slice(lastPos);
      if (remainingText.trim()) {
        result.push({ type: "text", content: remainingText });
      }
    }

    return result;
  }, [content, toolCalls, toolPositions, isStreaming]);

  // During streaming, only show tool calls (text is batched until complete)
  if (isStreaming) {
    return (
      <div className="space-y-3">
        {/* Show streaming indicator for text */}
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span>Generating response...</span>
        </div>

        {/* Show tool calls as they come in */}
        {toolCalls.map((toolCall) => (
          <div key={`tool-${toolCall.id}`} className="my-2">
            <CompactActivityItem
              toolCall={toolCall}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "text" && block.content) {
          return (
            <MarkdownRenderer
              key={`text-${index}`}
              content={block.content}
              isStreaming={false}
            />
          );
        }

        if (block.type === "tool" && block.toolCall) {
          return (
            <div key={`tool-${block.toolCall.id}`} className="my-2">
              <CompactActivityItem
                toolCall={block.toolCall}
                onApprove={onApprove}
                onReject={onReject}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
});

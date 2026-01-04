import { Children, isValidElement, ReactNode, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { DiffBlock } from "./DiffBlock";
import { splitContentWithDiffs } from "@/lib/parseCliDiff";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Recursively extract text from React children (handles nested elements)
function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (children == null || typeof children === "boolean") return "";

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }

  if (isValidElement(children)) {
    return extractTextFromChildren(children.props?.children);
  }

  // Handle other iterables
  const childArray = Children.toArray(children);
  return childArray.map(extractTextFromChildren).join("");
}

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-sm text-text-primary mb-3 last:mb-0 leading-relaxed">
      {children}
    </p>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-lg font-semibold text-text-primary mb-3 mt-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-base font-semibold text-text-primary mb-2 mt-4 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
      {children}
    </h3>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc ml-4 pl-5 mb-3 space-y-1 text-sm text-text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal ml-4 pl-5 mb-3 space-y-1 text-sm text-text-primary">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm text-text-primary pl-1">{children}</li>
  ),
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match;

    if (isInline) {
      return (
        <code
          className={cn(
            "px-1.5 py-0.5 rounded text-xs font-mono",
            "bg-bg-hover text-accent-cyan"
          )}
          {...props}
        >
          {children}
        </code>
      );
    }

    const codeText = extractTextFromChildren(children).replace(/\n$/, "");
    return <CodeBlock language={match[1]}>{codeText}</CodeBlock>;
  },
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-blue hover:underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-2 border-accent pl-4 my-3 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-4" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-3 py-2 text-left font-medium text-text-primary bg-bg-hover border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-3 py-2 text-text-primary border-b border-border/50">
      {children}
    </td>
  ),
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming = false,
}: MarkdownRendererProps) {
  // Memoize the segments computation (expensive diff parsing)
  const segments = useMemo(
    () => (isStreaming ? [] : splitContentWithDiffs(content)),
    [content, isStreaming]
  );

  // Wait until streaming is complete before rendering anything
  // This prevents constant re-renders during streaming and shows the full response at once
  if (isStreaming) {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span>Generating response...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {segments.map((segment, idx) =>
        segment.type === "diff" && segment.diff ? (
          <DiffBlock key={idx} diff={segment.diff} />
        ) : (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {segment.content}
          </ReactMarkdown>
        )
      )}
    </div>
  );
});

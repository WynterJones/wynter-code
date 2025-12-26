import { Children, isValidElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
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

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="prose prose-invert prose-sm max-w-none"
      components={{
        p: ({ children }) => (
          <p className="text-sm text-text-primary mb-3 last:mb-0 leading-relaxed">
            {children}
          </p>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold text-text-primary mb-3 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-text-primary mb-2 mt-4 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
            {children}
          </h3>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-text-primary">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-text-primary">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-text-primary">{children}</li>
        ),
        code: ({ className, children, ...props }) => {
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
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent pl-4 my-3 text-text-secondary italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-border my-4" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-medium text-text-primary bg-bg-hover border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-text-primary border-b border-border/50">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

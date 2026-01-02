import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Check, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { gitService, claudeService } from "@/services";
import { cn } from "@/lib/utils";

interface CommitSectionProps {
  projectPath: string;
  stagedCount: number;
  onRefresh: () => void;
}

export function CommitSection({
  projectPath,
  stagedCount,
  onRefresh,
}: CommitSectionProps) {
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canCommit = stagedCount > 0 && message.trim().length > 0 && !isCommitting;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleGenerateMessage = async () => {
    if (stagedCount === 0) {
      setError("Stage some changes first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const diff = await gitService.getStagedDiffFull(projectPath);
      if (!diff.trim()) {
        setError("No staged changes to analyze");
        setIsGenerating(false);
        return;
      }

      const prompt = `Generate a concise git commit message for these staged changes. Use conventional commit format (feat:, fix:, docs:, refactor:, chore:, etc.). Be specific but brief - ideally under 72 chars. Just respond with the commit message, nothing else.

Staged diff:
${diff.slice(0, 4000)}`;

      const result = await claudeService.sendPromptSync(prompt, projectPath);

      // Clean up the result - remove quotes and extra whitespace
      const cleanedMessage = result
        .replace(/^["']|["']$/g, "")
        .replace(/^```.*\n?/gm, "")
        .replace(/```$/gm, "")
        .trim();

      setMessage(cleanedMessage);
    } catch (error) {
      setError("Failed to generate message");
      console.error("AI message generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;

    setIsCommitting(true);
    setError(null);

    const result = await gitService.commit(projectPath, message.trim());

    if (result.success) {
      setMessage("");
      setSuccess(true);
      onRefresh();
    } else {
      setError(result.error || "Commit failed");
    }

    setIsCommitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div className="rounded-lg bg-bg-secondary border border-border overflow-hidden">
      <div className="p-2 space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stagedCount === 0 ? "Stage changes to commit..." : "Commit message..."}
            disabled={stagedCount === 0 || isGenerating}
            className={cn(
              "w-full min-h-[60px] max-h-[120px] px-3 py-2 text-sm rounded-md resize-none",
              "bg-bg-tertiary border border-border",
              "text-text-primary placeholder:text-text-secondary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "font-mono"
            )}
          />
        </div>

        {error && (
          <p className="text-xs text-accent-red px-1">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateMessage}
            disabled={stagedCount === 0 || isGenerating}
            className="gap-1.5"
            title="Generate commit message with AI"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-accent-yellow" />
            )}
            <span className="text-xs">Generate</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleCommit}
            disabled={!canCommit}
            className="ml-auto gap-1.5"
          >
            {isCommitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : success ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">
              {success ? "Committed!" : `Commit${stagedCount > 0 ? ` (${stagedCount})` : ""}`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

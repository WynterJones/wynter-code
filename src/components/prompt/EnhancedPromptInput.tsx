import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  ClipboardEvent,
  DragEvent,
} from "react";
import { Send, StopCircle, ImagePlus } from "lucide-react";
import { v4 as uuid } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/sessionStore";
import { claudeService } from "@/services/claude";
import { FocusOverlay } from "./FocusOverlay";
import { ImageThumbnails, type ImageAttachment } from "./ImageThumbnail";
import { FileTagBadges, type FileReference } from "./FileTagBadge";
import { FilePickerDropdown } from "./FilePickerDropdown";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff", "avif"];

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    tiff: "image/tiff",
    avif: "image/avif",
  };
  return mimeTypes[ext] || "image/png";
}

interface EnhancedPromptInputProps {
  projectPath: string;
  sessionId?: string;
  projectFiles?: string[];
  pendingImage?: ImageAttachment | null;
  onImageConsumed?: () => void;
  onRequestImageBrowser?: () => void;
}

export function EnhancedPromptInput({
  projectPath,
  sessionId,
  projectFiles = [],
  pendingImage,
  onImageConsumed,
  onRequestImageBrowser,
}: EnhancedPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [files, setFiles] = useState<FileReference[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [filePickerPosition, setFilePickerPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    addMessage,
    createSession,
    startStreaming,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    setCurrentTool,
    updateStats,
    addPendingToolCall,
    updateToolCallStatus,
    appendToolInput,
    finishStreaming,
    getStreamingState,
    getSession,
    updateClaudeSessionId,
  } = useSessionStore();

  const streamingState = sessionId ? getStreamingState(sessionId) : null;
  const isStreaming = streamingState?.isStreaming || false;

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
  }, [isFocused]);

  // Handle pending image from file browser
  useEffect(() => {
    if (pendingImage) {
      setImages((prev) => [...prev, pendingImage]);
      onImageConsumed?.();
    }
  }, [pendingImage, onImageConsumed]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = event.target?.result as string;
            setImages((prev) => [
              ...prev,
              {
                id: uuid(),
                data,
                mimeType: item.type,
                name: file.name,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    // Check for internal file drag from sidebar FileTree
    const wynterData = e.dataTransfer?.getData("application/x-wynter-file");
    if (wynterData) {
      try {
        const fileInfo = JSON.parse(wynterData) as { path: string; name: string; isDirectory: boolean };

        if (fileInfo.isDirectory) return; // Don't handle directories

        if (isImageFile(fileInfo.name)) {
          // Read image as base64 via Tauri
          const base64 = await invoke<string>("read_file_base64", { path: fileInfo.path });
          const mimeType = getMimeType(fileInfo.name);
          setImages((prev) => [
            ...prev,
            {
              id: uuid(),
              data: `data:${mimeType};base64,${base64}`,
              mimeType,
              name: fileInfo.name,
            },
          ]);
        } else {
          // Add as file reference with @ badge
          const parts = fileInfo.path.split("/");
          const displayPath =
            parts.length > 3
              ? `${parts[0]}/.../${parts.slice(-2).join("/")}`
              : fileInfo.path;

          setFiles((prev) => [
            ...prev,
            {
              id: uuid(),
              path: fileInfo.path,
              displayPath,
            },
          ]);
        }
      } catch (error) {
        console.error("Error handling internal file drop:", error);
      }
      return;
    }

    // Handle external file drops (from OS file manager)
    const droppedFiles = e.dataTransfer?.files;
    if (!droppedFiles) return;

    for (const file of droppedFiles) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          setImages((prev) => [
            ...prev,
            {
              id: uuid(),
              data,
              mimeType: file.type,
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setPrompt(value);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

      if (atMatch) {
        setFileSearchQuery(atMatch[1]);
        setShowFilePicker(true);

        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setFilePickerPosition({
            top: rect.bottom + 4,
            left: rect.left,
          });
        }
      } else {
        setShowFilePicker(false);
        setFileSearchQuery("");
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (path: string) => {
      const cursorPos = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = prompt.slice(0, cursorPos);
      const textAfterCursor = prompt.slice(cursorPos);

      const atIndex = textBeforeCursor.lastIndexOf("@");
      const newTextBefore = textBeforeCursor.slice(0, atIndex);

      setPrompt(newTextBefore + textAfterCursor);

      const parts = path.split("/");
      const displayPath =
        parts.length > 3
          ? `${parts[0]}/.../${parts.slice(-2).join("/")}`
          : path;

      setFiles((prev) => [
        ...prev,
        {
          id: uuid(),
          path,
          displayPath,
        },
      ]);

      setShowFilePicker(false);
      setFileSearchQuery("");

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [prompt]
  );

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSubmit = async () => {
    if ((!prompt.trim() && images.length === 0 && files.length === 0) || isStreaming)
      return;

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      currentSessionId = createSession(projectPath.split("/").pop() || "project");
    }

    const userMessage = prompt.trim();
    const currentImages = [...images];
    const currentFiles = [...files];
    setPrompt("");
    setImages([]);
    setFiles([]);
    setIsFocused(false);

    // Build full prompt with attachments for CLI
    let fullPrompt = userMessage;

    // Add file references as @ paths (Claude CLI reads these natively)
    if (currentFiles.length > 0) {
      const filePaths = currentFiles.map((f) => f.path).join(" ");
      fullPrompt = `${filePaths}\n\n${fullPrompt}`;
    }

    // Add images as base64 data URLs
    if (currentImages.length > 0) {
      const imageRefs = currentImages.map((img) => img.data).join("\n");
      fullPrompt = `${imageRefs}\n\n${fullPrompt}`;
    }

    addMessage(currentSessionId, {
      sessionId: currentSessionId,
      role: "user",
      content: userMessage,
    });

    startStreaming(currentSessionId);

    const session = getSession(currentSessionId);
    const claudeSessionId = session?.claudeSessionId || undefined;
    const permissionMode = session?.permissionMode || "default";

    try {
      await claudeService.startStreaming(
        fullPrompt,
        projectPath,
        currentSessionId,
        {
          onInit: (model, _cwd, newClaudeSessionId) => {
            updateStats(currentSessionId!, { model });
            if (newClaudeSessionId) {
              updateClaudeSessionId(currentSessionId!, newClaudeSessionId);
            }
          },
          onText: (text) => {
            appendStreamingText(currentSessionId!, text);
          },
          onThinking: (text) => {
            appendThinkingText(currentSessionId!, text);
          },
          onThinkingStart: () => {
            setThinking(currentSessionId!, true);
          },
          onThinkingEnd: () => {
            setThinking(currentSessionId!, false);
          },
          onToolStart: (toolName, toolId) => {
            setCurrentTool(currentSessionId!, toolName);
            addPendingToolCall(currentSessionId!, {
              id: toolId,
              name: toolName,
              input: {},
              status: "running",
            });
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(currentSessionId!, toolId, partialJson);
          },
          onToolEnd: () => {
            setCurrentTool(currentSessionId!, undefined);
          },
          onToolResult: (toolId, content) => {
            updateToolCallStatus(currentSessionId!, toolId, "completed", content);
            setCurrentTool(currentSessionId!, undefined);
          },
          onUsage: (stats) => {
            updateStats(currentSessionId!, stats);
          },
          onResult: () => {},
          onError: (error) => {
            appendStreamingText(currentSessionId!, `\n\nError: ${error}`);
          },
          onDone: (exitCode, newClaudeSessionId, finalStats) => {
            console.log("Claude streaming completed with exit code:", exitCode);
            if (newClaudeSessionId) {
              updateClaudeSessionId(currentSessionId!, newClaudeSessionId);
            }
            if (finalStats) {
              updateStats(currentSessionId!, finalStats);
            }
            finishStreaming(currentSessionId!);
          },
        },
        claudeSessionId,
        permissionMode
      );
    } catch (error) {
      console.error("Error starting streaming:", error);
      appendStreamingText(
        currentSessionId,
        `Error: ${error instanceof Error ? error.message : "Failed to send message"}`
      );
      finishStreaming(currentSessionId);
    }
  };

  const handleStop = () => {
    claudeService.stopStreaming();
    if (sessionId) {
      finishStreaming(sessionId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showFilePicker) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      if (showFilePicker) {
        setShowFilePicker(false);
      } else if (isStreaming) {
        handleStop();
      } else if (isFocused) {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const hasAttachments = images.length > 0 || files.length > 0;

  return (
    <>
      <FocusOverlay isActive={isFocused} onClose={() => setIsFocused(false)} />

      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative",
          isFocused ? "z-50" : "z-10"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 p-4 rounded-xl",
            "bg-bg-tertiary border border-solid",
            isFocused
              ? "border-accent shadow-lg shadow-accent/10"
              : "border-border",
            isDragging && "!border-accent !border-dashed bg-accent/5"
          )}
        >
          {hasAttachments && (
            <div className="flex flex-col gap-2">
              <ImageThumbnails images={images} onRemove={handleRemoveImage} />
              <FileTagBadges files={files} onRemove={handleRemoveFile} />
            </div>
          )}

          <div className="flex items-start gap-3">
            <span
              className={cn(
                "font-mono mt-1",
                isFocused ? "text-accent text-lg" : "text-accent/70 text-sm"
              )}
            >
              $
            </span>

            <textarea
              ref={inputRef}
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onPaste={handlePaste}
              placeholder="Type a prompt... (@ to add files, paste images)"
              disabled={isStreaming}
              className={cn(
                "flex-1 bg-transparent text-text-primary placeholder:text-text-secondary",
                "font-mono resize-none outline-none",
                "disabled:opacity-50",
                "transition-all duration-300 ease-out",
                isFocused ? "text-base leading-relaxed" : "text-sm"
              )}
              style={{
                minHeight: isFocused ? "120px" : "24px",
                maxHeight: isFocused ? "300px" : "200px",
              }}
            />

            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                onClick={() => onRequestImageBrowser?.()}
                className="text-text-secondary hover:text-accent"
                disabled={isStreaming}
              >
                <ImagePlus className="w-4 h-4" />
              </IconButton>

              {isStreaming ? (
                <IconButton
                  size="sm"
                  onClick={handleStop}
                  className="text-accent-red hover:text-accent-red"
                >
                  <StopCircle className="w-4 h-4" />
                </IconButton>
              ) : (
                <IconButton
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() && !hasAttachments}
                  className={cn(
                    prompt.trim() || hasAttachments
                      ? "text-accent hover:text-accent"
                      : "text-text-secondary"
                  )}
                >
                  <Send className="w-4 h-4" />
                </IconButton>
              )}
            </div>
          </div>

          {isFocused && (
            <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border/50 pt-2 mt-1">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">@</kbd>{" "}
                to add files •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">⌘V</kbd>{" "}
                to paste images
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">Esc</kbd>{" "}
                to close •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                  Enter
                </kbd>{" "}
                to send
              </span>
            </div>
          )}
        </div>
      </div>

      <FilePickerDropdown
        isOpen={showFilePicker}
        searchQuery={fileSearchQuery}
        files={projectFiles}
        position={filePickerPosition}
        onSelect={handleFileSelect}
        onClose={() => setShowFilePicker(false)}
      />
    </>
  );
}

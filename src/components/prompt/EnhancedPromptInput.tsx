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
import { useDragStore } from "@/stores/dragStore";
import { FocusOverlay } from "./FocusOverlay";
import { ImageThumbnails, type ImageAttachment } from "./ImageThumbnail";
import { FileTagBadges, type FileReference } from "./FileTagBadge";
import { FilePickerDropdown } from "./FilePickerDropdown";
import { FarmworkPhraseDropdown } from "./FarmworkPhraseDropdown";
import { useFarmworkDetection } from "@/hooks/useFarmworkDetection";
import type { FarmworkPhrase } from "@/types/farmworkPhrase";
// DISABLED: Slash command dropdown (responses not working correctly)
// import { SlashCommandDropdown } from "./SlashCommandDropdown";
// import { BUILTIN_COMMANDS, scanCustomCommands } from "@/lib/slashCommands";
// import type { SlashCommand } from "@/types/slashCommand";
import type { StructuredPrompt } from "@/types/session";

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
  "tiff",
  "avif",
];

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
  onSendPrompt?: (prompt: string) => void;
  onSendStructuredPrompt?: (prompt: StructuredPrompt) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EnhancedPromptInput({
  projectPath,
  sessionId,
  projectFiles = [],
  pendingImage,
  onImageConsumed,
  onRequestImageBrowser,
  onSendPrompt,
  onSendStructuredPrompt,
  disabled = false,
  placeholder = "Type a prompt... (@ to add files, paste images)",
}: EnhancedPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [files, setFiles] = useState<FileReference[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [filePickerPosition, setFilePickerPosition] = useState({
    top: 0,
    left: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  // DISABLED: Slash command dropdown state (responses not working correctly)
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  // const [slashSearchQuery, setSlashSearchQuery] = useState("");
  // const [slashPickerPosition, setSlashPickerPosition] = useState({ top: 0, left: 0 });
  // const [allCommands, setAllCommands] = useState<SlashCommand[]>(BUILTIN_COMMANDS);

  // Farmwork phrase dropdown state
  const [showFarmworkPhrases, setShowFarmworkPhrases] = useState(false);
  const [farmworkSearchQuery, setFarmworkSearchQuery] = useState("");
  const [farmworkPickerPosition, setFarmworkPickerPosition] = useState({
    top: 0,
    left: 0,
  });

  // Check if farmwork is installed
  const { hasFarmwork, hasGarden, hasFarmhouse } = useFarmworkDetection();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Global drag store for visual feedback
  const globalIsDragging = useDragStore((s) => s.isDragging);

  const {
    addMessage,
    createSession,
    startStreaming,
    appendStreamingText,
    finishStreaming,
    getStreamingState,
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

  // Listen for global focus-prompt event (keyboard shortcut)
  useEffect(() => {
    const handleFocusPrompt = () => {
      inputRef.current?.focus();
    };
    window.addEventListener("focus-prompt", handleFocusPrompt);
    return () => window.removeEventListener("focus-prompt", handleFocusPrompt);
  }, []);

  // Listen for internal file drops from drag coordinator
  useEffect(() => {
    const handleInternalFileDrop = async (e: CustomEvent<{ files: Array<{ path: string; name: string; isDirectory: boolean }> }>) => {
      const { files: droppedFiles } = e.detail;
      if (!droppedFiles || droppedFiles.length === 0) return;

      // Focus input after attachment
      setTimeout(() => inputRef.current?.focus(), 0);

      // Process all dropped files
      for (const fileInfo of droppedFiles) {
        if (fileInfo.isDirectory) {
          const parts = fileInfo.path.split("/");
          const displayPath = parts.length > 3
            ? `${parts[0]}/.../${parts.slice(-2).join("/")}/`
            : fileInfo.path + "/";

          setFiles((prev) => [
            ...prev,
            { id: uuid(), path: fileInfo.path, displayPath },
          ]);
          continue;
        }

        if (isImageFile(fileInfo.name)) {
          try {
            const base64 = await invoke<string>("read_file_base64", { path: fileInfo.path });
            const mimeType = getMimeType(fileInfo.name);
            setImages((prev) => [
              ...prev,
              { id: uuid(), data: `data:${mimeType};base64,${base64}`, mimeType, name: fileInfo.name },
            ]);
          } catch (error) {
            console.error("Error reading image:", error);
          }
        } else {
          const parts = fileInfo.path.split("/");
          const displayPath = parts.length > 3
            ? `${parts[0]}/.../${parts.slice(-2).join("/")}`
            : fileInfo.path;

          setFiles((prev) => [
            ...prev,
            { id: uuid(), path: fileInfo.path, displayPath },
          ]);
        }
      }
    };

    window.addEventListener("internal-file-drop", handleInternalFileDrop as unknown as EventListener);
    return () => window.removeEventListener("internal-file-drop", handleInternalFileDrop as unknown as EventListener);
  }, []);

  // DISABLED: Load custom slash commands (responses not working correctly)
  // useEffect(() => {
  //   async function loadCommands() {
  //     try {
  //       const customCommands = await scanCustomCommands(projectPath);
  //       setAllCommands([...BUILTIN_COMMANDS, ...customCommands]);
  //     } catch (error) {
  //       console.error("Error loading custom commands:", error);
  //       setAllCommands(BUILTIN_COMMANDS);
  //     }
  //   }
  //   if (projectPath) {
  //     loadCommands();
  //   }
  // }, [projectPath]);

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

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Set dropEffect to show it's a valid drop target
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    // Check for internal file drag from sidebar FileTree
    const wynterData = e.dataTransfer?.getData("application/x-wynter-file");
    if (wynterData) {
      try {
        const parsed = JSON.parse(wynterData);

        // Handle both single and multi-file formats
        // Single: { path, name, isDirectory }
        // Multi: { primary: {...}, additional: [...] }
        const primaryFile = parsed.primary || parsed;
        const additionalFiles = parsed.additional || [];
        const allFiles = [primaryFile, ...additionalFiles];

        // Process all dropped files
        for (const fileInfo of allFiles) {
          // Handle directories as file references (Claude can read directory contents)
          if (fileInfo.isDirectory) {
            const parts = fileInfo.path.split("/");
            const displayPath =
              parts.length > 3
                ? `${parts[0]}/.../${parts.slice(-2).join("/")}/`
                : fileInfo.path + "/";

            setFiles((prev) => [
              ...prev,
              {
                id: uuid(),
                path: fileInfo.path,
                displayPath,
              },
            ]);
            continue;
          }

          if (isImageFile(fileInfo.name)) {
            // Read image as base64 via Tauri
            const base64 = await invoke<string>("read_file_base64", {
              path: fileInfo.path,
            });
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
        // Handle images by reading as base64
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
      } else {
        // For non-image files from external sources, try to get the path
        // Note: Web File API doesn't expose full paths for security reasons
        // but the file name can still be useful for display
        // In Tauri, we may be able to get paths via webkitRelativePath or native APIs
        const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        const path = webkitPath || file.name;

        setFiles((prev) => [
          ...prev,
          {
            id: uuid(),
            path: path,
            displayPath: file.name,
          },
        ]);
      }
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setPrompt(value);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);

      // Slash command detection - DISABLED for now (responses not working correctly)
      // const slashMatch = textBeforeCursor.match(/^\/([^\s]*)$/);
      // if (slashMatch && cursorPos === textBeforeCursor.length) {
      //   setSlashSearchQuery(slashMatch[1]);
      //   setShowSlashCommands(true);
      //   setShowFilePicker(false);
      //   setFileSearchQuery("");
      //   if (inputRef.current) {
      //     const rect = inputRef.current.getBoundingClientRect();
      //     setSlashPickerPosition({ top: rect.top + 32, left: rect.left });
      //   }
      //   return;
      // } else {
      //   setShowSlashCommands(false);
      //   setSlashSearchQuery("");
      // }

      // ! farmwork phrase detection (only if farmwork is installed)
      if (hasFarmwork) {
        const exclamationMatch = textBeforeCursor.match(/^!([^\s]*)$/);
        if (exclamationMatch && cursorPos === textBeforeCursor.length) {
          setFarmworkSearchQuery(exclamationMatch[1]);
          setShowFarmworkPhrases(true);
          setShowFilePicker(false);
          setFileSearchQuery("");
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setFarmworkPickerPosition({ top: rect.top + 32, left: rect.left });
          }
          return;
        } else {
          setShowFarmworkPhrases(false);
          setFarmworkSearchQuery("");
        }
      }

      // @ file picker detection
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
      if (atMatch) {
        setFileSearchQuery(atMatch[1]);
        setShowFilePicker(true);

        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          // Position below the text line, not the expanded textarea
          // Use top + ~32px for one line of text with padding
          setFilePickerPosition({
            top: rect.top + 32,
            left: rect.left,
          });
        }
      } else {
        setShowFilePicker(false);
        setFileSearchQuery("");
      }
    },
    [hasFarmwork],
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
    [prompt],
  );

  const handleFarmworkPhraseSelect = useCallback(
    (phrase: FarmworkPhrase) => {
      // Replace the ! and any typed characters with the phrase
      const cursorPos = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = prompt.slice(0, cursorPos);
      const textAfterCursor = prompt.slice(cursorPos);

      // Find where ! starts (should be at position 0 for this to trigger)
      const exclamationIndex = textBeforeCursor.lastIndexOf("!");
      const newTextBefore = textBeforeCursor.slice(0, exclamationIndex);

      // Insert phrase (remove trailing "..." if present, add space for typing)
      let insertPhrase = phrase.phrase;
      if (insertPhrase.endsWith("...")) {
        insertPhrase = insertPhrase.slice(0, -3) + " ";
      }

      const newPrompt = newTextBefore + insertPhrase + textAfterCursor;
      setPrompt(newPrompt);

      setShowFarmworkPhrases(false);
      setFarmworkSearchQuery("");

      // Position cursor after the phrase
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = newTextBefore.length + insertPhrase.length;
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      }, 0);
    },
    [prompt],
  );

  // DISABLED: handleSlashCommandSelect (responses not working correctly)
  // const handleSlashCommandSelect = useCallback(
  //   (command: SlashCommand) => {
  //     const newPrompt = `/${command.name} `;
  //     setPrompt(newPrompt);
  //     setShowSlashCommands(false);
  //     setSlashSearchQuery("");
  //     setTimeout(() => {
  //       if (inputRef.current) {
  //         const newPos = newPrompt.length;
  //         inputRef.current.setSelectionRange(newPos, newPos);
  //         inputRef.current.focus();
  //       }
  //     }, 0);
  //   },
  //   [],
  // );

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSubmit = async () => {
    if (
      (!prompt.trim() && images.length === 0 && files.length === 0) ||
      isStreaming ||
      disabled
    )
      return;

    const userMessage = prompt.trim();
    const currentImages = [...images];
    const currentFiles = [...files];

    // If we have the structured prompt handler, use proper content blocks for images
    if (onSendStructuredPrompt) {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = createSession(projectPath.split("/").pop() || "project");
      }

      // Start streaming FIRST - this creates the new slide and triggers navigation
      // This must happen before addMessage so the user message goes to the streaming slide
      startStreaming(currentSessionId);

      // Add user message to history (now goes to streaming slide since isStreaming=true)
      addMessage(currentSessionId, {
        sessionId: currentSessionId,
        role: "user",
        content: userMessage,
      });

      setPrompt("");
      setImages([]);
      setFiles([]);
      setIsFocused(false);

      // Parse images: extract base64 and mediaType from data URLs
      const imageData = currentImages.map((img) => {
        // img.data is like "data:image/png;base64,iVBORw0..."
        const [header, base64] = img.data.split(",");
        const mediaType = header.match(/data:([^;]+)/)?.[1] || "image/png";
        return { base64, mediaType };
      });

      // Send structured prompt with proper image content blocks
      onSendStructuredPrompt({
        text: userMessage,
        images: imageData.length > 0 ? imageData : undefined,
        files: currentFiles.length > 0 ? currentFiles.map((f) => f.path) : undefined,
      });
      return;
    }

    // Legacy mode: build full prompt as string (images won't work properly)
    let fullPrompt = userMessage;

    // Add file references as @ paths (Claude CLI reads these natively)
    if (currentFiles.length > 0) {
      const filePaths = currentFiles.map((f) => f.path).join(" ");
      fullPrompt = `${filePaths}\n\n${fullPrompt}`;
    }

    // If we have a legacy send handler (no structured prompt support)
    if (onSendPrompt) {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = createSession(projectPath.split("/").pop() || "project");
      }

      // Start streaming FIRST - this creates the new slide and triggers navigation
      // This must happen before addMessage so the user message goes to the streaming slide
      startStreaming(currentSessionId);

      // Add user message to history (now goes to streaming slide since isStreaming=true)
      addMessage(currentSessionId, {
        sessionId: currentSessionId,
        role: "user",
        content: userMessage,
      });

      setPrompt("");
      setImages([]);
      setFiles([]);
      setIsFocused(false);

      // Legacy: embed images in prompt text (images may not work for non-Claude providers)
      if (currentImages.length > 0) {
        const imageRefs = currentImages.map((img) => img.data).join("\n");
        fullPrompt = `${imageRefs}\n\n${fullPrompt}`;
      }
      onSendPrompt(fullPrompt);
      return;
    }

    // Legacy mode: start a new streaming session per prompt
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      currentSessionId = createSession(
        projectPath.split("/").pop() || "project",
      );
    }

    setPrompt("");
    setImages([]);
    setFiles([]);
    setIsFocused(false);

    addMessage(currentSessionId, {
      sessionId: currentSessionId,
      role: "user",
      content: userMessage,
    });

    startStreaming(currentSessionId);

    try {
      // This uses the old per-prompt streaming approach
      // In persistent session mode, this branch is not used
      appendStreamingText(currentSessionId, "Note: Legacy per-prompt mode. Consider using persistent session.\n\n");
      finishStreaming(currentSessionId);
    } catch (error) {
      console.error("Error starting streaming:", error);
      appendStreamingText(
        currentSessionId,
        `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
      );
      finishStreaming(currentSessionId);
    }
  };

  const handleStop = () => {
    // In persistent session mode, stopping is handled by ClaudeOutputPanel
    // This is just for legacy mode cleanup
    if (sessionId) {
      finishStreaming(sessionId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showFilePicker && !showSlashCommands && !showFarmworkPhrases) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      if (showFarmworkPhrases) {
        setShowFarmworkPhrases(false);
      } else if (showSlashCommands) {
        setShowSlashCommands(false);
      } else if (showFilePicker) {
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
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn("relative", isFocused ? "z-50" : "z-10")}
      >
        <div
          data-dropzone="prompt"
          className={cn(
            "flex flex-col gap-3 p-4 rounded-xl",
            "bg-bg-tertiary border-2 border-solid transition-all duration-150",
            isFocused
              ? "border-accent shadow-lg shadow-accent/10"
              : "border-border",
            (isDragging || globalIsDragging) && "!border-accent !border-dashed !bg-accent/5",
          )}
        >

          {hasAttachments && (
            <div className="flex flex-col gap-2">
              <ImageThumbnails images={images} onRemove={handleRemoveImage} />
              <FileTagBadges files={files} onRemove={handleRemoveFile} />
            </div>
          )}

          <div className={cn("flex items-start gap-3", globalIsDragging && "select-none")}>
            <span
              className={cn(
                "font-mono",
                isFocused ? "text-accent text-lg" : "text-accent/70 text-sm",
                globalIsDragging && "pointer-events-none",
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
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "flex-1 bg-transparent text-text-primary placeholder:text-text-secondary",
                "font-mono resize-none outline-none",
                "disabled:opacity-50",
                "transition-all duration-300 ease-out",
                isFocused ? "text-base leading-relaxed" : "text-sm",
                globalIsDragging && "pointer-events-none select-none",
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
                aria-label="Add image attachment"
              >
                <ImagePlus className="w-4 h-4" />
              </IconButton>

              {isStreaming ? (
                <IconButton
                  size="sm"
                  onClick={handleStop}
                  className="text-accent-red hover:text-accent-red"
                  aria-label="Stop response generation"
                >
                  <StopCircle className="w-4 h-4" />
                </IconButton>
              ) : (
                <IconButton
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isStreaming || disabled || (!prompt.trim() && !hasAttachments)}
                  className={cn(
                    prompt.trim() || hasAttachments
                      ? "text-accent hover:text-accent"
                      : "text-text-secondary",
                  )}
                  aria-label="Send prompt"
                >
                  <Send className="w-4 h-4" />
                </IconButton>
              )}
            </div>
          </div>

          {isFocused && (
            <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border/50 pt-2 mt-1">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                  @
                </kbd>{" "}
                files
                {hasFarmwork && (
                  <>
                    {" "}•{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                      !
                    </kbd>{" "}
                    <span className="text-[#a6e3a1]">farmwork</span>
                  </>
                )}
                {" "}•{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                  ⌘V
                </kbd>{" "}
                paste
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                  Esc
                </kbd>{" "}
                close •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                  Enter
                </kbd>{" "}
                send
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

      {hasFarmwork && (
        <FarmworkPhraseDropdown
          isOpen={showFarmworkPhrases}
          searchQuery={farmworkSearchQuery}
          position={farmworkPickerPosition}
          onSelect={handleFarmworkPhraseSelect}
          onClose={() => setShowFarmworkPhrases(false)}
          hasGarden={hasGarden}
          hasFarmhouse={hasFarmhouse}
        />
      )}

      {/* SlashCommandDropdown - DISABLED for now (responses not working correctly)
      <SlashCommandDropdown
        isOpen={showSlashCommands}
        searchQuery={slashSearchQuery}
        commands={allCommands}
        position={slashPickerPosition}
        onSelect={handleSlashCommandSelect}
        onClose={() => setShowSlashCommands(false)}
      />
      */}
    </>
  );
}

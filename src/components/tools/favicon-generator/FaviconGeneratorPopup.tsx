import { useState, useCallback, useRef, useEffect } from "react";
import { Download, Copy, Check, Loader2, X, Image as ImageIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import JSZip from "jszip";
import { Modal, Button } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { FileBrowserPopup, type ImageAttachment } from "@/components/files/FileBrowserPopup";
import { PreviewGrid } from "./PreviewGrid";
import { useImageProcessor, type ProcessedFavicons } from "./useImageProcessor";
import { generateManifest } from "./manifestGenerator";
import { generateHtmlTags } from "./htmlGenerator";
import { cn } from "@/lib/utils";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "webp"];

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "image/png";
}

interface FaviconGeneratorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = "upload" | "processing" | "preview";

const FILE_NAMES: Record<keyof ProcessedFavicons, string> = {
  ico: "favicon.ico",
  favicon16: "favicon-16x16.png",
  favicon32: "favicon-32x32.png",
  appleTouchIcon: "apple-touch-icon.png",
  androidChrome192: "android-chrome-192x192.png",
  androidChrome512: "android-chrome-512x512.png",
  mstile150: "mstile-150x150.png",
};

export function FaviconGeneratorPopup({
  isOpen,
  onClose,
}: FaviconGeneratorPopupProps) {
  const [sourceImage, setSourceImage] = useState<{ name: string; data: string } | null>(null);
  const [favicons, setFavicons] = useState<ProcessedFavicons | null>(null);
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [copied, setCopied] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [initialPath, setInitialPath] = useState<string | undefined>(undefined);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { process, progress, error } = useImageProcessor();

  const isPositionInDropZone = useCallback((x: number, y: number): boolean => {
    if (!dropZoneRef.current) return false;
    const rect = dropZoneRef.current.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  const processFilePath = useCallback(
    async (filePath: string) => {
      const fileName = filePath.split("/").pop() || "image.png";
      if (!isImageFile(fileName)) return;

      try {
        setViewState("processing");

        // Read file as base64
        const base64Data = await invoke<string>("read_file_base64", { path: filePath });
        const mimeType = getMimeType(fileName);
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        setSourceImage({ name: fileName, data: dataUrl });

        // Convert to File for processing
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: mimeType });

        const result = await process(file);
        setFavicons(result);
        setViewState("preview");
      } catch (err) {
        console.error("Failed to process dropped file:", err);
        setViewState("upload");
      }
    },
    [process]
  );

  // Listen for Tauri file drop events (works with Finder/external apps)
  useEffect(() => {
    if (!isOpen || viewState !== "upload") return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent(async (event) => {
          const eventType = event.payload.type;

          if (eventType === "enter" || eventType === "over") {
            const pos = event.payload.position;
            if (pos && isPositionInDropZone(pos.x, pos.y)) {
              setIsDragging(true);
            } else {
              setIsDragging(false);
            }
          } else if (eventType === "drop") {
            setIsDragging(false);

            const pos = event.payload.position;
            if (!pos || !isPositionInDropZone(pos.x, pos.y)) return;

            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const filePath = paths[0];
              await processFilePath(filePath);
            }
          } else if (eventType === "leave") {
            setIsDragging(false);
          }
        });
      } catch (err) {
        console.error("Failed to setup drag-drop listener:", err);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [isOpen, viewState, isPositionInDropZone, processFilePath]);

  const handleOpenFileBrowser = async () => {
    try {
      const homeDir = await invoke<string>("get_home_dir");
      setInitialPath(homeDir);
    } catch {
      setInitialPath(undefined);
    }
    setShowFileBrowser(true);
  };

  const handleImageSelected = useCallback(
    async (image: ImageAttachment) => {
      setSourceImage({ name: image.name, data: image.data });
      setShowFileBrowser(false);
      setViewState("processing");

      try {
        // Convert base64 data URL to File object for processing
        const response = await fetch(image.data);
        const blob = await response.blob();
        const file = new File([blob], image.name, { type: image.mimeType });

        const result = await process(file);
        setFavicons(result);
        setViewState("preview");
      } catch {
        setViewState("upload");
      }
    },
    [process]
  );

  const handleClear = useCallback(() => {
    setSourceImage(null);
    setFavicons(null);
    setViewState("upload");
    setDownloadStatus(null);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (!favicons) return;

    try {
      setDownloadStatus("Generating ZIP...");

      const zip = new JSZip();

      // Add all favicon files
      for (const [key, filename] of Object.entries(FILE_NAMES)) {
        const blob = favicons[key as keyof ProcessedFavicons];
        zip.file(filename, blob);
      }

      // Add webmanifest
      zip.file("site.webmanifest", generateManifest());

      // Generate ZIP as base64
      const content = await zip.generateAsync({ type: "base64" });

      // Get downloads directory
      const downloadsDir = await invoke<string>("get_downloads_dir");
      const filePath = `${downloadsDir}/favicons.zip`;

      // Write file using Tauri
      await invoke("write_binary_file", {
        path: filePath,
        base64Data: content,
      });

      setDownloadStatus(`Saved to ${filePath}`);
      setTimeout(() => setDownloadStatus(null), 3000);
    } catch (err) {
      console.error("Failed to download ZIP:", err);
      setDownloadStatus("Failed to save ZIP");
      setTimeout(() => setDownloadStatus(null), 3000);
    }
  }, [favicons]);

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateHtmlTags());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed
    }
  }, []);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Favicon Generator"
        size="lg"
      >
        <OverlayScrollbarsComponent
          options={{ scrollbars: { autoHide: "scroll" } }}
          className="max-h-[70vh]"
        >
          <div className="p-4 space-y-4">
            {viewState === "upload" && (
              <>
                <p className="text-sm text-neutral-400">
                  Upload a high-resolution image to generate a complete favicon
                  package for your website.
                </p>
                <div
                  ref={dropZoneRef}
                  onClick={handleOpenFileBrowser}
                  className={cn(
                    "relative flex flex-col items-center justify-center",
                    "w-full h-48 rounded-lg border-2 border-dashed",
                    "transition-colors cursor-pointer",
                    isDragging
                      ? "border-blue-500 bg-blue-500/10"
                      : sourceImage
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-neutral-600 hover:border-neutral-500 bg-neutral-800/30"
                  )}
                >
                  {sourceImage ? (
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#2a2a2a_0%_50%)] bg-[length:16px_16px]">
                        <img
                          src={sourceImage.data}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-neutral-200 font-medium">
                          {sourceImage.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                          }}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                        isDragging ? "bg-blue-500/20" : "bg-neutral-700/50"
                      )}>
                        <ImageIcon className={cn(
                          "w-6 h-6",
                          isDragging ? "text-blue-400" : "text-neutral-400"
                        )} />
                      </div>
                      <p className="text-sm text-neutral-300 mb-1">
                        {isDragging ? "Drop image here" : "Drop an image or click to select"}
                      </p>
                      <p className="text-xs text-neutral-500">PNG, JPG, SVG, or WebP</p>
                    </>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
              </>
            )}

            {viewState === "processing" && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <div className="text-sm text-neutral-300">
                  Generating favicons...
                </div>
                <div className="w-48 h-2 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {viewState === "preview" && favicons && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={handleClear}
                    className="text-xs text-neutral-400 hover:text-neutral-300"
                  >
                    Start over
                  </button>
                </div>

                <PreviewGrid favicons={favicons} />

                <div className="flex gap-2 pt-4 border-t border-neutral-700">
                  <Button
                    onClick={handleDownloadZip}
                    className="flex-1"
                    variant="default"
                    disabled={!!downloadStatus}
                  >
                    {downloadStatus ? (
                      downloadStatus
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download ZIP
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCopyHtml}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy HTML
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </OverlayScrollbarsComponent>
      </Modal>

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={initialPath}
        mode="browse"
        sendToPromptLabel="Select Image"
        onSendToPrompt={handleImageSelected}
      />
    </>
  );
}

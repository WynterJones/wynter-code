import { useState, useCallback } from "react";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { Modal, Button } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { DropZone } from "./DropZone";
import { PreviewGrid } from "./PreviewGrid";
import { useImageProcessor, type ProcessedFavicons } from "./useImageProcessor";
import { generateManifest } from "./manifestGenerator";
import { generateHtmlTags } from "./htmlGenerator";

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
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [favicons, setFavicons] = useState<ProcessedFavicons | null>(null);
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [copied, setCopied] = useState(false);

  const { process, progress, error } = useImageProcessor();

  const handleImageSelected = useCallback(
    async (file: File) => {
      setSourceFile(file);
      setViewState("processing");

      try {
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
    setSourceFile(null);
    setFavicons(null);
    setViewState("upload");
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (!favicons) return;

    const zip = new JSZip();

    // Add all favicon files
    for (const [key, filename] of Object.entries(FILE_NAMES)) {
      const blob = favicons[key as keyof ProcessedFavicons];
      zip.file(filename, blob);
    }

    // Add webmanifest
    zip.file("site.webmanifest", generateManifest());

    // Generate and download
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "favicons.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <DropZone
                onImageSelected={handleImageSelected}
                currentImage={sourceFile}
                onClear={handleClear}
              />
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
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
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
  );
}

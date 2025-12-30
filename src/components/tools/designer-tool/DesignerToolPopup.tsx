import { useState, useCallback } from "react";
import { Sparkles, Loader2, AlertCircle, Image as ImageIcon, Settings } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { generateImage, base64ToDataUrl } from "@/services/geminiImageService";
import { ApiKeySetup } from "./ApiKeySetup";
import { SaveOptions } from "./SaveOptions";
import { IMAGE_PRESETS, type GeneratedImage } from "./types";
import { cn } from "@/lib/utils";

interface DesignerToolPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DesignerToolPopup({ isOpen, onClose }: DesignerToolPopupProps) {
  const { geminiImageApiKey } = useSettingsStore();
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("og-image");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = IMAGE_PRESETS.find((p) => p.id === selectedPresetId) || IMAGE_PRESETS[0];
  const hasApiKey = !!geminiImageApiKey;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !hasApiKey) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage(
        {
          prompt: prompt.trim(),
          aspectRatio: selectedPreset.aspectRatio,
          negativePrompt: negativePrompt.trim() || undefined,
        },
        geminiImageApiKey
      );

      setGeneratedImage({
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        presetId: selectedPresetId,
        imageData: result.imageData,
        mimeType: result.mimeType,
        createdAt: new Date(),
        width: selectedPreset.width,
        height: selectedPreset.height,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, negativePrompt, selectedPreset, selectedPresetId, geminiImageApiKey, hasApiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  // Show API key setup if no key is configured
  if (!hasApiKey && !showApiKeySetup) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Designer Tool" showCloseButton className="max-w-2xl w-[95vw]">
        <div className="flex flex-col h-[500px]">
          <ApiKeySetup onComplete={() => setShowApiKeySetup(false)} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Designer Tool"
      showCloseButton
      className="max-w-5xl w-[95vw]"
      headerActions={
        <Tooltip content="API Settings">
          <IconButton
            onClick={() => setShowApiKeySetup(true)}
            className="text-text-secondary hover:text-text-primary"
          >
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      }
    >
      <div className="flex flex-col h-[80vh] max-h-[700px]">
        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-80 border-r border-border flex flex-col">
            <OverlayScrollbarsComponent
              className="flex-1"
              options={{ scrollbars: { theme: "os-theme-custom" } }}
            >
              <div className="p-4 space-y-4">
                {/* Prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the image you want to generate..."
                    className="w-full h-28 px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>

                {/* Negative Prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Negative Prompt (optional)
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid in the image..."
                    className="w-full h-16 px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none text-sm"
                  />
                </div>

                {/* Preset Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Size Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={cn(
                          "!text-xs",
                          selectedPresetId === preset.id
                            ? "btn-primary"
                            : "btn-secondary"
                        )}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted text-center">
                  Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to generate
                </p>

                {/* Save Options */}
                {generatedImage && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-text-primary mb-3">Save Image</h3>
                    <SaveOptions image={generatedImage} preset={selectedPreset} />
                  </div>
                )}
              </div>
            </OverlayScrollbarsComponent>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col">
            <OverlayScrollbarsComponent
              className="flex-1"
              options={{ scrollbars: { theme: "os-theme-custom" } }}
            >
              <div className="p-4 h-full flex items-center justify-center">
                {error && (
                  <div className="max-w-md w-full flex flex-col items-center text-center space-y-4 p-6 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <div>
                      <h3 className="font-medium text-red-400">Generation Failed</h3>
                      <p className="text-sm text-red-300 mt-1">{error}</p>
                    </div>
                    <Button variant="secondary" onClick={() => setError(null)}>
                      Try Again
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-accent/20 animate-pulse" />
                      <Loader2 className="w-12 h-12 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                    </div>
                    <p className="text-secondary">Generating your image...</p>
                    <p className="text-xs text-muted">This may take 10-15 seconds</p>
                  </div>
                )}

                {!isGenerating && !error && !generatedImage && (
                  <div className="flex flex-col items-center text-center space-y-4 text-muted">
                    <ImageIcon className="w-16 h-16 opacity-30" />
                    <div>
                      <p className="font-medium">No image generated yet</p>
                      <p className="text-sm mt-1">
                        Enter a prompt and click Generate to create an image
                      </p>
                    </div>
                  </div>
                )}

                {generatedImage && !isGenerating && !error && (
                  <div className="flex flex-col items-center space-y-4">
                    <div
                      className="relative bg-secondary/50 rounded-lg overflow-hidden border border-border"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "calc(80vh - 200px)",
                      }}
                    >
                      <img
                        src={base64ToDataUrl(generatedImage.imageData, generatedImage.mimeType)}
                        alt="Generated image"
                        className="max-w-full max-h-full object-contain"
                        style={{
                          aspectRatio: `${generatedImage.width} / ${generatedImage.height}`,
                        }}
                      />
                    </div>
                    <div className="text-center text-sm text-secondary">
                      <p>{selectedPreset.name}</p>
                      <p className="text-xs text-muted">
                        {generatedImage.width} x {generatedImage.height}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </OverlayScrollbarsComponent>
          </div>
        </div>
      </div>

      {/* API Key Setup Modal */}
      {showApiKeySetup && (
        <Modal
          isOpen={showApiKeySetup}
          onClose={() => setShowApiKeySetup(false)}
          title="API Settings"
          showCloseButton
          className="max-w-md w-[95vw]"
        >
          <div className="flex flex-col h-[400px]">
            <ApiKeySetup onComplete={() => setShowApiKeySetup(false)} />
          </div>
        </Modal>
      )}
    </Modal>
  );
}

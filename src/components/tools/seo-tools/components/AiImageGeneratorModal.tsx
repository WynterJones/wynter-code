import { useState, useCallback } from "react";
import { X, Sparkles, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  generateImage,
  base64ToDataUrl,
  getExtensionFromMimeType,
  type GeminiAspectRatio,
} from "@/services/geminiImageService";

export type ImagePresetType = "og-image" | "twitter-card" | "favicon";

interface AiImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetType: ImagePresetType;
  onImageGenerated: (imagePath: string) => void;
}

const PRESET_CONFIG: Record<ImagePresetType, { name: string; width: number; height: number; aspectRatio: GeminiAspectRatio }> = {
  "og-image": { name: "OG Image", width: 1200, height: 630, aspectRatio: "16:9" },
  "twitter-card": { name: "Twitter Card", width: 1200, height: 600, aspectRatio: "16:9" },
  "favicon": { name: "Favicon", width: 512, height: 512, aspectRatio: "1:1" },
};

export function AiImageGeneratorModal({
  isOpen,
  onClose,
  presetType,
  onImageGenerated,
}: AiImageGeneratorModalProps) {
  const { geminiImageApiKey, setGeminiImageApiKey } = useSettingsStore();
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeProjectPath = activeProject?.path || null;
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState(geminiImageApiKey);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{ data: string; mimeType: string } | null>(null);

  const config = PRESET_CONFIG[presetType];
  const hasApiKey = !!geminiImageApiKey;

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setGeminiImageApiKey(apiKey.trim());
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !geminiImageApiKey) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage(
        {
          prompt: prompt.trim(),
          aspectRatio: config.aspectRatio,
        },
        geminiImageApiKey
      );

      setGeneratedImage({
        data: result.imageData,
        mimeType: result.mimeType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, config.aspectRatio, geminiImageApiKey]);

  const handleUseImage = useCallback(async () => {
    if (!generatedImage || !activeProjectPath) return;

    setIsSaving(true);
    try {
      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const ext = getExtensionFromMimeType(generatedImage.mimeType);
      const filename = `${presetType}-${timestamp}.${ext}`;

      // Check if public folder exists
      const publicPath = `${activeProjectPath}/public`;
      let targetFolder = activeProjectPath;
      try {
        const exists = await invoke<boolean>("path_exists", { path: publicPath });
        if (exists) {
          targetFolder = publicPath;
        }
      } catch {
        // Use project root if check fails
      }

      // Save the image
      const tempPath = await invoke<string>("save_temp_image", {
        base64Data: generatedImage.data,
        mediaType: generatedImage.mimeType,
      });

      await invoke("move_item", {
        sourcePath: tempPath,
        destinationFolder: targetFolder,
      });

      const tempFilename = tempPath.split("/").pop();
      const movedPath = `${targetFolder}/${tempFilename}`;
      await invoke("rename_item", {
        oldPath: movedPath,
        newName: filename,
      });

      const finalPath = `${targetFolder}/${filename}`;

      // Return relative path for use in meta tags
      const relativePath = finalPath.replace(activeProjectPath, "").replace(/^\//, "");
      onImageGenerated(relativePath);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  }, [generatedImage, activeProjectPath, presetType, onImageGenerated, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-[95vw]">
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-primary">
              Generate {config.name}
            </h2>
          </div>
          <IconButton onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* API Key Setup if needed */}
          {!hasApiKey && (
            <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
              <p className="text-sm text-secondary">
                Enter your Gemini API key to generate images with AI.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Gemini API Key"
                  className="flex-1 px-3 py-2 bg-primary border border-border rounded-md text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                  Save
                </Button>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Get API key from Google AI Studio
              </a>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
              Describe your {config.name.toLowerCase()}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`A professional ${config.name.toLowerCase()} for a website about...`}
              disabled={!hasApiKey}
              className="w-full h-24 px-3 py-2 bg-secondary border border-border rounded-md text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none disabled:opacity-50"
            />
            <p className="text-xs text-muted">
              Image size: {config.width} x {config.height}px
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {generatedImage && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">Preview</label>
              <div className="relative bg-secondary/50 rounded-lg overflow-hidden border border-border">
                <img
                  src={base64ToDataUrl(generatedImage.data, generatedImage.mimeType)}
                  alt="Generated preview"
                  className="w-full h-auto"
                  style={{ aspectRatio: `${config.width} / ${config.height}` }}
                />
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-secondary">Generating image...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {generatedImage ? (
            <Button onClick={handleUseImage} disabled={isSaving || !activeProjectPath}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Use This Image"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !hasApiKey}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

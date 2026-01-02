import { useState } from "react";
import { Download, FolderOpen, FolderRoot, Check, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { useProjectStore } from "@/stores/projectStore";
import {
  downloadImage,
  getExtensionFromMimeType,
} from "@/services/geminiImageService";
import type { GeneratedImage, ImagePreset } from "./types";

interface SaveOptionsProps {
  image: GeneratedImage;
  preset: ImagePreset;
  onSaved?: (path: string) => void;
}

export function SaveOptions({ image, preset, onSaved }: SaveOptionsProps) {
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeProjectPath = activeProject?.path || null;
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const generateFilename = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const ext = getExtensionFromMimeType(image.mimeType);
    return `${preset.id}-${timestamp}.${ext}`;
  };

  const handleDownload = () => {
    const filename = generateFilename();
    downloadImage(image.imageData, image.mimeType, filename);
  };

  const handleSaveToFolder = async (folderPath: string) => {
    setShowFileBrowser(false);
    await saveToPath(folderPath);
  };

  const handleSaveToProject = async () => {
    if (!activeProjectPath) return;
    // Save to public folder if it exists, otherwise project root
    const publicPath = `${activeProjectPath}/public`;
    try {
      const exists = await invoke<boolean>("path_exists", { path: publicPath });
      const targetPath = exists ? publicPath : activeProjectPath;
      await saveToPath(targetPath);
    } catch (error) {
      await saveToPath(activeProjectPath);
    }
  };

  const saveToPath = async (folderPath: string) => {
    setIsSaving(true);
    setSavedPath(null);

    try {
      const filename = generateFilename();
      const filePath = `${folderPath}/${filename}`;

      // Save using temp file first
      const tempPath = await invoke<string>("save_temp_image", {
        base64Data: image.imageData,
        mediaType: image.mimeType,
      });

      // Move from temp to target location
      await invoke("move_item", {
        sourcePath: tempPath,
        destinationFolder: folderPath,
      });

      // Rename to our desired filename
      const tempFilename = tempPath.split("/").pop();
      const movedPath = `${folderPath}/${tempFilename}`;
      await invoke("rename_item", {
        oldPath: movedPath,
        newName: filename,
      });

      setSavedPath(filePath);
      onSaved?.(filePath);
    } catch (error) {
      console.error("Failed to save image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={handleDownload}
          className="justify-start"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowFileBrowser(true)}
          className="justify-start"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Save to Folder...
        </Button>

        {activeProjectPath && (
          <Button
            variant="secondary"
            onClick={handleSaveToProject}
            disabled={isSaving}
            className="justify-start"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : savedPath ? (
              <Check className="w-4 h-4 mr-2 text-green-400" />
            ) : (
              <FolderRoot className="w-4 h-4 mr-2" />
            )}
            Save to Project
          </Button>
        )}

        {savedPath && (
          <p className="text-xs text-secondary truncate mt-1" title={savedPath}>
            Saved to: {savedPath.split("/").pop()}
          </p>
        )}
      </div>

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={activeProjectPath || undefined}
        mode="selectProject"
        selectButtonLabel="Save Here"
        onSelectProject={handleSaveToFolder}
      />
    </>
  );
}

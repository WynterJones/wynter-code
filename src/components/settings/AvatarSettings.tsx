import { useState } from "react";
import { Upload, Trash2, User } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import { FileBrowserPopup, type ImageAttachment } from "@/components/files/FileBrowserPopup";
import { cn } from "@/lib/utils";

export function AvatarSettings() {
  const { userAvatar, setUserAvatar } = useSettingsStore();
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [initialPath, setInitialPath] = useState<string | undefined>(undefined);

  const handleOpenFileBrowser = async () => {
    try {
      const homeDir = await invoke<string>("get_home_dir");
      setInitialPath(homeDir);
    } catch {
      setInitialPath(undefined);
    }
    setShowFileBrowser(true);
  };

  const handleImageSelected = (image: ImageAttachment) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      const base64 = canvas.toDataURL("image/png");
      setUserAvatar(base64);
    };
    img.src = image.data;
    setShowFileBrowser(false);
  };

  const handleRemoveAvatar = () => {
    setUserAvatar(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Avatar Settings
      </h2>

      <div className="flex flex-col items-center gap-6">
        <div
          className={cn(
            "w-32 h-32 rounded-full border-2 border-dashed border-border",
            "flex items-center justify-center overflow-hidden",
            "bg-bg-secondary transition-colors",
            !userAvatar && "hover:border-accent hover:bg-bg-hover cursor-pointer"
          )}
          onClick={() => !userAvatar && handleOpenFileBrowser()}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-text-secondary" />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleOpenFileBrowser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary hover:bg-bg-hover transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            {userAvatar ? "Change Avatar" : "Upload Avatar"}
          </button>

          {userAvatar && (
            <button
              onClick={handleRemoveAvatar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-secondary text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          Why Use an Avatar?
        </h3>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>- Replaces the settings cog in the header for a personalized look</li>
          <li>- Click your avatar anytime to open settings</li>
          <li>- Images are cropped to a square and resized to 256x256</li>
          <li>- Supported formats: PNG, JPG, GIF, WebP</li>
        </ul>
      </div>

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={initialPath}
        mode="browse"
        sendToPromptLabel="Select Image"
        onSendToPrompt={handleImageSelected}
      />
    </div>
  );
}

import { useState } from "react";
import { Circle, Square, RectangleHorizontal, Upload, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { WORKSPACE_COLORS, type WorkspaceAvatar, type AvatarShape } from "@/types/workspace";
import { WorkspaceAvatar as WorkspaceAvatarDisplay } from "./WorkspaceAvatar";
import { FileBrowserPopup, type ImageAttachment } from "@/components/files/FileBrowserPopup";

interface WorkspaceAvatarEditorProps {
  avatar: WorkspaceAvatar;
  color: string;
  onAvatarChange: (avatar: Partial<WorkspaceAvatar>) => void;
  onColorChange: (color: string) => void;
  onFileBrowserOpenChange?: (isOpen: boolean) => void;
}

const CURATED_ICONS = [
  "Briefcase",
  "FolderOpen",
  "Code",
  "Terminal",
  "Rocket",
  "Zap",
  "Sparkles",
  "Star",
  "Heart",
  "Flame",
  "Gem",
  "Crown",
  "Globe",
  "Cloud",
  "Server",
  "Database",
  "Laptop",
  "Gamepad2",
  "Music",
  "Palette",
  "Book",
  "Lightbulb",
  "Brain",
  "Atom",
  "Activity",
  "Wallet",
  "Package",
  "Layers",
  "Component",
  "Puzzle",
  "GitBranch",
  "Bot",
] as const;

const shapeOptions: { value: AvatarShape; icon: typeof Circle; label: string }[] = [
  { value: "circle", icon: Circle, label: "Circle" },
  { value: "rounded", icon: RectangleHorizontal, label: "Rounded" },
  { value: "square", icon: Square, label: "Square" },
];

export function WorkspaceAvatarEditor({
  avatar,
  color,
  onAvatarChange,
  onColorChange,
  onFileBrowserOpenChange,
}: WorkspaceAvatarEditorProps) {
  const [activeTab, setActiveTab] = useState<"icon" | "image">(avatar.type);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [initialPath, setInitialPath] = useState<string | undefined>(undefined);

  // Notify parent when file browser open state changes
  const setFileBrowserOpen = (isOpen: boolean) => {
    setShowFileBrowser(isOpen);
    onFileBrowserOpenChange?.(isOpen);
  };

  const handleOpenFileBrowser = async () => {
    try {
      const homeDir = await invoke<string>("get_home_dir");
      setInitialPath(homeDir);
    } catch (error) {
      setInitialPath(undefined);
    }
    setFileBrowserOpen(true);
  };

  const handleImageSelected = (image: ImageAttachment) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 128;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      const imageData = canvas.toDataURL("image/png");
      onAvatarChange({ type: "image", imageData });
      setActiveTab("image");
    };
    img.src = image.data;
    setFileBrowserOpen(false);
  };

  const handleRemoveImage = () => {
    onAvatarChange({ type: "icon", imageData: undefined, icon: "Briefcase" });
    setActiveTab("icon");
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{
      className?: string;
    }>;
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center justify-center py-3">
        <WorkspaceAvatarDisplay avatar={avatar} color={color} size="lg" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("icon")}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium transition-colors",
            activeTab === "icon"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          Icon
        </button>
        <button
          onClick={() => setActiveTab("image")}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium transition-colors",
            activeTab === "image"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          Image
        </button>
      </div>

      {/* Icon Tab */}
      {activeTab === "icon" && (
        <div className="space-y-3">
          {/* Color Picker */}
          <div>
            <div className="text-xs text-text-secondary mb-2">Color</div>
            <div className="flex gap-1.5 flex-wrap">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    color === c && "ring-2 ring-offset-2 ring-offset-bg-primary ring-white"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <div className="text-xs text-text-secondary mb-2">Icon</div>
            <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto scrollbar-thin">
              {CURATED_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => onAvatarChange({ type: "icon", icon: iconName })}
                  title={iconName}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded transition-all",
                    "hover:bg-bg-hover hover:scale-110",
                    avatar.icon === iconName && avatar.type === "icon"
                      ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {renderIcon(iconName)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Tab */}
      {activeTab === "image" && (
        <div className="space-y-3">
          {avatar.type === "image" && avatar.imageData ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenFileBrowser}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Change Image
              </button>
              <button
                onClick={handleRemoveImage}
                className="p-2 text-text-secondary hover:text-accent-red hover:bg-bg-hover rounded-md transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenFileBrowser}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 text-xs bg-bg-tertiary hover:bg-bg-hover border border-dashed border-border rounded-md transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          )}

          <div className="text-xs text-text-secondary text-center">
            PNG, JPG, or SVG (max 128x128)
          </div>

          <FileBrowserPopup
            isOpen={showFileBrowser}
            onClose={() => setFileBrowserOpen(false)}
            initialPath={initialPath}
            mode="browse"
            sendToPromptLabel="Select Image"
            overlayClassName="z-[10000]"
            onSendToPrompt={handleImageSelected}
          />
        </div>
      )}

      {/* Shape Selector */}
      <div>
        <div className="text-xs text-text-secondary mb-2">Shape</div>
        <div className="flex gap-1">
          {shapeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => onAvatarChange({ shape: value })}
              title={label}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs transition-all",
                avatar.shape === value
                  ? "bg-accent/20 text-accent"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

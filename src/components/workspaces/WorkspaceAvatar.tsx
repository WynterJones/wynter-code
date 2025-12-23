import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceAvatar as WorkspaceAvatarType, AvatarShape } from "@/types/workspace";

// Darken a hex color by a percentage (0-1)
function darkenColor(hex: string, amount: number = 0.4): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

interface WorkspaceAvatarProps {
  avatar: WorkspaceAvatarType;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
  square: "rounded-none",
};

export function WorkspaceAvatar({
  avatar,
  color,
  size = "md",
  className,
}: WorkspaceAvatarProps) {
  const renderIcon = () => {
    if (!avatar.icon) return null;
    const IconComponent = LucideIcons[
      avatar.icon as keyof typeof LucideIcons
    ] as React.ComponentType<{ className?: string }>;
    if (!IconComponent) return null;
    return <IconComponent className={iconSizeClasses[size]} />;
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        shapeClasses[avatar.shape],
        "flex items-center justify-center overflow-hidden flex-shrink-0",
        className
      )}
      style={{
        backgroundColor: avatar.type === "icon" ? color : undefined,
      }}
    >
      {avatar.type === "icon" ? (
        <span style={{ color: darkenColor(color, 0.45) }}>{renderIcon()}</span>
      ) : avatar.imageData ? (
        <img
          src={avatar.imageData}
          alt="Workspace"
          className={cn("w-full h-full object-cover", shapeClasses[avatar.shape])}
        />
      ) : (
        // Fallback if no image data
        <span
          className={cn(
            sizeClasses[size],
            shapeClasses[avatar.shape],
            "flex items-center justify-center"
          )}
          style={{ backgroundColor: color }}
        >
          <LucideIcons.Briefcase
            className={iconSizeClasses[size]}
            style={{ color: darkenColor(color, 0.45) }}
          />
        </span>
      )}
    </div>
  );
}

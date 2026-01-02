import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageAttachment {
  id: string;
  data: string;
  mimeType: string;
  name?: string;
}

interface ImageThumbnailProps {
  image: ImageAttachment;
  onRemove: (id: string) => void;
}

function ImageThumbnail({ image, onRemove }: ImageThumbnailProps) {
  return (
    <div
      className={cn(
        "relative group",
        "w-16 h-16 rounded-lg overflow-hidden",
        "border border-border bg-bg-tertiary",
        "flex-shrink-0"
      )}
    >
      <img
        src={image.data}
        alt={image.name || "Attached image"}
        className="w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={() => onRemove(image.id)}
        aria-label="Remove image"
        className={cn(
          "absolute top-0.5 right-0.5",
          "w-5 h-5 rounded-full",
          "bg-black/60 hover:bg-black/80",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-150"
        )}
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

interface ImageThumbnailsProps {
  images: ImageAttachment[];
  onRemove: (id: string) => void;
}

export function ImageThumbnails({ images, onRemove }: ImageThumbnailsProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {images.map((image) => (
        <ImageThumbnail key={image.id} image={image} onRemove={onRemove} />
      ))}
    </div>
  );
}

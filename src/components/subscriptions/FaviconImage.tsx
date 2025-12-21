import { useState } from "react";
import { cn } from "@/lib/utils";

interface FaviconImageProps {
  url: string | null;
  faviconUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 text-[10px]",
  md: "w-5 h-5 text-xs",
  lg: "w-6 h-6 text-sm",
};

export function FaviconImage({
  url,
  faviconUrl,
  name,
  size = "md",
  className,
}: FaviconImageProps) {
  const [hasError, setHasError] = useState(false);

  const getFaviconSrc = () => {
    if (faviconUrl) return faviconUrl;
    if (url) {
      try {
        const urlObj = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      } catch {
        return null;
      }
    }
    return null;
  };

  const faviconSrc = getFaviconSrc();
  const fallbackLetter = name.charAt(0).toUpperCase();

  if (!faviconSrc || hasError) {
    return (
      <div
        className={cn(
          "rounded flex items-center justify-center bg-accent/20 text-accent font-medium flex-shrink-0",
          sizeClasses[size],
          className
        )}
      >
        {fallbackLetter}
      </div>
    );
  }

  return (
    <img
      src={faviconSrc}
      alt={`${name} icon`}
      onError={() => setHasError(true)}
      className={cn("rounded flex-shrink-0 object-contain", sizeClasses[size], className)}
    />
  );
}

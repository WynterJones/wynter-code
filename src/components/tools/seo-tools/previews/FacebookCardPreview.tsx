import { Facebook } from "lucide-react";

interface FacebookCardPreviewProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  siteName?: string;
}

export function FacebookCardPreview({
  title,
  description,
  url,
  image,
  siteName,
}: FacebookCardPreviewProps) {
  const displayUrl = url
    ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toUpperCase()
    : "EXAMPLE.COM";

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 max-w-lg font-sans">
      <div className="text-xs text-gray-500 p-2 flex items-center gap-2 border-b border-gray-100">
        <Facebook className="w-3 h-3 text-[#1877f2]" />
        Facebook Preview
      </div>
      {/* Image placeholder */}
      <div className="aspect-[1.91/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="text-gray-400 text-sm">1200 x 630 recommended</div>
        )}
      </div>
      {/* Content */}
      <div className="p-3 bg-[#f0f2f5] border-t border-gray-200">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          {displayUrl}
        </div>
        <h3 className="text-gray-900 font-semibold text-base mt-1 leading-tight line-clamp-2">
          {title || "Your Page Title"}
        </h3>
        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
          {description || "Your Open Graph description will appear here."}
        </p>
        {siteName && (
          <div className="text-xs text-gray-400 mt-1">{siteName}</div>
        )}
      </div>
    </div>
  );
}

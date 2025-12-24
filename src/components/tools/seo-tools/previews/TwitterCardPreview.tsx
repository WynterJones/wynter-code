import { Twitter } from "lucide-react";

interface TwitterCardPreviewProps {
  cardType: "summary" | "summary_large_image";
  title: string;
  description: string;
  url: string;
  image?: string;
  site?: string;
}

export function TwitterCardPreview({
  cardType,
  title,
  description,
  url,
  image,
  site,
}: TwitterCardPreviewProps) {
  const displayUrl = url
    ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname
    : "example.com";

  const isLarge = cardType === "summary_large_image";

  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-gray-800 max-w-lg font-sans">
      <div className="text-xs text-gray-500 p-2 flex items-center gap-2 border-b border-gray-800">
        <Twitter className="w-3 h-3" />
        Twitter/X Preview ({isLarge ? "Large Image" : "Summary"})
      </div>

      {isLarge ? (
        // Summary Large Image layout
        <div>
          <div className="aspect-[2/1] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
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
              <div className="text-gray-600 text-sm">1200 x 600 recommended</div>
            )}
          </div>
          <div className="p-3">
            <h3 className="text-white font-normal text-base leading-tight line-clamp-2">
              {title || "Your Page Title"}
            </h3>
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
              {description || "Your Twitter card description will appear here."}
            </p>
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-2">
              <span>{displayUrl}</span>
              {site && <span>· {site}</span>}
            </div>
          </div>
        </div>
      ) : (
        // Summary (small) layout
        <div className="flex">
          <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
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
              <div className="text-gray-600 text-xs text-center px-2">
                400 x 400
              </div>
            )}
          </div>
          <div className="flex-1 p-3 flex flex-col justify-center">
            <h3 className="text-white font-normal text-sm leading-tight line-clamp-2">
              {title || "Your Page Title"}
            </h3>
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">
              {description || "Description here"}
            </p>
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
              <span>{displayUrl}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

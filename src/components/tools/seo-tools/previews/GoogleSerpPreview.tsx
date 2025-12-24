import { Globe } from "lucide-react";

interface GoogleSerpPreviewProps {
  title: string;
  description: string;
  url: string;
}

export function GoogleSerpPreview({ title, description, url }: GoogleSerpPreviewProps) {
  const displayUrl = url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname : "example.com";

  return (
    <div className="bg-white rounded-lg p-4 font-sans border border-gray-200">
      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
        <Globe className="w-3 h-3" />
        Google Search Preview
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
            {displayUrl.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-gray-800 text-sm">{displayUrl}</div>
            <div className="text-gray-500 text-xs">{url || "https://example.com/page"}</div>
          </div>
        </div>
        <h3 className="text-[#1a0dab] text-xl hover:underline cursor-pointer leading-tight">
          {title || "Page Title - Your Website Name"}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
          {description || "This is where your meta description will appear. It should be between 150-160 characters for optimal display in search results."}
        </p>
      </div>
    </div>
  );
}

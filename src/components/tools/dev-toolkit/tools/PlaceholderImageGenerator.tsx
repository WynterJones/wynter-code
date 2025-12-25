import { useState, useMemo, useEffect } from "react";
import { Copy, Check, Download } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type ImageFormat = "png" | "jpg" | "svg" | "webp";

interface Preset {
  name: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { name: "Thumbnail", width: 150, height: 150 },
  { name: "Avatar", width: 200, height: 200 },
  { name: "Hero", width: 1920, height: 1080 },
  { name: "OG Image", width: 1200, height: 630 },
  { name: "Card", width: 400, height: 300 },
  { name: "Banner", width: 1200, height: 400 },
];

function generateSVG(width: number, height: number, bgColor: string, textColor: string, text: string): string {
  const encodedText = encodeURIComponent(text);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 8}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${encodedText}</text>
</svg>`;
}

function generateDataURI(format: ImageFormat, width: number, height: number, bgColor: string, textColor: string, text: string): Promise<string> {
  return new Promise((resolve) => {
    if (format === "svg") {
      const svg = generateSVG(width, height, bgColor, textColor, text);
      resolve(`data:image/svg+xml;base64,${btoa(svg)}`);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve("");
      return;
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.min(width, height) / 8}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);

    const mimeType = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        } else {
          resolve("");
        }
      },
      mimeType,
      0.95
    );
  });
}

export function PlaceholderImageGenerator() {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [bgColor, setBgColor] = useState("#cccccc");
  const [textColor, setTextColor] = useState("#666666");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ImageFormat>("png");
  const [copied, setCopied] = useState(false);
  const [dataUri, setDataUri] = useState<string>("");

  const displayText = useMemo(() => {
    return text || `${width}×${height}`;
  }, [text, width, height]);

  useEffect(() => {
    if (format !== "svg") {
      generateDataURI(format, width, height, bgColor, textColor, displayText).then(setDataUri);
    }
  }, [format, width, height, bgColor, textColor, displayText]);

  const imageUrl = useMemo(() => {
    if (format === "svg") {
      return `data:image/svg+xml;base64,${btoa(generateSVG(width, height, bgColor, textColor, displayText))}`;
    }
    return dataUri;
  }, [width, height, bgColor, textColor, displayText, format, dataUri]);

  const handlePreset = (preset: Preset) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    const extension = format === "svg" ? "svg" : format === "webp" ? "webp" : format === "jpg" ? "jpg" : "png";
    link.download = `placeholder-${width}x${height}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Width</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
            className={cn(
              "px-2 py-1.5 rounded text-sm",
              "bg-bg-primary border border-border",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
            min="1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Height</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
            className={cn(
              "px-2 py-1.5 rounded text-sm",
              "bg-bg-primary border border-border",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
            min="1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-8 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className={cn(
                "flex-1 px-2 py-1.5 rounded text-sm font-mono",
                "bg-bg-primary border border-border",
                "focus:outline-none focus:ring-2 focus:ring-accent/50"
              )}
              placeholder="#cccccc"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-8 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className={cn(
                "flex-1 px-2 py-1.5 rounded text-sm font-mono",
                "bg-bg-primary border border-border",
                "focus:outline-none focus:ring-2 focus:ring-accent/50"
              )}
              placeholder="#666666"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Custom Text (optional)</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${width}×${height}`}
            className={cn(
              "px-2 py-1.5 rounded text-sm",
              "bg-bg-primary border border-border",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-tertiary">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ImageFormat)}
            className={cn(
              "px-2 py-1.5 rounded text-sm",
              "bg-bg-primary border border-border",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="svg">SVG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-tertiary">Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                "bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-hover",
                width === preset.width && height === preset.height && "bg-accent text-accent-foreground"
              )}
            >
              {preset.name} ({preset.width}×{preset.height})
            </button>
          ))}
        </div>
      </div>

      {imageUrl && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">Preview</label>
            <div className="flex items-center gap-2">
              <Tooltip content="Copy Data URI">
                <IconButton size="sm" onClick={handleCopyUrl}>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip content="Download">
                <IconButton size="sm" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-bg-secondary rounded-lg border border-border p-4 min-h-[200px]">
            <img
              src={imageUrl}
              alt="Placeholder"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "400px" }}
            />
          </div>

          <div className="p-3 bg-bg-secondary rounded-lg border border-border">
            <div className="text-xs text-text-tertiary mb-1">Data URI (for inline use)</div>
            <div className="text-xs font-mono text-text-primary break-all max-h-[60px] overflow-auto">
              {imageUrl.substring(0, 100)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


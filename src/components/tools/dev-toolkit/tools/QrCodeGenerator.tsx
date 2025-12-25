import { Copy, Trash2, Check, Download, QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

const ERROR_LEVELS: Array<{ value: ErrorCorrectionLevel; label: string; desc: string }> = [
  { value: "L", label: "Low", desc: "~7% recovery" },
  { value: "M", label: "Medium", desc: "~15% recovery" },
  { value: "Q", label: "Quartile", desc: "~25% recovery" },
  { value: "H", label: "High", desc: "~30% recovery" },
];

export function QrCodeGenerator() {
  const [input, setInput] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(256);
  const [errorLevel, setErrorLevel] = useState<ErrorCorrectionLevel>("M");
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!input.trim()) {
      setQrDataUrl(null);
      setError(null);
      return;
    }

    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(input, {
          width: size,
          margin: 2,
          errorCorrectionLevel: errorLevel,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        });
        setQrDataUrl(dataUrl);
        setError(null);
      } catch (e) {
        setError(`Failed to generate QR code: ${(e as Error).message}`);
        setQrDataUrl(null);
      }
    };

    generateQR();
  }, [input, size, errorLevel, darkColor, lightColor]);

  const handleClear = () => {
    setInput("");
    setQrDataUrl(null);
    setError(null);
  };

  const handleCopyImage = async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const img = document.createElement("img");
      img.src = qrDataUrl;
      document.body.appendChild(img);
      const range = document.createRange();
      range.selectNode(img);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand("copy");
      window.getSelection()?.removeAllRanges();
      document.body.removeChild(img);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Text or URL
          </label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text, URL, or data to encode..."
          className={cn(
            "min-h-[80px] resize-y font-mono text-sm",
            "bg-bg-primary border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            error ? "border-red-500/50" : "border-border"
          )}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handlePaste} variant="primary" size="sm">
          Paste from Clipboard
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
          <div className="text-xs text-text-tertiary uppercase tracking-wider">
            Options
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary">Size</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={128}
                max={512}
                step={32}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-xs text-text-tertiary w-12">{size}px</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary">Error Correction</label>
            <div className="flex gap-1">
              {ERROR_LEVELS.map((level) => (
                <Tooltip key={level.value} content={level.desc}>
                  <button
                    onClick={() => setErrorLevel(level.value)}
                    className={cn(
                      "flex-1 px-2 py-1 text-xs rounded transition-colors",
                      errorLevel === level.value
                        ? "bg-accent text-primary-950"
                        : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                    )}
                  >
                    {level.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs text-text-secondary">Dark Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs font-mono bg-bg-primary border border-border rounded"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs text-text-secondary">Light Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs font-mono bg-bg-primary border border-border rounded"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-secondary border border-border">
          {qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="max-w-full max-h-48 rounded"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="flex items-center gap-2 mt-4">
                <Tooltip content={copied ? "Copied!" : "Copy image"}>
                  <IconButton size="sm" onClick={handleCopyImage}>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip content="Download PNG">
                  <IconButton size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-tertiary">
              <QrCode className="w-12 h-12" />
              <span className="text-sm">QR code preview</span>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {input && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border">
          <div className="text-xs text-text-tertiary mb-1">
            Character count: {input.length}
          </div>
          <div className="text-xs text-text-tertiary">
            Data capacity varies by error correction level. Higher correction = less capacity.
          </div>
        </div>
      )}
    </div>
  );
}

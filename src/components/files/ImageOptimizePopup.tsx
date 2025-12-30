import { useState, useEffect, useCallback } from "react";
import { ImageMinus, Loader2, Check, ArrowRight } from "lucide-react";
import { Popup } from "@/components/ui/Popup/Popup";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { useCompression } from "@/hooks/useCompression";
import { formatBytes } from "@/lib/storageUtils";
import type { ImageEstimateResult, CompressionResult } from "@/types/compression";

interface ImageOptimizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onOptimized?: () => void;
}

type PopupState = "estimating" | "ready" | "optimizing" | "done" | "error";

export function ImageOptimizePopup({
  isOpen,
  onClose,
  filePath,
  onOptimized,
}: ImageOptimizePopupProps) {
  const { estimateImageOptimization, optimizeImage } = useCompression();

  const [state, setState] = useState<PopupState>("estimating");
  const [quality, setQuality] = useState(85);
  const [overwrite, setOverwrite] = useState(false);
  const [convertToWebp, setConvertToWebp] = useState(false);
  const [estimate, setEstimate] = useState<ImageEstimateResult | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;

  const fetchEstimate = useCallback(async (q: number, toWebp: boolean) => {
    if (!filePath) return;
    try {
      const est = await estimateImageOptimization(filePath, q, toWebp);
      setEstimate(est);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, [filePath, estimateImageOptimization]);

  useEffect(() => {
    if (isOpen && filePath) {
      setState("estimating");
      setResult(null);
      setError(null);
      setConvertToWebp(false);
      fetchEstimate(quality, false);
    }
  }, [isOpen, filePath]);

  const handleQualityChange = useCallback((newQuality: number) => {
    setQuality(newQuality);
    // Only re-fetch if quality affects the output
    if (estimate?.supportsQuality || convertToWebp) {
      fetchEstimate(newQuality, convertToWebp);
    }
  }, [estimate?.supportsQuality, convertToWebp, fetchEstimate]);

  const handleWebpToggle = useCallback((toWebp: boolean) => {
    setConvertToWebp(toWebp);
    setState("estimating");
    fetchEstimate(quality, toWebp);
  }, [quality, fetchEstimate]);

  const handleOptimize = async () => {
    setState("optimizing");
    try {
      const res = await optimizeImage(filePath, {
        overwrite: convertToWebp ? false : overwrite, // Can't overwrite when converting format
        quality: (estimate?.supportsQuality || convertToWebp) ? quality : undefined,
        convertToWebp,
      });
      setResult(res);
      setState("done");
      onOptimized?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  };

  const handleClose = () => {
    setState("estimating");
    setEstimate(null);
    setResult(null);
    setError(null);
    setQuality(85);
    setOverwrite(false);
    setConvertToWebp(false);
    onClose();
  };

  // Show quality slider if format supports it OR if converting to WebP
  const showQualitySlider = estimate?.supportsQuality || convertToWebp;

  return (
    <Popup isOpen={isOpen} onClose={handleClose} size="small">
      <Popup.Header icon={ImageMinus} title="Optimize Image" subtitle={fileName} />

      <Popup.Content scrollable={false} padding="md">
        {state === "estimating" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
            <span className="ml-2 text-sm text-text-tertiary">Analyzing image...</span>
          </div>
        )}

        {state === "error" && (
          <div className="py-4">
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}

        {(state === "ready" || state === "optimizing") && estimate && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-md bg-bg-tertiary">
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">Original</div>
                <div className="text-sm font-medium text-text-primary">
                  {formatBytes(estimate.originalSize)}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary" />
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">Estimated</div>
                <div className="text-sm font-medium text-text-primary">
                  {formatBytes(estimate.estimatedSize)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">Savings</div>
                <div className={`text-sm font-medium ${
                  estimate.estimatedSavingsPercent > 0
                    ? "text-accent-green"
                    : "text-text-tertiary"
                }`}>
                  {estimate.estimatedSavingsPercent > 0
                    ? `${estimate.estimatedSavingsPercent.toFixed(1)}%`
                    : "0%"}
                </div>
              </div>
            </div>

            {/* Convert to WebP toggle - only show if format can be converted */}
            {estimate.canConvertToWebp && (
              <Toggle
                label="Convert to WebP (better compression)"
                labelPosition="right"
                checked={convertToWebp}
                onChange={handleWebpToggle}
                disabled={state === "optimizing"}
                size="sm"
              />
            )}

            {/* Quality slider - show if format supports quality OR converting to WebP */}
            {showQualitySlider && (
              <Slider
                label="Quality"
                value={quality}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={handleQualityChange}
                disabled={state === "optimizing"}
              />
            )}

            {/* Info message for lossless formats */}
            {!showQualitySlider && (
              <p className="text-xs text-text-tertiary">
                {estimate.format} uses lossless compression. Enable WebP conversion for quality control.
              </p>
            )}

            {/* Overwrite toggle - disabled when converting to WebP (can't overwrite with different format) */}
            <Toggle
              label={convertToWebp ? "Creates new .webp file" : "Overwrite original file"}
              labelPosition="right"
              checked={convertToWebp ? false : overwrite}
              onChange={setOverwrite}
              disabled={state === "optimizing" || convertToWebp}
              size="sm"
            />
          </div>
        )}

        {state === "done" && result && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-accent-green" />
              </div>
              <span className="text-sm font-medium text-text-primary">
                Optimization Complete
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-bg-tertiary">
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">Before</div>
                <div className="text-sm font-medium text-text-primary">
                  {formatBytes(result.originalSize)}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary" />
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">After</div>
                <div className="text-sm font-medium text-text-primary">
                  {formatBytes(result.compressedSize)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-tertiary mb-1">Saved</div>
                <div className="text-sm font-medium text-accent-green">
                  {result.savingsPercent > 0
                    ? `${result.savingsPercent.toFixed(1)}%`
                    : "0%"}
                </div>
              </div>
            </div>

            {!overwrite && (
              <p className="text-xs text-text-tertiary text-center">
                Saved as: {result.outputPath.split("/").pop()}
              </p>
            )}
          </div>
        )}
      </Popup.Content>

      <Popup.Footer
        right={
          <>
            {state === "done" ? (
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose} disabled={state === "optimizing"}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleOptimize}
                  disabled={state !== "ready" || !estimate}
                >
                  {state === "optimizing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    "Optimize"
                  )}
                </Button>
              </>
            )}
          </>
        }
      />
    </Popup>
  );
}

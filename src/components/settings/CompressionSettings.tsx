import { Archive, ImageMinus, Info } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { Toggle } from "@/components/ui/Toggle";

export function CompressionSettings() {
  const {
    compressionArchiveOverwrite,
    compressionMediaOverwrite,
    setCompressionArchiveOverwrite,
    setCompressionMediaOverwrite,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Compression Settings
      </h2>

      {/* Archive Compression Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2 flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Archive Compression
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Overwrite Original
            </label>
            <p className="text-xs text-text-secondary">
              Replace existing archive if one exists with the same name
            </p>
          </div>
          <Toggle
            checked={compressionArchiveOverwrite}
            onChange={setCompressionArchiveOverwrite}
            size="sm"
          />
        </div>
      </div>

      {/* Media Optimization Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2 flex items-center gap-2">
          <ImageMinus className="w-4 h-4" />
          Media Optimization
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Overwrite Original
            </label>
            <p className="text-xs text-text-secondary">
              Replace original files when optimizing (otherwise creates _optimized suffix)
            </p>
          </div>
          <Toggle
            checked={compressionMediaOverwrite}
            onChange={setCompressionMediaOverwrite}
            size="sm"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Supported Formats
        </h3>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>
            <span className="font-medium text-text-primary">Archives:</span> Creates .zip files from any files or folders
          </li>
          <li>
            <span className="font-medium text-text-primary">Images:</span> PNG, JPEG, GIF, WebP (lossless optimization)
          </li>
          <li>
            <span className="font-medium text-text-primary">PDFs:</span> Removes unused objects, optimizes streams
          </li>
          <li>
            <span className="font-medium text-text-primary">Videos:</span> MP4, MOV, AVI, MKV, WebM (requires ffmpeg)
          </li>
        </ul>
      </div>
    </div>
  );
}

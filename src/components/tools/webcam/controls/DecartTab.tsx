import { useState } from "react";
import type { DecartSettings, DecartUsage } from "../types";
import { DECART_STYLE_EFFECTS, DECART_COST_PER_SECOND } from "../types";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Eye, EyeOff, Upload, Zap, ExternalLink, Wand2 } from "lucide-react";

interface DecartTabProps {
  settings: DecartSettings;
  onSettingsChange: (settings: Partial<DecartSettings>) => void;
  isConnected: boolean;
  usage: DecartUsage;
  onConnect: () => void;
  onDisconnect: () => void;
}

const BACKGROUND_EFFECTS = [
  { value: "none" as const, label: "None" },
  { value: "blur" as const, label: "Blur Background" },
  { value: "replace" as const, label: "Replace Background" },
];

export function DecartTab({
  settings,
  onSettingsChange,
  isConnected,
  usage,
  onConnect,
  onDisconnect,
}: DecartTabProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const handleBackgroundImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSettingsChange({ backgroundImage: url });
    }
  };

  return (
    <OverlayScrollbarsComponent
      className="h-full"
      options={{ scrollbars: { autoHide: "scroll" } }}
    >
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            <span className="font-medium text-text-primary">
              Enable Decart AI
            </span>
          </div>
          <Toggle
            checked={settings.enabled}
            onChange={(checked) => onSettingsChange({ enabled: checked })}
          />
        </div>

        <div className="bg-bg-tertiary/50 border border-border rounded-lg p-3">
          <p className="text-xs text-text-tertiary mb-2">
            Real-time AI video transformation powered by Decart
          </p>
          <a
            href="https://docs.platform.decart.ai/getting-started/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Get API Key <ExternalLink size={12} />
          </a>
        </div>

        <div>
          <label className="block text-xs text-text-tertiary mb-1">
            Decart API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => onSettingsChange({ apiKey: e.target.value })}
              placeholder="Enter your API key..."
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 pr-10 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            Cost: ${DECART_COST_PER_SECOND}/sec for realtime at 720p
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-text-secondary">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex-1" />
          <Button
            size="sm"
            variant={isConnected ? "outline" : "primary"}
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={!settings.apiKey || !settings.enabled}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>

        {isConnected && usage.sessionStartTime && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Session Cost:</span>
              <span className="text-green-400 font-mono">
                ${usage.costUsd.toFixed(3)}
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Style Transfer
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSettingsChange({ activeEffect: null })}
              disabled={!isConnected}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                settings.activeEffect === null && !settings.customPrompt
                  ? "bg-accent text-primary-950"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              No Effect
            </button>
            {DECART_STYLE_EFFECTS.map((effect) => (
              <button
                key={effect.id}
                onClick={() => onSettingsChange({ activeEffect: effect.id, customPrompt: "" })}
                disabled={!isConnected}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  settings.activeEffect === effect.id && !settings.customPrompt
                    ? "bg-accent text-primary-950"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {effect.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={14} className="text-accent" />
              <label className="text-xs text-text-tertiary">Custom Style Prompt</label>
            </div>
            <textarea
              value={settings.customPrompt}
              onChange={(e) => onSettingsChange({ customPrompt: e.target.value, activeEffect: null })}
              placeholder="Describe your own style, e.g. 'cyberpunk neon glow', 'impressionist painting', 'vaporwave aesthetic'..."
              disabled={!isConnected}
              rows={3}
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <p className="text-xs text-text-tertiary/70 mt-1">
              Use a custom prompt instead of preset styles
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Background Effect
          </h3>
          <select
            value={settings.backgroundEffect}
            onChange={(e) =>
              onSettingsChange({
                backgroundEffect: e.target.value as "none" | "blur" | "replace",
              })
            }
            disabled={!isConnected}
            className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {BACKGROUND_EFFECTS.map((effect) => (
              <option key={effect.value} value={effect.value}>
                {effect.label}
              </option>
            ))}
          </select>

          {settings.backgroundEffect === "replace" && (
            <div className="mt-3">
              <label className="block text-xs text-text-tertiary mb-1">
                Background Image
              </label>
              {settings.backgroundImage ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-secondary truncate">
                    Background image loaded
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSettingsChange({ backgroundImage: null })}
                    disabled={!isConnected}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex items-center justify-center gap-2 w-full px-3 py-2 bg-bg-tertiary border border-dashed border-border rounded-md cursor-pointer hover:bg-bg-secondary transition-colors ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Upload size={16} className="text-text-tertiary" />
                  <span className="text-sm text-text-secondary">
                    Upload Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className="hidden"
                    disabled={!isConnected}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </OverlayScrollbarsComponent>
  );
}

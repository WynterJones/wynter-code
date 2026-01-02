import { useState } from "react";
import { Key, ExternalLink, Check, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/stores/settingsStore";
import { testApiKey } from "@/services/geminiImageService";

interface ApiKeySetupProps {
  onComplete: () => void;
}

export function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const { geminiImageApiKey, setGeminiImageApiKey } = useSettingsStore();
  const [apiKey, setApiKey] = useState(geminiImageApiKey);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const isValid = await testApiKey(apiKey.trim());
      if (isValid) {
        setGeminiImageApiKey(apiKey.trim());
        onComplete();
      } else {
        setError("Invalid API key. Please check and try again.");
      }
    } catch (error) {
      setError("Failed to validate API key. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Key className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Set Up Gemini API</h2>
            <p className="text-text-secondary mt-2">
              To generate images with AI, you need a Google Gemini API key.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 pr-10 bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isValidating || !apiKey.trim()}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save API Key
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-accent hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Get a free API key from Google AI Studio
          </a>
        </div>
      </div>
    </div>
  );
}

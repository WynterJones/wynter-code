import { Copy, Check, Key } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

type Algorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

const ALGORITHMS: Algorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function generateHmac(message: string, key: string, algorithm: Algorithm): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function HmacGenerator() {
  const [message, setMessage] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [algorithm, setAlgorithm] = useState<Algorithm>("SHA-256");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!message || !secretKey) return;

    try {
      const hmac = await generateHmac(message, secretKey, algorithm);
      setResult(hmac);
      setError(null);
    } catch (error) {
      setError(`Error: ${(error as Error).message}`);
      setResult("");
    }
  }, [message, secretKey, algorithm]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign..."
          className={cn(
            "min-h-[80px] resize-y text-sm font-mono",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Secret Key</label>
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter secret key..."
            className={cn(
              "flex-1 px-3 py-2 text-sm font-mono",
              "bg-bg-primary border border-border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <span className="text-xs text-text-secondary">Algorithm:</span>
        <div className="flex gap-1">
          {ALGORITHMS.map((algo) => (
            <button
              key={algo}
              onClick={() => setAlgorithm(algo)}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                algorithm === algo
                  ? "bg-accent text-primary-950"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              )}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        variant="primary"
        size="sm"
        disabled={!message || !secretKey}
      >
        <Key className="w-3.5 h-3.5 mr-1.5" />
        Generate HMAC
      </Button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">HMAC-{algorithm}</span>
            <Tooltip content={copied ? "Copied!" : "Copy"}>
              <IconButton size="sm" onClick={handleCopy} aria-label="Copy HMAC">
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </IconButton>
            </Tooltip>
          </div>
          <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border">
            <code className="font-mono text-sm text-text-primary break-all select-all">
              {result}
            </code>
          </div>
          <div className="text-xs text-text-tertiary">
            Length: {result.length} characters ({result.length * 4} bits)
          </div>
        </div>
      )}
    </div>
  );
}

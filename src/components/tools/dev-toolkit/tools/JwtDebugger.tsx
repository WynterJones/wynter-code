import {
  Copy,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useCopyWithFeedback } from "@/hooks/useCopyWithFeedback";

interface JwtPart {
  label: string;
  data: Record<string, unknown> | null;
  error: string | null;
  color: string;
}

interface DecodedJwt {
  header: JwtPart;
  payload: JwtPart;
  signature: string;
  isValid: boolean;
  expiration: {
    isExpired: boolean;
    expiresAt: Date | null;
    issuedAt: Date | null;
  };
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function parseJwt(token: string): DecodedJwt | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;

  const header: JwtPart = {
    label: "Header",
    data: null,
    error: null,
    color: "text-pink-400",
  };
  const payload: JwtPart = {
    label: "Payload",
    data: null,
    error: null,
    color: "text-purple-400",
  };

  try {
    header.data = JSON.parse(decodeBase64Url(headerB64));
  } catch (error) {
    header.error = "Invalid header encoding";
  }

  try {
    payload.data = JSON.parse(decodeBase64Url(payloadB64));
  } catch (error) {
    payload.error = "Invalid payload encoding";
  }

  const expiration = {
    isExpired: false,
    expiresAt: null as Date | null,
    issuedAt: null as Date | null,
  };

  if (payload.data) {
    const exp = payload.data.exp as number | undefined;
    const iat = payload.data.iat as number | undefined;

    if (exp) {
      expiration.expiresAt = new Date(exp * 1000);
      expiration.isExpired = Date.now() > exp * 1000;
    }
    if (iat) {
      expiration.issuedAt = new Date(iat * 1000);
    }
  }

  return {
    header,
    payload,
    signature,
    isValid: !header.error && !payload.error,
    expiration,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function JwtDebugger() {
  const [input, setInput] = useState("");
  const { copy, isCopied } = useCopyWithFeedback();

  const decoded = useMemo(() => {
    if (!input.trim()) return null;
    return parseJwt(input);
  }, [input]);

  const handleClear = () => {
    setInput("");
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const renderSection = (part: JwtPart) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", part.color)}>{part.label}</span>
        {part.data && (
          <Tooltip content={isCopied(part.label) ? "Copied!" : "Copy JSON"}>
            <IconButton
              size="sm"
              onClick={() =>
                copy(JSON.stringify(part.data, null, 2), part.label)
              }
              aria-label={`Copy ${part.label} as JSON`}
            >
              {isCopied(part.label) ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </div>
      {part.error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{part.error}</span>
        </div>
      ) : (
        <pre className="text-sm font-mono bg-bg-tertiary/50 rounded-lg p-3 overflow-auto max-h-48 text-text-primary">
          {JSON.stringify(part.data, null, 2)}
        </pre>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            JWT Token
          </label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear input">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT token here (eyJhbG...)"
          className={cn(
            "min-h-[100px] resize-y font-mono text-sm",
            "bg-bg-primary border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            decoded && !decoded.isValid
              ? "border-red-500/50"
              : "border-border"
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handlePaste} variant="primary" size="sm">
          Paste from Clipboard
        </Button>
      </div>

      {decoded && (
        <div className="flex flex-col gap-4 flex-1 overflow-auto">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
            {decoded.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm text-text-primary">
              {decoded.isValid ? "Valid JWT structure" : "Invalid JWT structure"}
            </span>
          </div>

          {decoded.expiration.expiresAt && (
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                decoded.expiration.isExpired
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-green-500/10 border-green-500/30"
              )}
            >
              <Clock
                className={cn(
                  "w-5 h-5",
                  decoded.expiration.isExpired ? "text-red-400" : "text-green-400"
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    decoded.expiration.isExpired ? "text-red-400" : "text-green-400"
                  )}
                >
                  {decoded.expiration.isExpired ? "Token Expired" : "Token Valid"}
                </span>
                <span className="text-xs text-text-secondary">
                  {decoded.expiration.isExpired ? "Expired" : "Expires"}:{" "}
                  {formatDate(decoded.expiration.expiresAt)}
                </span>
                {decoded.expiration.issuedAt && (
                  <span className="text-xs text-text-tertiary">
                    Issued: {formatDate(decoded.expiration.issuedAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {renderSection(decoded.header)}
          {renderSection(decoded.payload)}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cyan-400">Signature</span>
              <Tooltip content={isCopied("sig") ? "Copied!" : "Copy"}>
                <IconButton
                  size="sm"
                  onClick={() => copy(decoded.signature, "sig")}
                  aria-label="Copy signature"
                >
                  {isCopied("sig") ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
            <pre className="text-sm font-mono bg-bg-tertiary/50 rounded-lg p-3 overflow-auto text-text-tertiary break-all">
              {decoded.signature}
            </pre>
          </div>
        </div>
      )}

      {!decoded && input.trim() && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-400">
            Invalid JWT format. A JWT should have 3 parts separated by dots.
          </span>
        </div>
      )}
    </div>
  );
}

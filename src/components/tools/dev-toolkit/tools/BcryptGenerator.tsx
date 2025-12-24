import { Copy, Check, Lock, Unlock, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import bcrypt from "bcryptjs";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

export function BcryptGenerator() {
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [saltRounds, setSaltRounds] = useState(10);
  const [copied, setCopied] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const handleHash = useCallback(async () => {
    if (!password) return;
    setIsHashing(true);
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      const hashed = await bcrypt.hash(password, salt);
      setHash(hashed);
    } catch (e) {
      setHash(`Error: ${(e as Error).message}`);
    }
    setIsHashing(false);
  }, [password, saltRounds]);

  const handleVerify = useCallback(async () => {
    if (!verifyPassword || !verifyHash) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await bcrypt.compare(verifyPassword, verifyHash);
      setVerifyResult(result);
    } catch {
      setVerifyResult(false);
    }
    setIsVerifying(false);
  }, [verifyPassword, verifyHash]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex flex-col gap-4 p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Generate Hash</span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-secondary">Password to hash</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
            className={cn(
              "px-3 py-2 text-sm font-mono",
              "bg-bg-primary border border-border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Salt rounds:</label>
            <input
              type="number"
              min={4}
              max={16}
              value={saltRounds}
              onChange={(e) => setSaltRounds(Math.max(4, Math.min(16, parseInt(e.target.value) || 10)))}
              className="w-16 px-2 py-1 text-sm bg-bg-primary border border-border rounded text-center"
            />
          </div>
          <span className="text-xs text-text-tertiary">
            (higher = slower but more secure, recommended: 10-12)
          </span>
        </div>

        <Button onClick={handleHash} variant="primary" size="sm" disabled={!password || isHashing}>
          {isHashing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Hashing...
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Generate Hash
            </>
          )}
        </Button>

        {hash && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-tertiary/50">
            <code className="flex-1 font-mono text-sm text-text-primary break-all select-all">
              {hash}
            </code>
            <Tooltip content={copied ? "Copied!" : "Copy"}>
              <IconButton size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <Unlock className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Verify Hash</span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-secondary">Password</label>
          <input
            type="text"
            value={verifyPassword}
            onChange={(e) => {
              setVerifyPassword(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="Enter password to verify..."
            className={cn(
              "px-3 py-2 text-sm font-mono",
              "bg-bg-primary border border-border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-secondary">Hash</label>
          <input
            type="text"
            value={verifyHash}
            onChange={(e) => {
              setVerifyHash(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="Enter bcrypt hash..."
            className={cn(
              "px-3 py-2 text-sm font-mono",
              "bg-bg-primary border border-border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleVerify}
            variant="primary"
            size="sm"
            disabled={!verifyPassword || !verifyHash || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 mr-1.5" />
                Verify
              </>
            )}
          </Button>

          {verifyResult !== null && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                verifyResult
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              )}
            >
              {verifyResult ? (
                <>
                  <Check className="w-4 h-4" />
                  Password matches!
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Password does not match
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

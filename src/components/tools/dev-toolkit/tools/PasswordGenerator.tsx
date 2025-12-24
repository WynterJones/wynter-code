import { Copy, Check, RefreshCw, Shield } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  uppercaseNoAmbig: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  lowercaseNoAmbig: "abcdefghjkmnpqrstuvwxyz",
  numbers: "0123456789",
  numbersNoAmbig: "23456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

function generatePassword(options: PasswordOptions): string {
  let chars = "";

  if (options.uppercase) {
    chars += options.excludeAmbiguous ? CHAR_SETS.uppercaseNoAmbig : CHAR_SETS.uppercase;
  }
  if (options.lowercase) {
    chars += options.excludeAmbiguous ? CHAR_SETS.lowercaseNoAmbig : CHAR_SETS.lowercase;
  }
  if (options.numbers) {
    chars += options.excludeAmbiguous ? CHAR_SETS.numbersNoAmbig : CHAR_SETS.numbers;
  }
  if (options.symbols) {
    chars += CHAR_SETS.symbols;
  }

  if (!chars) return "";

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((n) => chars[n % chars.length])
    .join("");
}

function calculateStrength(password: string, options: PasswordOptions): { score: number; label: string; color: string } {
  let poolSize = 0;
  if (options.uppercase) poolSize += 26;
  if (options.lowercase) poolSize += 26;
  if (options.numbers) poolSize += 10;
  if (options.symbols) poolSize += 26;

  const entropy = password.length * Math.log2(poolSize || 1);

  if (entropy < 28) return { score: 1, label: "Very Weak", color: "bg-red-500" };
  if (entropy < 36) return { score: 2, label: "Weak", color: "bg-orange-500" };
  if (entropy < 60) return { score: 3, label: "Fair", color: "bg-yellow-500" };
  if (entropy < 128) return { score: 4, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Very Strong", color: "bg-emerald-500" };
}

export function PasswordGenerator() {
  const [passwords, setPasswords] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [copied, setCopied] = useState<number | null>(null);

  const handleGenerate = useCallback(() => {
    const newPasswords: string[] = [];
    for (let i = 0; i < count; i++) {
      newPasswords.push(generatePassword(options));
    }
    setPasswords(newPasswords);
  }, [options, count]);

  const handleCopy = async (password: string, index: number) => {
    await navigator.clipboard.writeText(password);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const strength = passwords[0] ? calculateStrength(passwords[0], options) : null;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="col-span-2 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-text-secondary whitespace-nowrap">Length:</label>
            <input
              type="range"
              min={4}
              max={64}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value) })}
              className="flex-1 accent-accent"
            />
            <input
              type="number"
              min={4}
              max={64}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: Math.max(4, Math.min(64, parseInt(e.target.value) || 4)) })}
              className="w-14 px-2 py-1 text-sm bg-bg-primary border border-border rounded text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Count:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-14 px-2 py-1 text-sm bg-bg-primary border border-border rounded text-center"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.uppercase}
            onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Uppercase (A-Z)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.lowercase}
            onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Lowercase (a-z)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.numbers}
            onChange={(e) => setOptions({ ...options, numbers: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Numbers (0-9)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.symbols}
            onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Symbols (!@#$...)</span>
        </label>

        <label className="col-span-2 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.excludeAmbiguous}
            onChange={(e) => setOptions({ ...options, excludeAmbiguous: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Exclude ambiguous (0, O, l, 1, I)</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleGenerate} variant="primary" size="sm">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Generate
        </Button>
        {strength && (
          <div className="flex items-center gap-2 ml-auto">
            <Shield className="w-4 h-4 text-text-secondary" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-6 h-2 rounded-full transition-colors",
                    i <= strength.score ? strength.color : "bg-bg-tertiary"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-text-secondary">{strength.label}</span>
          </div>
        )}
      </div>

      {passwords.length > 0 && (
        <div className="flex flex-col gap-1 flex-1 overflow-auto">
          {passwords.map((password, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
            >
              <code className="flex-1 font-mono text-sm text-text-primary select-all break-all">
                {password}
              </code>
              <Tooltip content={copied === i ? "Copied!" : "Copy"}>
                <IconButton
                  size="sm"
                  onClick={() => handleCopy(password, i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  {copied === i ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {passwords.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Click Generate to create secure passwords
        </div>
      )}
    </div>
  );
}

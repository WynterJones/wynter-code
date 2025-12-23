import { useMemo } from "react";
import { Eye, EyeOff, Shield, Check, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { EnvFile, EnvFileComparison } from "@/types";

interface EnvCompareViewProps {
  files: EnvFile[];
  revealedKeys: Set<string>;
  onReveal: (key: string) => void;
  onHide: (key: string) => void;
}

export function EnvCompareView({
  files,
  revealedKeys,
  onReveal,
  onHide,
}: EnvCompareViewProps) {
  const existingFiles = files.filter((f) => f.exists);

  const comparison = useMemo(() => {
    const allKeys = new Set<string>();
    existingFiles.forEach((file) => {
      file.variables.forEach((v) => allKeys.add(v.key));
    });

    const result: EnvFileComparison[] = [];
    allKeys.forEach((key) => {
      result.push({
        key,
        files: existingFiles.map((file) => {
          const variable = file.variables.find((v) => v.key === key);
          return {
            filename: file.filename,
            value: variable?.value ?? null,
            isSensitive: variable?.isSensitive ?? false,
          };
        }),
      });
    });

    return result.sort((a, b) => a.key.localeCompare(b.key));
  }, [existingFiles]);

  if (existingFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <p>No .env files found in this project</p>
      </div>
    );
  }

  if (existingFiles.length === 1) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <p>Need at least 2 .env files to compare</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium text-text-secondary sticky left-0 bg-bg-secondary">
              Variable
            </th>
            {existingFiles.map((file) => (
              <th
                key={file.filename}
                className="text-left p-2 font-medium text-text-secondary min-w-[150px]"
              >
                {file.filename}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.map((row) => {
            const isRevealed = revealedKeys.has(row.key);
            const hasSensitive = row.files.some((f) => f.isSensitive);

            return (
              <tr
                key={row.key}
                className="border-b border-border/50 hover:bg-bg-tertiary/30"
              >
                <td className="p-2 sticky left-0 bg-bg-secondary">
                  <div className="flex items-center gap-2">
                    {hasSensitive && (
                      <Shield className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                    <span className="font-mono font-semibold text-accent">
                      {row.key}
                    </span>
                    <IconButton
                      size="sm"
                      onClick={() =>
                        isRevealed ? onHide(row.key) : onReveal(row.key)
                      }
                    >
                      {isRevealed ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </IconButton>
                  </div>
                </td>
                {row.files.map((file) => (
                  <td key={file.filename} className="p-2">
                    {file.value !== null ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span
                          className={cn(
                            "font-mono text-xs truncate max-w-[200px]",
                            !isRevealed &&
                              "blur-sm select-none text-text-secondary"
                          )}
                        >
                          {file.value || "(empty)"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-text-secondary/50">
                        <X className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs italic">missing</span>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {comparison.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          No variables defined in any .env file
        </div>
      )}
    </div>
  );
}

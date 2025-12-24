import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MiniToolLayout } from "../MiniToolLayout";

type Mode = "csv-to-json" | "json-to-csv";

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return [];

  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, j) => {
      row[header] = values[j] || "";
    });
    data.push(row);
  }

  return data;
}

function jsonToCsv(json: unknown[]): string {
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error("Input must be a non-empty array of objects");
  }

  const headers = Object.keys(json[0] as Record<string, unknown>);

  const escapeValue = (value: unknown): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(",")];

  for (const item of json) {
    const obj = item as Record<string, unknown>;
    const values = headers.map((h) => escapeValue(obj[h]));
    rows.push(values.join(","));
  }

  return rows.join("\n");
}

export function CsvJsonConverter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("csv-to-json");

  const handleConvert = () => {
    try {
      if (mode === "csv-to-json") {
        const parsed = parseCsv(input);
        setOutput(JSON.stringify(parsed, null, 2));
      } else {
        const parsed = JSON.parse(input);
        setOutput(jsonToCsv(parsed));
      }
      setError(null);
    } catch (e) {
      setError(`Conversion error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleSwap = () => {
    setMode(mode === "csv-to-json" ? "json-to-csv" : "csv-to-json");
    if (output) {
      setInput(output);
      setOutput("");
    }
    setError(null);
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
        <span className={`text-sm font-medium ${mode === "csv-to-json" ? "text-accent" : "text-text-secondary"}`}>
          CSV
        </span>
        <Button onClick={handleSwap} variant="default" size="sm">
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
        <span className={`text-sm font-medium ${mode === "json-to-csv" ? "text-accent" : "text-text-secondary"}`}>
          JSON
        </span>
      </div>

      <MiniToolLayout
        inputLabel={mode === "csv-to-json" ? "CSV Input" : "JSON Input (array of objects)"}
        inputPlaceholder={
          mode === "csv-to-json"
            ? "name,email,age\nJohn,john@example.com,30"
            : '[{"name": "John", "email": "john@example.com", "age": 30}]'
        }
        outputLabel={mode === "csv-to-json" ? "JSON Output" : "CSV Output"}
        value={input}
        onChange={setInput}
        output={output}
        error={error}
        onClear={handleClear}
        actions={[{ label: "Convert", onClick: handleConvert, variant: "primary" }]}
      />
    </div>
  );
}

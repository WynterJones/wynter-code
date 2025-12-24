import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { Button } from "@/components/ui/Button";
import { MiniToolLayout } from "../MiniToolLayout";

type Mode = "json-to-yaml" | "yaml-to-json";

export function JsonYamlConverter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("json-to-yaml");

  const handleConvert = () => {
    try {
      if (mode === "json-to-yaml") {
        const parsed = JSON.parse(input);
        setOutput(stringifyYaml(parsed, { indent: 2 }));
      } else {
        const parsed = parseYaml(input);
        setOutput(JSON.stringify(parsed, null, 2));
      }
      setError(null);
    } catch (e) {
      setError(`Conversion error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleSwap = () => {
    setMode(mode === "json-to-yaml" ? "yaml-to-json" : "json-to-yaml");
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
        <span className={`text-sm font-medium ${mode === "json-to-yaml" ? "text-accent" : "text-text-secondary"}`}>
          JSON
        </span>
        <Button onClick={handleSwap} variant="default" size="sm">
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
        <span className={`text-sm font-medium ${mode === "yaml-to-json" ? "text-accent" : "text-text-secondary"}`}>
          YAML
        </span>
      </div>

      <MiniToolLayout
        inputLabel={mode === "json-to-yaml" ? "JSON Input" : "YAML Input"}
        inputPlaceholder={mode === "json-to-yaml" ? '{"key": "value"}' : "key: value"}
        outputLabel={mode === "json-to-yaml" ? "YAML Output" : "JSON Output"}
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

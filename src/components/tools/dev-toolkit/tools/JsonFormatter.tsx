import { useState } from "react";
import { MiniToolLayout } from "../MiniToolLayout";

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (error) {
      setError(`Invalid JSON: ${(error as Error).message}`);
      setOutput("");
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (error) {
      setError(`Invalid JSON: ${(error as Error).message}`);
      setOutput("");
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(input);
      setOutput("Valid JSON");
      setError(null);
    } catch (error) {
      setError(`Invalid JSON: ${(error as Error).message}`);
      setOutput("");
    }
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <MiniToolLayout
      inputLabel="JSON Input"
      inputPlaceholder='{"key": "value"}'
      outputLabel="Formatted Output"
      value={input}
      onChange={setInput}
      output={output}
      error={error}
      onClear={handleClear}
      actions={[
        { label: "Format", onClick: handleFormat, variant: "primary" },
        { label: "Minify", onClick: handleMinify },
        { label: "Validate", onClick: handleValidate },
      ]}
    />
  );
}

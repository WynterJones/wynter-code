import { useState } from "react";
import { MiniToolLayout } from "../MiniToolLayout";

export function UrlEncodeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      setOutput(encodeURIComponent(input));
      setError(null);
    } catch (e) {
      setError("Failed to encode: " + (e as Error).message);
      setOutput("");
    }
  };

  const handleDecode = () => {
    try {
      setOutput(decodeURIComponent(input));
      setError(null);
    } catch (e) {
      setError("Invalid URL-encoded string");
      setOutput("");
    }
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <MiniToolLayout
      inputLabel="URL Input"
      inputPlaceholder="Enter URL to encode or encoded string to decode..."
      outputLabel="Result"
      value={input}
      onChange={setInput}
      output={output}
      error={error}
      onClear={handleClear}
      actions={[
        { label: "Encode", onClick: handleEncode, variant: "primary" },
        { label: "Decode", onClick: handleDecode },
      ]}
    />
  );
}

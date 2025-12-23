import { useState } from "react";
import { MiniToolLayout } from "../MiniToolLayout";

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(input)));
      setOutput(encoded);
      setError(null);
    } catch (e) {
      setError("Failed to encode: " + (e as Error).message);
      setOutput("");
    }
  };

  const handleDecode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(input)));
      setOutput(decoded);
      setError(null);
    } catch (e) {
      setError("Invalid Base64 string");
      setOutput("");
    }
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <MiniToolLayout
      inputLabel="Text Input"
      inputPlaceholder="Enter text to encode or Base64 to decode..."
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

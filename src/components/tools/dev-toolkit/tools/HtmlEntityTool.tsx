import { useState } from "react";
import { MiniToolLayout } from "../MiniToolLayout";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
  " ": "&nbsp;",
  "©": "&copy;",
  "®": "&reg;",
  "™": "&trade;",
  "€": "&euro;",
  "£": "&pound;",
  "¥": "&yen;",
  "¢": "&cent;",
  "§": "&sect;",
  "°": "&deg;",
  "±": "&plusmn;",
  "×": "&times;",
  "÷": "&divide;",
  "←": "&larr;",
  "→": "&rarr;",
  "↑": "&uarr;",
  "↓": "&darr;",
  "↔": "&harr;",
  "♠": "&spades;",
  "♣": "&clubs;",
  "♥": "&hearts;",
  "♦": "&diams;",
};


function encodeHtmlEntities(text: string, encodeAll: boolean = false): string {
  if (encodeAll) {
    return text
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code > 127 || HTML_ENTITIES[char]) {
          return HTML_ENTITIES[char] || `&#${code};`;
        }
        return char;
      })
      .join("");
  }

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function encodeToNumericEntities(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code > 127 || /[&<>"'`=/]/.test(char)) {
        return `&#${code};`;
      }
      return char;
    })
    .join("");
}

function encodeToHexEntities(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code > 127 || /[&<>"'`=/]/.test(char)) {
        return `&#x${code.toString(16).toUpperCase()};`;
      }
      return char;
    })
    .join("");
}

export function HtmlEntityTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      setOutput(encodeHtmlEntities(input));
      setError(null);
    } catch (e) {
      setError(`Encoding error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleEncodeAll = () => {
    try {
      setOutput(encodeHtmlEntities(input, true));
      setError(null);
    } catch (e) {
      setError(`Encoding error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleDecode = () => {
    try {
      setOutput(decodeHtmlEntities(input));
      setError(null);
    } catch (e) {
      setError(`Decoding error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleNumeric = () => {
    try {
      setOutput(encodeToNumericEntities(input));
      setError(null);
    } catch (e) {
      setError(`Encoding error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleHex = () => {
    try {
      setOutput(encodeToHexEntities(input));
      setError(null);
    } catch (e) {
      setError(`Encoding error: ${(e as Error).message}`);
      setOutput("");
    }
  };

  const handleClear = () => {
    setOutput("");
    setError(null);
  };

  return (
    <MiniToolLayout
      inputLabel="HTML / Text Input"
      inputPlaceholder='<div class="test">Hello & World</div>'
      outputLabel="Result"
      value={input}
      onChange={setInput}
      output={output}
      error={error}
      onClear={handleClear}
      actions={[
        { label: "Encode", onClick: handleEncode, variant: "primary" },
        { label: "Encode All", onClick: handleEncodeAll },
        { label: "Decode", onClick: handleDecode },
        { label: "Numeric", onClick: handleNumeric },
        { label: "Hex", onClick: handleHex },
      ]}
    />
  );
}

import { Copy, Check, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
  "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
  "quas", "molestias", "excepturi", "obcaecati", "cupiditate", "provident",
];

type GenerateType = "paragraphs" | "sentences" | "words";

function generateWords(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  return words.join(" ");
}

function generateSentence(): string {
  const wordCount = 8 + Math.floor(Math.random() * 12);
  const words = generateWords(wordCount).split(" ");
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function generateParagraph(): string {
  const sentenceCount = 4 + Math.floor(Math.random() * 4);
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence());
  }
  return sentences.join(" ");
}

function generate(type: GenerateType, count: number, startWithLorem: boolean): string {
  let result: string;

  switch (type) {
    case "words":
      result = generateWords(count);
      break;
    case "sentences": {
      const sentences: string[] = [];
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence());
      }
      result = sentences.join(" ");
      break;
    }
    case "paragraphs": {
      const paragraphs: string[] = [];
      for (let i = 0; i < count; i++) {
        paragraphs.push(generateParagraph());
      }
      result = paragraphs.join("\n\n");
      break;
    }
  }

  if (startWithLorem && result.length > 0) {
    const loremStart = "Lorem ipsum dolor sit amet";
    if (type === "words") {
      const words = result.split(" ");
      const loremWords = loremStart.toLowerCase().split(" ");
      for (let i = 0; i < Math.min(loremWords.length, words.length); i++) {
        words[i] = loremWords[i];
      }
      result = words.join(" ");
    } else {
      result = loremStart + result.slice(result.indexOf(" ", 20) || 20);
    }
  }

  return result;
}

export function LoremIpsumGenerator() {
  const [output, setOutput] = useState("");
  const [type, setType] = useState<GenerateType>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    setOutput(generate(type, count, startWithLorem));
  }, [type, count, startWithLorem]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Type:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as GenerateType)}
            className="px-2 py-1 text-sm bg-bg-primary border border-border rounded"
          >
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Count:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-sm bg-bg-primary border border-border rounded"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={startWithLorem}
            onChange={(e) => setStartWithLorem(e.target.checked)}
            className="accent-accent"
          />
          <span className="text-xs text-text-secondary">Start with "Lorem ipsum"</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleGenerate} variant="primary" size="sm">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Generate
        </Button>
      </div>

      {output && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Generated Text</span>
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
          <textarea
            value={output}
            readOnly
            className={cn(
              "flex-1 min-h-[200px] resize-y text-sm",
              "bg-bg-tertiary/50 border border-border rounded-lg p-3",
              "focus:outline-none"
            )}
          />
        </div>
      )}
    </div>
  );
}

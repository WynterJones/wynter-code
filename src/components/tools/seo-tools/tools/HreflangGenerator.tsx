import { useState } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HreflangEntry {
  lang: string;
  url: string;
}

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es", name: "Spanish" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr", name: "French" },
  { code: "fr-FR", name: "French (France)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "de", name: "German" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "zh", name: "Chinese" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "x-default", name: "Default/Fallback" },
];

export function HreflangGenerator() {
  const [entries, setEntries] = useState<HreflangEntry[]>([
    { lang: "en", url: "https://example.com/en/" },
    { lang: "x-default", url: "https://example.com/" },
  ]);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    return entries
      .filter((entry) => entry.lang && entry.url)
      .map((entry) => `<link rel="alternate" hreflang="${entry.lang}" href="${entry.url}" />`)
      .join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addEntry = () => {
    setEntries([...entries, { lang: "es", url: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof HreflangEntry, value: string) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Language Versions</h3>
            <Button size="sm" variant="default" onClick={addEntry}>
              <Plus className="w-3 h-3 mr-1" /> Add Language
            </Button>
          </div>

          <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
            <p className="text-xs text-text-secondary">
              Hreflang tags tell search engines which language and regional versions of a page exist.
              Always include an x-default for the fallback page.
            </p>
          </div>

          {entries.map((entry, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-border"
            >
              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Language</label>
                  <select
                    value={entry.lang}
                    onChange={(e) => updateEntry(index, "lang", e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">URL</label>
                  <input
                    type="url"
                    value={entry.url}
                    onChange={(e) => updateEntry(index, "url", e.target.value)}
                    placeholder="https://example.com/es/"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                  />
                </div>
              </div>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(index)}
                  className="p-1 mt-6 text-red-400 hover:bg-red-400/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated Hreflang Tags</h3>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
            {generateCode() || "<!-- Add language versions above -->"}
          </pre>

          {/* Quick Reference */}
          <div className="p-3 bg-bg-secondary rounded-lg border border-border">
            <h4 className="text-sm font-medium text-text-primary mb-2">Implementation Notes</h4>
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Add to <code className="bg-bg-tertiary px-1 rounded">&lt;head&gt;</code> section of each page</li>
              <li>• Each language version should include ALL hreflang tags</li>
              <li>• Use <code className="bg-bg-tertiary px-1 rounded">x-default</code> for language selector pages</li>
              <li>• URLs must be absolute (including https://)</li>
              <li>• Self-referencing is required (include current page&apos;s language)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

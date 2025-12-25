import { useState } from "react";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useBookmarkStore, type ImportData } from "@/stores/bookmarkStore";

interface ImportBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_JSON = `{
  "bookmarks": [
    {
      "url": "https://github.com",
      "title": "GitHub",
      "description": "Code hosting platform",
      "category": "Development"
    },
    {
      "url": "https://figma.com",
      "title": "Figma",
      "category": "Design"
    },
    {
      "url": "https://example.com",
      "title": "No Category Example"
    }
  ]
}`;

export function ImportBookmarksModal({ isOpen, onClose }: ImportBookmarksModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ imported: number; collectionsCreated: number } | null>(null);

  const { importBookmarks } = useBookmarkStore();

  const handleImport = () => {
    setError(null);
    setSuccess(null);

    if (!jsonInput.trim()) {
      setError("Please paste your JSON data");
      return;
    }

    try {
      const data = JSON.parse(jsonInput) as ImportData;

      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        setError('Invalid format: must have a "bookmarks" array');
        return;
      }

      if (data.bookmarks.length === 0) {
        setError("No bookmarks to import");
        return;
      }

      const invalidBookmarks = data.bookmarks.filter(
        (b) => !b.url || !b.title
      );
      if (invalidBookmarks.length > 0) {
        setError("Each bookmark must have a url and title");
        return;
      }

      const result = importBookmarks(data);
      setSuccess(result);
      setJsonInput("");
    } catch {
      setError("Invalid JSON format. Please check your syntax.");
    }
  };

  const handleClose = () => {
    setJsonInput("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  const handleLoadExample = () => {
    setJsonInput(EXAMPLE_JSON);
    setError(null);
    setSuccess(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Bookmarks"
      size="md"
    >
      <div className="p-4 space-y-4">
        <div className="text-sm text-text-secondary">
          Paste your JSON data below. Categories that don't exist will be created automatically.
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              JSON Data
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadExample}
              className="text-xs"
            >
              Load Example
            </Button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder={EXAMPLE_JSON}
            className="w-full h-64 px-3 py-2 text-sm font-mono bg-bg-tertiary border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-accent-green bg-accent-green/10 border border-accent-green/30 rounded-md">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Imported {success.imported} bookmark{success.imported !== 1 ? "s" : ""}
            {success.collectionsCreated > 0 && (
              <> and created {success.collectionsCreated} new collection{success.collectionsCreated !== 1 ? "s" : ""}</>
            )}
          </div>
        )}

        <div className="p-3 bg-bg-secondary border border-border rounded-md">
          <div className="text-xs font-medium text-text-primary mb-2">JSON Structure:</div>
          <pre className="text-xs text-text-secondary font-mono overflow-x-auto">
{`{
  "bookmarks": [
    {
      "url": "https://...",     // required
      "title": "...",           // required
      "description": "...",     // optional
      "category": "..."         // optional
    }
  ]
}`}
          </pre>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            {success ? "Done" : "Cancel"}
          </Button>
          {!success && (
            <Button onClick={handleImport}>
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

import { useState, useMemo } from "react";
import { Download, Check, Copy } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useBookmarkStore, type ImportData } from "@/stores/bookmarkStore";
import { cn } from "@/lib/utils";

interface ExportBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportBookmarksModal({ isOpen, onClose }: ExportBookmarksModalProps) {
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set(["all"]));
  const [copied, setCopied] = useState(false);

  const { bookmarks, collections } = useBookmarkStore();

  const collectionOptions = useMemo(() => {
    const options = [
      { id: "all", name: "All Bookmarks", count: bookmarks.length },
      { id: "uncategorized", name: "Uncategorized", count: bookmarks.filter(b => !b.collectionId).length },
    ];

    collections.forEach(c => {
      options.push({
        id: c.id,
        name: c.name,
        count: bookmarks.filter(b => b.collectionId === c.id).length,
      });
    });

    return options;
  }, [bookmarks, collections]);

  const handleToggleCollection = (id: string) => {
    const newSelected = new Set(selectedCollections);

    if (id === "all") {
      if (newSelected.has("all")) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add("all");
      }
    } else {
      newSelected.delete("all");
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setSelectedCollections(newSelected);
    setCopied(false);
  };

  const exportData = useMemo((): ImportData => {
    let filteredBookmarks = bookmarks;

    if (!selectedCollections.has("all")) {
      filteredBookmarks = bookmarks.filter(b => {
        if (selectedCollections.has("uncategorized") && !b.collectionId) {
          return true;
        }
        return b.collectionId && selectedCollections.has(b.collectionId);
      });
    }

    const collectionMap = new Map(collections.map(c => [c.id, c.name]));

    return {
      bookmarks: filteredBookmarks.map(b => ({
        url: b.url,
        title: b.title,
        ...(b.description && { description: b.description }),
        ...(b.collectionId && collectionMap.has(b.collectionId) && {
          category: collectionMap.get(b.collectionId)
        }),
      })),
    };
  }, [bookmarks, collections, selectedCollections]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportData, null, 2);
  }, [exportData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookmarks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setSelectedCollections(new Set(["all"]));
    setCopied(false);
    onClose();
  };

  const selectedCount = exportData.bookmarks.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Bookmarks"
      size="md"
    >
      <div className="p-4 space-y-4">
        <div className="text-sm text-text-secondary">
          Select which collections to export. The JSON format is compatible with the import feature.
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Collections to Export
          </label>
          <div className="max-h-48 overflow-y-auto border border-border rounded-md">
            {collectionOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleToggleCollection(option.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                  "hover:bg-bg-hover border-b border-border last:border-b-0",
                  selectedCollections.has(option.id) && "bg-accent/10"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    selectedCollections.has(option.id)
                      ? "bg-accent border-accent"
                      : "border-border"
                  )}
                >
                  {selectedCollections.has(option.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="flex-1 text-sm text-text-primary truncate">
                  {option.name}
                </span>
                <span className="text-xs text-text-secondary">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              Preview ({selectedCount} bookmark{selectedCount !== 1 ? "s" : ""})
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="w-full h-48 px-3 py-2 text-xs font-mono bg-bg-tertiary border border-border rounded-md overflow-auto">
            {jsonString}
          </pre>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={selectedCount === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            Download JSON
          </Button>
        </div>
      </div>
    </Modal>
  );
}

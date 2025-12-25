import { useState, useEffect, useRef, useCallback } from "react";
import { Link, Type, FileText, Folder, Loader2 } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useBookmarkStore } from "@/stores/bookmarkStore";

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBookmarkId: string | null;
}

export function AddBookmarkModal({
  isOpen,
  onClose,
  editingBookmarkId,
}: AddBookmarkModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const userEditedTitle = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { bookmarks, collections, addBookmark, updateBookmark } = useBookmarkStore();

  const isEditing = editingBookmarkId !== null;
  const editingBookmark = isEditing
    ? bookmarks.find((b) => b.id === editingBookmarkId)
    : null;

  useEffect(() => {
    if (isOpen && editingBookmark) {
      setUrl(editingBookmark.url);
      setTitle(editingBookmark.title);
      setDescription(editingBookmark.description || "");
      setCollectionId(editingBookmark.collectionId);
      userEditedTitle.current = true; // Don't auto-fetch when editing
    } else if (isOpen) {
      setUrl("");
      setTitle("");
      setDescription("");
      setCollectionId(null);
      userEditedTitle.current = false;
    }
  }, [isOpen, editingBookmark]);

  // Fetch page title when URL changes
  const fetchPageTitle = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim() || userEditedTitle.current) return;

    const cleanUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

    try {
      new URL(cleanUrl); // Validate URL
    } catch {
      return; // Invalid URL, don't fetch
    }

    setIsFetchingTitle(true);
    try {
      const response = await fetch(cleanUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BookmarkFetcher/1.0)",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

      if (titleMatch && titleMatch[1] && !userEditedTitle.current) {
        const fetchedTitle = titleMatch[1].trim();
        // Decode HTML entities
        const decoded = fetchedTitle
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ");
        setTitle(decoded);
      }
    } catch {
      // Silently fail - user can enter title manually
    } finally {
      setIsFetchingTitle(false);
    }
  }, []);

  // Debounced URL change handler
  useEffect(() => {
    if (!isOpen || isEditing) return;

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (url.trim() && !userEditedTitle.current) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPageTitle(url);
      }, 500); // 500ms debounce
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [url, isOpen, isEditing, fetchPageTitle]);

  const handleSubmit = () => {
    if (!url.trim() || !title.trim()) return;

    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;

    if (isEditing && editingBookmarkId) {
      updateBookmark(editingBookmarkId, {
        url: cleanUrl,
        title: title.trim(),
        description: description.trim() || undefined,
        collectionId,
      });
    } else {
      addBookmark({
        url: cleanUrl,
        title: title.trim(),
        description: description.trim() || undefined,
        collectionId,
      });
    }

    onClose();
  };

  const sortedCollections = [...collections].sort((a, b) => a.order - b.order);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Bookmark" : "Add Bookmark"}
      size="md"
    >
      <div className="p-4 space-y-4">
        {/* URL */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <Link className="w-3.5 h-3.5" />
            URL
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
          />
        </div>

        {/* Title */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <Type className="w-3.5 h-3.5" />
            Title
            {isFetchingTitle && (
              <Loader2 className="w-3 h-3 animate-spin text-accent" />
            )}
          </label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              userEditedTitle.current = true;
            }}
            placeholder={isFetchingTitle ? "Fetching title..." : "My Bookmark"}
          />
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <FileText className="w-3.5 h-3.5" />
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description..."
            className="w-full px-3 py-2 text-sm font-mono bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none"
            rows={2}
          />
        </div>

        {/* Collection */}
        <div>
          <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
            <Folder className="w-3.5 h-3.5" />
            Collection
          </label>
          <select
            value={collectionId || ""}
            onChange={(e) => setCollectionId(e.target.value || null)}
            className="h-9 w-full px-3 py-1 text-sm font-mono bg-bg-tertiary border border-border rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="">Uncategorized</option>
            {sortedCollections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!url.trim() || !title.trim()}
          >
            {isEditing ? "Save Changes" : "Add Bookmark"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

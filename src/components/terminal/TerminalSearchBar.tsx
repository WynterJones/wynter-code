import { useState, useEffect, useRef, useCallback } from "react";
import type { SearchAddon } from "@xterm/addon-search";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

interface TerminalSearchBarProps {
  searchAddon: SearchAddon | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalSearchBar({ searchAddon, isOpen, onClose }: TerminalSearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const findNext = useCallback(() => {
    if (searchAddon && query) {
      searchAddon.findNext(query, { caseSensitive: false, regex: false });
    }
  }, [searchAddon, query]);

  const findPrevious = useCallback(() => {
    if (searchAddon && query) {
      searchAddon.findPrevious(query, { caseSensitive: false, regex: false });
    }
  }, [searchAddon, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevious();
      } else {
        findNext();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Auto-search as user types
    if (searchAddon && value) {
      searchAddon.findNext(value, { caseSensitive: false, regex: false });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border">
      <Search size={14} className="text-text-secondary flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search terminal..."
        className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary outline-none"
      />
      <div className="flex items-center gap-1">
        <button
          onClick={findPrevious}
          disabled={!query}
          className="p-1 rounded hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={findNext}
          disabled={!query}
          className="p-1 rounded hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next match (Enter)"
        >
          <ChevronDown size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-hover ml-1"
          title="Close (Escape)"
        >
          <X size={14} className="text-text-secondary" />
        </button>
      </div>
    </div>
  );
}

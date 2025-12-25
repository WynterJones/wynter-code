export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  contextBefore: string[];
  contextAfter: string[];
}

export interface FileSearchResult {
  filePath: string;
  relativePath: string;
  fileName: string;
  matches: SearchMatch[];
  totalMatches: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  regexMode?: boolean;
  wholeWord?: boolean;
  includeHidden?: boolean;
  fileExtensions?: string[];
  excludePatterns?: string[];
  maxResults?: number;
  contextLines?: number;
}

export interface SearchResult {
  files: FileSearchResult[];
  totalFiles: number;
  totalMatches: number;
  truncated: boolean;
  searchTimeMs: number;
}

export interface ReplaceResult {
  filesModified: number;
  replacementsMade: number;
  errors: string[];
}

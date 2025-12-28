export interface CliDiffLine {
  type: "context" | "addition" | "deletion";
  lineNumber: number;
  content: string;
}

export interface ParsedCliDiff {
  operation: "Update" | "Create" | "Delete" | "Read" | "Write";
  filename: string;
  additions: number;
  deletions: number;
  lines: CliDiffLine[];
  raw: string;
}

export interface ContentSegment {
  type: "markdown" | "diff";
  content: string;
  diff?: ParsedCliDiff;
}

const HEADER_PATTERN = /^[●○]\s*(Update|Create|Delete|Read|Write)\(([^)]+)\)$/;
const STATS_PATTERN = /^[└├─│]\s*Added\s+(\d+)\s+lines?,\s*removed\s+(\d+)\s+lines?/;
const LINE_WITH_NUMBER = /^(\s*)(\d+)(\s+)([-+]?)(\s*)(.*)$/;

function parseCliDiffBlock(block: string): ParsedCliDiff | null {
  const lines = block.split("\n");
  if (lines.length < 2) return null;

  const headerMatch = lines[0].match(HEADER_PATTERN);
  if (!headerMatch) return null;

  const operation = headerMatch[1] as ParsedCliDiff["operation"];
  const filename = headerMatch[2];

  let additions = 0;
  let deletions = 0;
  const statsMatch = lines[1]?.match(STATS_PATTERN);
  if (statsMatch) {
    additions = parseInt(statsMatch[1], 10);
    deletions = parseInt(statsMatch[2], 10);
  }

  const diffLines: CliDiffLine[] = [];
  const startIndex = statsMatch ? 2 : 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(LINE_WITH_NUMBER);
    if (match) {
      const lineNumber = parseInt(match[2], 10);
      const indicator = match[4];
      const content = match[6];

      let type: CliDiffLine["type"] = "context";
      if (indicator === "+") type = "addition";
      else if (indicator === "-") type = "deletion";

      diffLines.push({ type, lineNumber, content });
    }
  }

  return {
    operation,
    filename,
    additions,
    deletions,
    lines: diffLines,
    raw: block,
  };
}

export function splitContentWithDiffs(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  const diffBlockPattern =
    /([●○]\s*(?:Update|Create|Delete|Read|Write)\([^)]+\)\n[└├─│][^\n]*\n(?:\s*\d+\s*[-+]?\s*[^\n]*\n?)*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = diffBlockPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const markdownContent = content.slice(lastIndex, match.index).trim();
      if (markdownContent) {
        segments.push({ type: "markdown", content: markdownContent });
      }
    }

    const diffText = match[1];
    const parsed = parseCliDiffBlock(diffText);
    if (parsed) {
      segments.push({ type: "diff", content: diffText, diff: parsed });
    } else {
      segments.push({ type: "markdown", content: diffText });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: "markdown", content: remaining });
    }
  }

  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "markdown", content: content.trim() });
  }

  return segments;
}

export function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    toml: "toml",
    xml: "xml",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "plaintext";
}

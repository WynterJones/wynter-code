/* eslint-disable no-control-regex */
/**
 * ANSI Escape Sequence Filter
 *
 * Filters problematic ANSI escape sequences that cause display issues
 * in xterm.js when running TUI applications like Claude Code CLI.
 *
 * Known issues with Claude Code CLI:
 * - Excessive blank lines due to clear scrollback sequences
 * - Hard line breaks at ~80 chars
 * - Raw CSI sequences in file previews
 *
 * References:
 * - https://github.com/anthropics/claude-code/issues/10472
 * - https://github.com/anthropics/claude-code/issues/7670
 */

// ESC character
const ESC = "\x1B";

// Problematic CSI (Control Sequence Introducer) sequences to filter
const PROBLEMATIC_SEQUENCES = [
  // Clear scrollback buffer - causes viewport to jump
  `${ESC}[3J`,
  // ED (Erase in Display) with parameter 3 - clear scrollback
  `${ESC}[3;J`,
];

// Regex to match CRLF (Windows-style line endings)
// Claude Code CLI sends \r\n which causes extra blank lines in xterm.js
const CRLF_REGEX = /\r\n/g;

// Regex to match newline after cursor-to-column-1 (CSI G)
// Claude Code sends \x1b[G\r\n which creates an extra blank line
// After CRLF normalization, this becomes \x1b[G\n - remove the \n
const CURSOR_HOME_NEWLINE_REGEX = /\x1b\[G\n/g;

// Regex to match excessive consecutive newlines (3 or more)
const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g;

// Regex to match clear scrollback sequences with variations
// Matches: ESC[3J, ESC[3;J, ESC[?3J
const CLEAR_SCROLLBACK_REGEX = /\x1B\[\??3;?J/g;

/**
 * Filter problematic ANSI escape sequences from terminal output.
 *
 * @param data - Raw terminal output data
 * @param options - Filter options
 * @returns Filtered terminal output
 */
export function filterAnsiSequences(
  data: string,
  options: {
    filterClearScrollback?: boolean;
    filterExcessiveNewlines?: boolean;
    normalizeCRLF?: boolean;
    maxConsecutiveNewlines?: number;
  } = {}
): string {
  const {
    filterClearScrollback = true,
    filterExcessiveNewlines = true,
    normalizeCRLF = true,
    maxConsecutiveNewlines = 2,
  } = options;

  let result = data;

  // Normalize CRLF to LF first (before other processing)
  // Claude Code CLI and other TUI apps send \r\n which causes
  // extra blank lines when xterm.js processes both \r and \n
  if (normalizeCRLF) {
    result = result.replace(CRLF_REGEX, "\n");
    // Also remove newlines after cursor-to-column-1 (ESC[G)
    // This pattern creates blank lines at the top of status bar redraws
    result = result.replace(CURSOR_HOME_NEWLINE_REGEX, "\x1b[G");
  }

  // Filter clear scrollback sequences
  if (filterClearScrollback) {
    // Remove exact matches first
    for (const seq of PROBLEMATIC_SEQUENCES) {
      result = result.split(seq).join("");
    }
    // Remove pattern-matched variations
    result = result.replace(CLEAR_SCROLLBACK_REGEX, "");
  }

  // Reduce excessive consecutive newlines
  if (filterExcessiveNewlines) {
    const replacement = "\n".repeat(maxConsecutiveNewlines);
    result = result.replace(EXCESSIVE_NEWLINES_REGEX, replacement);
  }

  return result;
}

/**
 * Check if a string contains problematic ANSI sequences
 * Useful for debugging
 */
export function containsProblematicSequences(data: string): boolean {
  for (const seq of PROBLEMATIC_SEQUENCES) {
    if (data.includes(seq)) return true;
  }
  if (CLEAR_SCROLLBACK_REGEX.test(data)) return true;
  return false;
}

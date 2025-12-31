/**
 * Parsing utilities for Farmwork Tycoon audit and garden files
 */

import type { AuditItem, AuditMetadata } from "@/components/tools/farmwork-tycoon/types";

export const createDefaultAuditMetadata = (): AuditMetadata => ({
  score: 0,
  lastUpdated: null,
  status: null,
  openItems: [],
});

/**
 * Parse audit markdown files (SECURITY.md, TESTS.md, etc.)
 * Extracts: score, lastUpdated, status, and open items
 */
export const parseAuditFile = (content: string): AuditMetadata => {
  const result = createDefaultAuditMetadata();

  // Parse score: **Score:** 8.7/10
  const scoreMatch = content.match(/\*\*Score:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (scoreMatch) {
    result.score = parseFloat(scoreMatch[1]);
  }

  // Parse last updated: **Last Updated:** 2025-12-22
  const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
  if (lastUpdatedMatch) {
    result.lastUpdated = lastUpdatedMatch[1];
  }

  // Parse status: **Status:** 1 open item OR **Status:** Initial setup
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i);
  if (statusMatch) {
    result.status = statusMatch[1].trim();
  }

  // Parse open items from ## Open Items section
  const openItemsSection = content.match(/## Open Items\s*\n([\s\S]*?)(?=\n---|\n## |$)/i);
  if (openItemsSection) {
    const sectionContent = openItemsSection[1];
    // Skip if it says "None currently" or similar
    if (!sectionContent.match(/_None|No open items|Empty/i)) {
      const lines = sectionContent.split("\n");
      for (const line of lines) {
        // Match bullet points: - Item text or * Item text
        const itemMatch = line.match(/^[-*]\s+(.+)/);
        if (itemMatch) {
          const text = itemMatch[1].trim();
          // Check for priority markers
          let priority: AuditItem["priority"] = undefined;
          if (text.match(/\[HIGH\]|\(HIGH\)|🔴/i)) priority = "high";
          else if (text.match(/\[MEDIUM\]|\(MEDIUM\)|🟡/i)) priority = "medium";
          else if (text.match(/\[LOW\]|\(LOW\)|🟢/i)) priority = "low";

          result.openItems.push({
            text: text.replace(/\[(HIGH|MEDIUM|LOW)\]|\((HIGH|MEDIUM|LOW)\)|[🔴🟡🟢]/gi, "").trim(),
            priority
          });
        }
      }
    }
  }

  return result;
};

export interface GardenParseResult {
  planted: number;        // Ideas in Ideas section
  growing: number;        // Graduated to plans
  picked: number;         // Implemented
  ideas: string[];
}

/**
 * Parse GARDEN.md to extract idea counts and states
 */
export const parseGardenIdeas = (content: string): GardenParseResult => {
  const ideas: string[] = [];
  const lines = content.split("\n");
  let inIdeasSection = false;
  let inGraduatedSection = false;
  let inImplementedSection = false;

  let planted = 0;
  let growing = 0;
  let picked = 0;

  // First try to parse the header count: **Active Ideas:** N
  const headerMatch = content.match(/\*\*Active Ideas:\*\*\s*(\d+)/i);
  const headerCount = headerMatch ? parseInt(headerMatch[1], 10) : null;

  // Parse sections
  for (const line of lines) {
    // Detect section headers
    if (line.match(/^##\s*Ideas\s*$/i)) {
      inIdeasSection = true;
      inGraduatedSection = false;
      inImplementedSection = false;
      continue;
    }
    if (line.match(/^##\s*Graduated to Plans/i)) {
      inIdeasSection = false;
      inGraduatedSection = true;
      inImplementedSection = false;
      continue;
    }
    if (line.match(/^##\s*Implemented/i)) {
      inIdeasSection = false;
      inGraduatedSection = false;
      inImplementedSection = true;
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("---")) {
      if (line.startsWith("---")) continue;
      inIdeasSection = false;
      inGraduatedSection = false;
      inImplementedSection = false;
      continue;
    }

    // Count items in Ideas section (H3 headers like "### Auto Build")
    if (inIdeasSection) {
      const ideaMatch = line.match(/^###\s+(.+)/);
      if (ideaMatch) {
        ideas.push(ideaMatch[1]);
        planted++;
      }
    }

    // Count rows in Graduated table (lines starting with |, excluding header/separator)
    if (inGraduatedSection) {
      if (line.match(/^\|\s*[^|\-\s]/) && !line.match(/^\|\s*Idea\s*\|/i)) {
        growing++;
      }
    }

    // Count rows in Implemented table
    if (inImplementedSection) {
      if (line.match(/^\|\s*[^|\-\s]/) && !line.match(/^\|\s*Idea\s*\|/i)) {
        picked++;
      }
    }
  }

  // Use header count if available for planted, otherwise use counted ideas
  if (headerCount !== null) {
    planted = headerCount;
  }

  return { planted, growing, picked, ideas };
};

export interface CompostParseResult {
  count: number;
  ideas: string[];
}

/**
 * Parse COMPOST.md to extract rejected idea counts
 */
export const parseCompostStats = (content: string): CompostParseResult => {
  const ideas: string[] = [];

  // Extract idea names from ### headers
  const entryMatches = content.match(/^###\s+(.+)$/gm);
  if (entryMatches) {
    for (const match of entryMatches) {
      const ideaName = match.replace(/^###\s+/, "").trim();
      if (ideaName) {
        ideas.push(ideaName);
      }
    }
  }

  // First try to parse the header count: **Composted Ideas:** N
  const headerMatch = content.match(/\*\*Composted Ideas:\*\*\s*(\d+)/i);
  const count = headerMatch ? parseInt(headerMatch[1], 10) : ideas.length;

  return { count, ideas };
};

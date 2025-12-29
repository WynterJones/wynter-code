export interface FarmworkPhrase {
  id: string;
  phrase: string;
  description: string;
  category: FarmworkPhraseCategory;
  argumentHint?: string; // e.g., "<topic>" for phrases ending in "..."
  requiresGarden?: boolean; // Only show if hasGarden
  requiresFarmhouse?: boolean; // Only show if hasFarmhouse
}

export type FarmworkPhraseCategory =
  | "farmwork"
  | "planning"
  | "ideas"
  | "research"
  | "production"
  | "office";

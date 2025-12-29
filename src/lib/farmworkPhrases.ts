import type { FarmworkPhrase, FarmworkPhraseCategory } from "@/types/farmworkPhrase";

export const FARMWORK_PHRASES: FarmworkPhrase[] = [
  // Farmwork category
  {
    id: "open-the-farm",
    phrase: "open the farm",
    description: "Audit systems, update FARMHOUSE.md with metrics",
    category: "farmwork",
    requiresFarmhouse: true,
  },
  {
    id: "count-the-herd",
    phrase: "count the herd",
    description: "Full code inspection + dry run quality gates",
    category: "farmwork",
  },
  {
    id: "go-to-market",
    phrase: "go to market",
    description: "i18n scan + accessibility audit",
    category: "farmwork",
  },
  {
    id: "close-the-farm",
    phrase: "close the farm",
    description: "Execute /push (lint, test, build, commit, push)",
    category: "farmwork",
  },

  // Planning category
  {
    id: "make-a-plan-for",
    phrase: "make a plan for...",
    description: "Create implementation plan in _PLANS/",
    category: "planning",
    argumentHint: "<feature>",
  },
  {
    id: "lets-implement",
    phrase: "let's implement...",
    description: "Load plan, create Epic + issues, start work",
    category: "planning",
    argumentHint: "<plan name>",
  },

  // Ideas category
  {
    id: "i-have-an-idea-for",
    phrase: "I have an idea for...",
    description: "Plant new idea in GARDEN.md",
    category: "ideas",
    argumentHint: "<idea>",
  },
  {
    id: "lets-plan-this-idea",
    phrase: "let's plan this idea...",
    description: "Graduate idea from GARDEN to _PLANS/",
    category: "ideas",
    argumentHint: "<idea name>",
    requiresGarden: true,
  },
  {
    id: "compost-this",
    phrase: "compost this...",
    description: "Reject idea, move to COMPOST.md",
    category: "ideas",
    argumentHint: "<idea name>",
  },
  {
    id: "water-the-garden",
    phrase: "water the garden",
    description: "Generate 10 new ideas based on GARDEN and COMPOST",
    category: "ideas",
    requiresGarden: true,
  },

  // Research category
  {
    id: "lets-research",
    phrase: "let's research...",
    description: "Create or update research document in _RESEARCH/",
    category: "research",
    argumentHint: "<topic>",
  },
  {
    id: "update-research-on",
    phrase: "update research on...",
    description: "Refresh existing research with new findings",
    category: "research",
    argumentHint: "<topic>",
  },
  {
    id: "show-research-on",
    phrase: "show research on...",
    description: "Display research summary and staleness status",
    category: "research",
    argumentHint: "<topic>",
  },

  // Production category
  {
    id: "go-to-production",
    phrase: "go to production",
    description: "Update BROWNFIELD.md, check GREENFIELD alignment, note doc impacts",
    category: "production",
  },

  // Office category
  {
    id: "setup-office",
    phrase: "setup office",
    description: "Interactive guided setup: GREENFIELD vision, strategy, optional docs",
    category: "office",
  },
];

export const CATEGORY_LABELS: Record<FarmworkPhraseCategory, string> = {
  farmwork: "Farm Operations",
  planning: "Planning",
  ideas: "Ideas & Garden",
  research: "Research",
  production: "Production",
  office: "Office Phrases",
};

export const CATEGORY_ORDER: FarmworkPhraseCategory[] = [
  "farmwork",
  "planning",
  "ideas",
  "research",
  "production",
  "office",
];

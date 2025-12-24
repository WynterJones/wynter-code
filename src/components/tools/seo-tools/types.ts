import type { LucideIcon } from "lucide-react";

export interface SeoTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface MetaTagsData {
  title: string;
  description: string;
  keywords: string;
  author: string;
  robots: string;
  canonical: string;
  viewport: string;
}

export interface OpenGraphData {
  title: string;
  description: string;
  url: string;
  siteName: string;
  image: string;
  imageWidth: string;
  imageHeight: string;
  type: "website" | "article" | "product" | "profile";
  locale: string;
}

export interface TwitterCardData {
  cardType: "summary" | "summary_large_image" | "app" | "player";
  site: string;
  creator: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface StructuredDataType {
  id: string;
  name: string;
  description: string;
}

export interface RobotsTxtRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export interface LlmsTxtData {
  siteName: string;
  description: string;
  mainContent: Array<{ title: string; path: string }>;
  documentation: Array<{ title: string; path: string }>;
  optional: Array<{ title: string; path: string }>;
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

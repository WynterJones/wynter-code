import { useState, useEffect, useCallback } from "react";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useProjectStore } from "@/stores/projectStore";

export interface ExtractedSeoData {
  title: string;
  description: string;
  keywords: string;
  author: string;
  robots: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogSiteName: string;
  ogImage: string;
  ogType: string;
  ogLocale: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterImageAlt: string;
  packageName: string;
  packageDescription: string;
}

const EMPTY_SEO_DATA: ExtractedSeoData = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  robots: "",
  canonical: "",
  ogTitle: "",
  ogDescription: "",
  ogUrl: "",
  ogSiteName: "",
  ogImage: "",
  ogType: "",
  ogLocale: "",
  twitterCard: "",
  twitterSite: "",
  twitterCreator: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  twitterImageAlt: "",
  packageName: "",
  packageDescription: "",
};

const HTML_FILE_PATHS = [
  "index.html",
  "public/index.html",
  "src/index.html",
  "dist/index.html",
  "build/index.html",
];

function extractMetaContent(html: string, name: string, isProperty = false): string {
  const attr = isProperty ? "property" : "name";
  const regex = new RegExp(
    `<meta\\s+${attr}=["']${name}["']\\s+content=["']([^"']*)["']|<meta\\s+content=["']([^"']*)["']\\s+${attr}=["']${name}["']`,
    "i"
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2] || "") : "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractCanonical(html: string): string {
  const match = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  if (match) return match[1];
  const altMatch = html.match(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
  return altMatch ? altMatch[1] : "";
}

function parseHtmlForSeo(html: string): Partial<ExtractedSeoData> {
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, "description"),
    keywords: extractMetaContent(html, "keywords"),
    author: extractMetaContent(html, "author"),
    robots: extractMetaContent(html, "robots"),
    canonical: extractCanonical(html),
    ogTitle: extractMetaContent(html, "og:title", true),
    ogDescription: extractMetaContent(html, "og:description", true),
    ogUrl: extractMetaContent(html, "og:url", true),
    ogSiteName: extractMetaContent(html, "og:site_name", true),
    ogImage: extractMetaContent(html, "og:image", true),
    ogType: extractMetaContent(html, "og:type", true),
    ogLocale: extractMetaContent(html, "og:locale", true),
    twitterCard: extractMetaContent(html, "twitter:card"),
    twitterSite: extractMetaContent(html, "twitter:site"),
    twitterCreator: extractMetaContent(html, "twitter:creator"),
    twitterTitle: extractMetaContent(html, "twitter:title"),
    twitterDescription: extractMetaContent(html, "twitter:description"),
    twitterImage: extractMetaContent(html, "twitter:image"),
    twitterImageAlt: extractMetaContent(html, "twitter:image:alt"),
  };
}

interface PackageJson {
  name?: string;
  description?: string;
  author?: string | { name?: string };
  homepage?: string;
}

function parsePackageJson(content: string): Partial<ExtractedSeoData> {
  try {
    const pkg: PackageJson = JSON.parse(content);
    const author = typeof pkg.author === "string"
      ? pkg.author
      : pkg.author?.name || "";

    return {
      packageName: pkg.name || "",
      packageDescription: pkg.description || "",
      author: author,
      canonical: pkg.homepage || "",
    };
  } catch (error) {
    return {};
  }
}

export function useSeoDataFromProject() {
  const [data, setData] = useState<ExtractedSeoData>(EMPTY_SEO_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);

  const loadSeoData = useCallback(async () => {
    if (!activeProjectId) {
      setData(EMPTY_SEO_DATA);
      setSourcePath(null);
      return;
    }

    const project = getProject(activeProjectId);
    if (!project?.path) {
      setData(EMPTY_SEO_DATA);
      setSourcePath(null);
      return;
    }

    setIsLoading(true);
    const projectPath = project.path;
    let extracted: Partial<ExtractedSeoData> = {};
    let foundHtmlPath: string | null = null;

    try {
      for (const relativePath of HTML_FILE_PATHS) {
        const fullPath = await join(projectPath, relativePath);
        const fileExists = await exists(fullPath);
        if (fileExists) {
          const html = await readTextFile(fullPath);
          extracted = { ...extracted, ...parseHtmlForSeo(html) };
          foundHtmlPath = relativePath;
          break;
        }
      }

      const packageJsonPath = await join(projectPath, "package.json");
      const pkgExists = await exists(packageJsonPath);
      if (pkgExists) {
        const pkgContent = await readTextFile(packageJsonPath);
        const pkgData = parsePackageJson(pkgContent);
        extracted = {
          ...extracted,
          packageName: pkgData.packageName || extracted.packageName || "",
          packageDescription: pkgData.packageDescription || extracted.packageDescription || "",
          author: extracted.author || pkgData.author || "",
          canonical: extracted.canonical || pkgData.canonical || "",
        };
      }

      setData({ ...EMPTY_SEO_DATA, ...extracted });
      setSourcePath(foundHtmlPath);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to extract SEO data:", error);
      setData(EMPTY_SEO_DATA);
      setSourcePath(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, getProject]);

  useEffect(() => {
    if (!hasLoaded && activeProjectId) {
      loadSeoData();
    }
  }, [hasLoaded, activeProjectId, loadSeoData]);

  return {
    data,
    isLoading,
    hasLoaded,
    sourcePath,
    reload: loadSeoData,
  };
}

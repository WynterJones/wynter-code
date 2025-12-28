import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GoogleSerpPreview } from "../previews/GoogleSerpPreview";
import { useSeoDataFromProject } from "../hooks/useSeoDataFromProject";

interface MetaTagsData {
  title: string;
  description: string;
  keywords: string;
  author: string;
  robots: string;
  canonical: string;
}

export function MetaTagsGenerator() {
  const { data: projectData, isLoading: isLoadingProject, sourcePath, reload } = useSeoDataFromProject();
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [data, setData] = useState<MetaTagsData>({
    title: "",
    description: "",
    keywords: "",
    author: "",
    robots: "index, follow",
    canonical: "",
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasAutoLoaded && projectData && !isLoadingProject) {
      const hasData = projectData.title || projectData.description || projectData.keywords ||
        projectData.author || projectData.canonical || projectData.packageName;
      if (hasData) {
        setData({
          title: projectData.title || projectData.packageName || "",
          description: projectData.description || projectData.packageDescription || "",
          keywords: projectData.keywords || "",
          author: projectData.author || "",
          robots: projectData.robots || "index, follow",
          canonical: projectData.canonical || "",
        });
        setHasAutoLoaded(true);
      }
    }
  }, [projectData, isLoadingProject, hasAutoLoaded]);

  const handleLoadFromProject = async () => {
    await reload();
    if (projectData) {
      setData({
        title: projectData.title || projectData.packageName || data.title,
        description: projectData.description || projectData.packageDescription || data.description,
        keywords: projectData.keywords || data.keywords,
        author: projectData.author || data.author,
        robots: projectData.robots || data.robots,
        canonical: projectData.canonical || data.canonical,
      });
    }
  };

  const generateCode = () => {
    const lines: string[] = [];

    if (data.title) {
      lines.push(`<title>${data.title}</title>`);
    }
    if (data.description) {
      lines.push(`<meta name="description" content="${data.description}" />`);
    }
    if (data.keywords) {
      lines.push(`<meta name="keywords" content="${data.keywords}" />`);
    }
    if (data.author) {
      lines.push(`<meta name="author" content="${data.author}" />`);
    }
    if (data.robots) {
      lines.push(`<meta name="robots" content="${data.robots}" />`);
    }
    if (data.canonical) {
      lines.push(`<link rel="canonical" href="${data.canonical}" />`);
    }

    // Add common viewport meta tag
    lines.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0" />`);

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setData({
      title: "",
      description: "",
      keywords: "",
      author: "",
      robots: "index, follow",
      canonical: "",
    });
  };

  const titleLength = data.title.length;
  const descLength = data.description.length;

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Meta Tag Settings</h3>
            <Button
              size="sm"
              variant="default"
              onClick={handleLoadFromProject}
              disabled={isLoadingProject}
            >
              {isLoadingProject ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <FolderOpen className="w-3 h-3 mr-1" />
              )}
              Load from project
            </Button>
          </div>
          {sourcePath && (
            <p className="text-xs text-text-tertiary">
              Loaded from: {sourcePath}
            </p>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Page Title
              <span className={`ml-2 text-xs ${titleLength > 60 ? "text-yellow-400" : titleLength > 0 ? "text-green-400" : "text-text-tertiary"}`}>
                ({titleLength}/60)
              </span>
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="Your page title"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Meta Description
              <span className={`ml-2 text-xs ${descLength > 160 ? "text-red-400" : descLength > 120 ? "text-yellow-400" : descLength > 0 ? "text-green-400" : "text-text-tertiary"}`}>
                ({descLength}/160)
              </span>
            </label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="A brief description of your page (150-160 characters recommended)"
              rows={3}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Keywords (comma separated)</label>
            <input
              type="text"
              value={data.keywords}
              onChange={(e) => setData({ ...data, keywords: e.target.value })}
              placeholder="seo, meta tags, web development"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Author</label>
            <input
              type="text"
              value={data.author}
              onChange={(e) => setData({ ...data, author: e.target.value })}
              placeholder="Author name"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Robots */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Robots</label>
            <select
              value={data.robots}
              onChange={(e) => setData({ ...data, robots: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="index, follow">index, follow (Default)</option>
              <option value="noindex, follow">noindex, follow</option>
              <option value="index, nofollow">index, nofollow</option>
              <option value="noindex, nofollow">noindex, nofollow</option>
            </select>
          </div>

          {/* Canonical URL */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Canonical URL</label>
            <input
              type="url"
              value={data.canonical}
              onChange={(e) => setData({ ...data, canonical: e.target.value })}
              placeholder="https://example.com/page"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Preview & Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <h3 className="font-medium text-text-primary">Preview</h3>

          <GoogleSerpPreview
            title={data.title}
            description={data.description}
            url={data.canonical}
          />

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-text-primary">Generated Code</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="default" onClick={handleReset}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                <Button size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
              {generateCode()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

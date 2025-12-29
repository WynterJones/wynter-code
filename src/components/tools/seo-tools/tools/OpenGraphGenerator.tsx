import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FacebookCardPreview } from "../previews/FacebookCardPreview";
import { useSeoDataFromProject } from "../hooks/useSeoDataFromProject";
import { AiImageGeneratorModal } from "../components/AiImageGeneratorModal";

interface OpenGraphData {
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

export function OpenGraphGenerator() {
  const { data: projectData, isLoading: isLoadingProject, sourcePath, reload } = useSeoDataFromProject();
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [data, setData] = useState<OpenGraphData>({
    title: "",
    description: "",
    url: "",
    siteName: "",
    image: "",
    imageWidth: "1200",
    imageHeight: "630",
    type: "website",
    locale: "en_US",
  });
  const [copied, setCopied] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  useEffect(() => {
    if (!hasAutoLoaded && projectData && !isLoadingProject) {
      const hasData = projectData.ogTitle || projectData.ogDescription || projectData.ogUrl ||
        projectData.ogSiteName || projectData.ogImage || projectData.title || projectData.packageName;
      if (hasData) {
        setData({
          title: projectData.ogTitle || projectData.title || projectData.packageName || "",
          description: projectData.ogDescription || projectData.description || projectData.packageDescription || "",
          url: projectData.ogUrl || projectData.canonical || "",
          siteName: projectData.ogSiteName || projectData.packageName || "",
          image: projectData.ogImage || "",
          imageWidth: "1200",
          imageHeight: "630",
          type: (projectData.ogType as OpenGraphData["type"]) || "website",
          locale: projectData.ogLocale || "en_US",
        });
        setHasAutoLoaded(true);
      }
    }
  }, [projectData, isLoadingProject, hasAutoLoaded]);

  const handleLoadFromProject = async () => {
    await reload();
    if (projectData) {
      setData({
        title: projectData.ogTitle || projectData.title || projectData.packageName || data.title,
        description: projectData.ogDescription || projectData.description || projectData.packageDescription || data.description,
        url: projectData.ogUrl || projectData.canonical || data.url,
        siteName: projectData.ogSiteName || projectData.packageName || data.siteName,
        image: projectData.ogImage || data.image,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
        type: (projectData.ogType as OpenGraphData["type"]) || data.type,
        locale: projectData.ogLocale || data.locale,
      });
    }
  };

  const generateCode = () => {
    const lines: string[] = [];

    if (data.type) lines.push(`<meta property="og:type" content="${data.type}" />`);
    if (data.title) lines.push(`<meta property="og:title" content="${data.title}" />`);
    if (data.description) lines.push(`<meta property="og:description" content="${data.description}" />`);
    if (data.url) lines.push(`<meta property="og:url" content="${data.url}" />`);
    if (data.siteName) lines.push(`<meta property="og:site_name" content="${data.siteName}" />`);
    if (data.image) {
      lines.push(`<meta property="og:image" content="${data.image}" />`);
      if (data.imageWidth) lines.push(`<meta property="og:image:width" content="${data.imageWidth}" />`);
      if (data.imageHeight) lines.push(`<meta property="og:image:height" content="${data.imageHeight}" />`);
    }
    if (data.locale) lines.push(`<meta property="og:locale" content="${data.locale}" />`);

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
      url: "",
      siteName: "",
      image: "",
      imageWidth: "1200",
      imageHeight: "630",
      type: "website",
      locale: "en_US",
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Open Graph Settings</h3>
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

          {/* Type */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Content Type</label>
            <select
              value={data.type}
              onChange={(e) => setData({ ...data, type: e.target.value as OpenGraphData["type"] })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="website">Website</option>
              <option value="article">Article</option>
              <option value="product">Product</option>
              <option value="profile">Profile</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="Page title for social sharing"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Description shown in social previews"
              rows={3}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">URL</label>
            <input
              type="url"
              value={data.url}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              placeholder="https://example.com/page"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Site Name */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Site Name</label>
            <input
              type="text"
              value={data.siteName}
              onChange={(e) => setData({ ...data, siteName: e.target.value })}
              placeholder="Your Website Name"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-text-secondary">Image URL</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAiGenerator(true)}
                className="text-accent hover:text-accent/80"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Generate with AI
              </Button>
            </div>
            <input
              type="url"
              value={data.image}
              onChange={(e) => setData({ ...data, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Image Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Image Width</label>
              <input
                type="number"
                value={data.imageWidth}
                onChange={(e) => setData({ ...data, imageWidth: e.target.value })}
                placeholder="1200"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Image Height</label>
              <input
                type="number"
                value={data.imageHeight}
                onChange={(e) => setData({ ...data, imageHeight: e.target.value })}
                placeholder="630"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Locale */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Locale</label>
            <select
              value={data.locale}
              onChange={(e) => setData({ ...data, locale: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="en_US">English (US)</option>
              <option value="en_GB">English (UK)</option>
              <option value="es_ES">Spanish</option>
              <option value="fr_FR">French</option>
              <option value="de_DE">German</option>
              <option value="ja_JP">Japanese</option>
              <option value="zh_CN">Chinese (Simplified)</option>
            </select>
          </div>
        </div>

        {/* Preview & Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <h3 className="font-medium text-text-primary">Preview</h3>

          <FacebookCardPreview
            title={data.title}
            description={data.description}
            url={data.url}
            image={data.image}
            siteName={data.siteName}
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

      {/* AI Image Generator Modal */}
      <AiImageGeneratorModal
        isOpen={showAiGenerator}
        onClose={() => setShowAiGenerator(false)}
        presetType="og-image"
        onImageGenerated={(imagePath) => {
          setData({ ...data, image: imagePath });
        }}
      />
    </div>
  );
}

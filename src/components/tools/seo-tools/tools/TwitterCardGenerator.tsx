import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TwitterCardPreview } from "../previews/TwitterCardPreview";

interface TwitterCardData {
  cardType: "summary" | "summary_large_image";
  site: string;
  creator: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export function TwitterCardGenerator() {
  const [data, setData] = useState<TwitterCardData>({
    cardType: "summary_large_image",
    site: "",
    creator: "",
    title: "",
    description: "",
    image: "",
    imageAlt: "",
  });
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const lines: string[] = [];

    lines.push(`<meta name="twitter:card" content="${data.cardType}" />`);
    if (data.site) lines.push(`<meta name="twitter:site" content="${data.site}" />`);
    if (data.creator) lines.push(`<meta name="twitter:creator" content="${data.creator}" />`);
    if (data.title) lines.push(`<meta name="twitter:title" content="${data.title}" />`);
    if (data.description) lines.push(`<meta name="twitter:description" content="${data.description}" />`);
    if (data.image) {
      lines.push(`<meta name="twitter:image" content="${data.image}" />`);
      if (data.imageAlt) lines.push(`<meta name="twitter:image:alt" content="${data.imageAlt}" />`);
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setData({
      cardType: "summary_large_image",
      site: "",
      creator: "",
      title: "",
      description: "",
      image: "",
      imageAlt: "",
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <h3 className="font-medium text-text-primary">Twitter Card Settings</h3>

          {/* Card Type */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Card Type</label>
            <select
              value={data.cardType}
              onChange={(e) => setData({ ...data, cardType: e.target.value as TwitterCardData["cardType"] })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="summary_large_image">Summary Large Image</option>
              <option value="summary">Summary</option>
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Site Username</label>
            <input
              type="text"
              value={data.site}
              onChange={(e) => setData({ ...data, site: e.target.value })}
              placeholder="@yoursite"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Creator */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Creator Username</label>
            <input
              type="text"
              value={data.creator}
              onChange={(e) => setData({ ...data, creator: e.target.value })}
              placeholder="@author"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Title
              <span className={`ml-2 text-xs ${data.title.length > 70 ? "text-yellow-400" : "text-text-tertiary"}`}>
                ({data.title.length}/70)
              </span>
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="Tweet title"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Description
              <span className={`ml-2 text-xs ${data.description.length > 200 ? "text-yellow-400" : "text-text-tertiary"}`}>
                ({data.description.length}/200)
              </span>
            </label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Description for Twitter card"
              rows={3}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Image URL</label>
            <input
              type="url"
              value={data.image}
              onChange={(e) => setData({ ...data, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-text-tertiary mt-1">
              {data.cardType === "summary_large_image" ? "Recommended: 1200 x 600px" : "Recommended: 400 x 400px"}
            </p>
          </div>

          {/* Image Alt */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Image Alt Text</label>
            <input
              type="text"
              value={data.imageAlt}
              onChange={(e) => setData({ ...data, imageAlt: e.target.value })}
              placeholder="Description of the image"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Preview & Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <h3 className="font-medium text-text-primary">Preview</h3>

          <TwitterCardPreview
            cardType={data.cardType}
            title={data.title}
            description={data.description}
            url=""
            image={data.image}
            site={data.site}
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

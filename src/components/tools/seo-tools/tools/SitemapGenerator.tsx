import { useState } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

export function SitemapGenerator() {
  const [urls, setUrls] = useState<SitemapUrl[]>([
    { loc: "https://example.com/", lastmod: "", changefreq: "weekly", priority: "1.0" }
  ]);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    urls.forEach((url) => {
      if (url.loc) {
        lines.push("  <url>");
        lines.push(`    <loc>${url.loc}</loc>`);
        if (url.lastmod) {
          lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
        }
        if (url.changefreq) {
          lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
        }
        if (url.priority) {
          lines.push(`    <priority>${url.priority}</priority>`);
        }
        lines.push("  </url>");
      }
    });

    lines.push("</urlset>");
    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addUrl = () => {
    setUrls([...urls, { loc: "", lastmod: "", changefreq: "weekly", priority: "0.8" }]);
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, field: keyof SitemapUrl, value: string) => {
    const updated = [...urls];
    updated[index][field] = value;
    setUrls(updated);
  };

  const changefreqOptions = [
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never",
  ];

  const priorityOptions = [
    "1.0",
    "0.9",
    "0.8",
    "0.7",
    "0.6",
    "0.5",
    "0.4",
    "0.3",
    "0.2",
    "0.1",
  ];

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Sitemap URLs</h3>
            <Button size="sm" variant="default" onClick={addUrl}>
              <Plus className="w-3 h-3 mr-1" /> Add URL
            </Button>
          </div>

          {urls.map((url, index) => (
            <div
              key={index}
              className="p-4 bg-bg-secondary rounded-lg border border-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">URL {index + 1}</span>
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrl(index)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">URL (loc)</label>
                <input
                  type="url"
                  value={url.loc}
                  onChange={(e) => updateUrl(index, "loc", e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                />
              </div>

              {/* Last Modified */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">Last Modified (lastmod)</label>
                <input
                  type="date"
                  value={url.lastmod}
                  onChange={(e) => updateUrl(index, "lastmod", e.target.value)}
                  max={today}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Change Frequency */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Change Frequency</label>
                  <select
                    value={url.changefreq}
                    onChange={(e) => updateUrl(index, "changefreq", e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                  >
                    {changefreqOptions.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Priority</label>
                  <select
                    value={url.priority}
                    onChange={(e) => updateUrl(index, "priority", e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated sitemap.xml</h3>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre">
            {generateCode()}
          </pre>

          {/* Tips */}
          <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
            <h4 className="text-sm font-medium text-accent mb-2">Tips</h4>
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Save as sitemap.xml in your site root</li>
              <li>• Priority 1.0 = most important, 0.1 = least</li>
              <li>• Add sitemap URL to robots.txt</li>
              <li>• Submit to Google Search Console</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

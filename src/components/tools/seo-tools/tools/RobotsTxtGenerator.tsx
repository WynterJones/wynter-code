import { useState } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RobotRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export function RobotsTxtGenerator() {
  const [rules, setRules] = useState<RobotRule[]>([
    { userAgent: "*", allow: [], disallow: ["/admin", "/private"] }
  ]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [hostUrl, setHostUrl] = useState("");
  const [crawlDelay, setCrawlDelay] = useState("");
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const lines: string[] = [];

    rules.forEach((rule, index) => {
      if (index > 0) lines.push("");
      lines.push(`User-agent: ${rule.userAgent}`);

      if (crawlDelay && rule.userAgent === "*") {
        lines.push(`Crawl-delay: ${crawlDelay}`);
      }

      rule.disallow.forEach((path) => {
        if (path.trim()) lines.push(`Disallow: ${path}`);
      });

      rule.allow.forEach((path) => {
        if (path.trim()) lines.push(`Allow: ${path}`);
      });
    });

    if (sitemapUrl) {
      lines.push("");
      lines.push(`Sitemap: ${sitemapUrl}`);
    }

    if (hostUrl) {
      lines.push(`Host: ${hostUrl}`);
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addRule = () => {
    setRules([...rules, { userAgent: "Googlebot", allow: [], disallow: [] }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof RobotRule, value: string | string[]) => {
    const updated = [...rules];
    if (field === "userAgent") {
      updated[index].userAgent = value as string;
    } else if (field === "allow") {
      updated[index].allow = value as string[];
    } else if (field === "disallow") {
      updated[index].disallow = value as string[];
    }
    setRules(updated);
  };

  const addPath = (ruleIndex: number, type: "allow" | "disallow") => {
    const updated = [...rules];
    updated[ruleIndex][type].push("");
    setRules(updated);
  };

  const updatePath = (ruleIndex: number, type: "allow" | "disallow", pathIndex: number, value: string) => {
    const updated = [...rules];
    updated[ruleIndex][type][pathIndex] = value;
    setRules(updated);
  };

  const removePath = (ruleIndex: number, type: "allow" | "disallow", pathIndex: number) => {
    const updated = [...rules];
    updated[ruleIndex][type] = updated[ruleIndex][type].filter((_, i) => i !== pathIndex);
    setRules(updated);
  };

  const userAgentOptions = [
    "*",
    "Googlebot",
    "Googlebot-Image",
    "Googlebot-News",
    "Bingbot",
    "Yandex",
    "DuckDuckBot",
    "Baiduspider",
    "facebookexternalhit",
    "Twitterbot",
    "LinkedInBot",
    "AhrefsBot",
    "SemrushBot",
  ];

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <h3 className="font-medium text-text-primary">Robots.txt Configuration</h3>

          {/* Rules */}
          {rules.map((rule, ruleIndex) => (
            <div key={ruleIndex} className="p-4 bg-bg-secondary rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">Rule {ruleIndex + 1}</span>
                {rules.length > 1 && (
                  <button
                    onClick={() => removeRule(ruleIndex)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* User Agent */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">User-agent</label>
                <select
                  value={rule.userAgent}
                  onChange={(e) => updateRule(ruleIndex, "userAgent", e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {userAgentOptions.map((agent) => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>

              {/* Disallow Paths */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-secondary">Disallow</label>
                  <button
                    onClick={() => addPath(ruleIndex, "disallow")}
                    className="p-0.5 text-accent hover:bg-accent/10 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {rule.disallow.map((path, pathIndex) => (
                  <div key={pathIndex} className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => updatePath(ruleIndex, "disallow", pathIndex, e.target.value)}
                      placeholder="/path"
                      className="flex-1 px-3 py-1.5 bg-bg-primary border border-border rounded text-text-primary text-sm"
                    />
                    <button
                      onClick={() => removePath(ruleIndex, "disallow", pathIndex)}
                      className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Allow Paths */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-secondary">Allow (overrides)</label>
                  <button
                    onClick={() => addPath(ruleIndex, "allow")}
                    className="p-0.5 text-accent hover:bg-accent/10 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {rule.allow.map((path, pathIndex) => (
                  <div key={pathIndex} className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => updatePath(ruleIndex, "allow", pathIndex, e.target.value)}
                      placeholder="/path"
                      className="flex-1 px-3 py-1.5 bg-bg-primary border border-border rounded text-text-primary text-sm"
                    />
                    <button
                      onClick={() => removePath(ruleIndex, "allow", pathIndex)}
                      className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button variant="default" onClick={addRule} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Add Rule
          </Button>

          {/* Global Settings */}
          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-medium text-text-primary">Additional Settings</h4>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Sitemap URL</label>
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Host (optional)</label>
              <input
                type="text"
                value={hostUrl}
                onChange={(e) => setHostUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Crawl-delay (seconds)</label>
              <input
                type="number"
                value={crawlDelay}
                onChange={(e) => setCrawlDelay(e.target.value)}
                placeholder="10"
                min="0"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated robots.txt</h3>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
            {generateCode()}
          </pre>

          {/* Tips */}
          <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
            <h4 className="text-sm font-medium text-accent mb-2">Tips</h4>
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Place robots.txt at your site root: example.com/robots.txt</li>
              <li>• Use * for all crawlers or specify individual bots</li>
              <li>• Disallow rules block paths, Allow overrides them</li>
              <li>• Always include your sitemap URL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

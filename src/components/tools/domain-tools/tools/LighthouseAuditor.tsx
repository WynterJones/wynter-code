import { useState } from "react";
import { Search, Loader2, Download, TrendingUp, Smartphone, Monitor, FileText, FileCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface LighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

interface LighthouseMetrics {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  totalBlockingTime?: number;
  speedIndex?: number;
}

interface LighthouseResult {
  scores: LighthouseScore;
  metrics: LighthouseMetrics;
  recommendations: string[];
  url: string;
  device: "mobile" | "desktop";
  timestamp: number;
}

export function LighthouseAuditor() {
  const [url, setUrl] = useState("");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LighthouseResult | null>(null);

  const runLighthouse = async (targetUrl: string, deviceType: "mobile" | "desktop"): Promise<LighthouseResult> => {
    const lighthouseUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${deviceType}&category=performance&category=accessibility&category=best-practices&category=seo`;

    const response = await fetch(lighthouseUrl);
    if (!response.ok) {
      throw new Error("Failed to run Lighthouse audit");
    }

    const data = await response.json();

    const scores: LighthouseScore = {
      performance: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((data.lighthouseResult?.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((data.lighthouseResult?.categories?.["best-practices"]?.score || 0) * 100),
      seo: Math.round((data.lighthouseResult?.categories?.seo?.score || 0) * 100),
    };

    const audits = data.lighthouseResult?.audits || {};
    const metrics: LighthouseMetrics = {
      firstContentfulPaint: audits["first-contentful-paint"]?.numericValue,
      largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue,
      cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue,
      totalBlockingTime: audits["total-blocking-time"]?.numericValue,
      speedIndex: audits["speed-index"]?.numericValue,
    };

    const recommendations: string[] = [];
    Object.values(audits).forEach((audit: any) => {
      if (audit.score !== null && audit.score < 0.9 && audit.title) {
        recommendations.push(audit.title);
      }
    });

    return {
      scores,
      metrics,
      recommendations: recommendations.slice(0, 20),
      url: targetUrl,
      device: deviceType,
      timestamp: Date.now(),
    };
  };

  const handleAudit = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
      const auditResult = await runLighthouse(cleanUrl, device);
      setResult(auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run Lighthouse audit");
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!result) return;

    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lighthouse-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    if (!result) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Lighthouse Report - ${result.url}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 2rem 0; }
    .score-card { padding: 1.5rem; border-radius: 8px; text-align: center; }
    .score-value { font-size: 3rem; font-weight: bold; margin: 0.5rem 0; }
    .metrics { margin: 2rem 0; }
    .metric { padding: 0.5rem; border-bottom: 1px solid #eee; }
    .recommendations { margin: 2rem 0; }
    .recommendation { padding: 0.5rem; background: #f5f5f5; margin: 0.5rem 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Lighthouse Report</h1>
  <p><strong>URL:</strong> ${result.url}</p>
  <p><strong>Device:</strong> ${result.device}</p>
  <p><strong>Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
  
  <div class="scores">
    <div class="score-card" style="background: ${getScoreColor(result.scores.performance)}">
      <h3>Performance</h3>
      <div class="score-value">${result.scores.performance}</div>
    </div>
    <div class="score-card" style="background: ${getScoreColor(result.scores.accessibility)}">
      <h3>Accessibility</h3>
      <div class="score-value">${result.scores.accessibility}</div>
    </div>
    <div class="score-card" style="background: ${getScoreColor(result.scores.bestPractices)}">
      <h3>Best Practices</h3>
      <div class="score-value">${result.scores.bestPractices}</div>
    </div>
    <div class="score-card" style="background: ${getScoreColor(result.scores.seo)}">
      <h3>SEO</h3>
      <div class="score-value">${result.scores.seo}</div>
    </div>
  </div>

  <div class="metrics">
    <h2>Metrics</h2>
    ${result.metrics.firstContentfulPaint ? `<div class="metric"><strong>First Contentful Paint:</strong> ${formatMetric(result.metrics.firstContentfulPaint)}</div>` : ""}
    ${result.metrics.largestContentfulPaint ? `<div class="metric"><strong>Largest Contentful Paint:</strong> ${formatMetric(result.metrics.largestContentfulPaint)}</div>` : ""}
    ${result.metrics.cumulativeLayoutShift ? `<div class="metric"><strong>Cumulative Layout Shift:</strong> ${result.metrics.cumulativeLayoutShift.toFixed(3)}</div>` : ""}
    ${result.metrics.totalBlockingTime ? `<div class="metric"><strong>Total Blocking Time:</strong> ${formatMetric(result.metrics.totalBlockingTime)}</div>` : ""}
    ${result.metrics.speedIndex ? `<div class="metric"><strong>Speed Index:</strong> ${formatMetric(result.metrics.speedIndex)}</div>` : ""}
  </div>

  <div class="recommendations">
    <h2>Recommendations</h2>
    ${result.recommendations.map((rec) => `<div class="recommendation">${rec}</div>`).join("")}
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lighthouse-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "#10b98120";
    if (score >= 50) return "#f59e0b20";
    return "#ef444420";
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 90) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const formatMetric = (value: number): string => {
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAudit()}
            placeholder="Enter URL (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDevice("mobile")}
            className={cn(
              "px-3 py-2 rounded-lg border transition-colors flex items-center gap-2",
              device === "mobile"
                ? "bg-accent text-white border-accent"
                : "bg-bg-secondary border-border text-text-primary hover:bg-bg-hover"
            )}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </button>
          <button
            onClick={() => setDevice("desktop")}
            className={cn(
              "px-3 py-2 rounded-lg border transition-colors flex items-center gap-2",
              device === "desktop"
                ? "bg-accent text-white border-accent"
                : "bg-bg-secondary border-border text-text-primary hover:bg-bg-hover"
            )}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </button>
        </div>
        <Button onClick={handleAudit} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Audit"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-text-primary" />
              <span className="font-medium text-text-primary">Lighthouse Scores</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportJson} variant="outline" size="sm">
                <FileCode className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button onClick={handleExportHtml} variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                HTML
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
              <div className="text-sm text-text-secondary mb-2">Performance</div>
              <div className={cn("text-4xl font-bold mb-1", getScoreTextColor(result.scores.performance))}>
                {result.scores.performance}
              </div>
              <div className="text-xs text-text-tertiary">/ 100</div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
              <div className="text-sm text-text-secondary mb-2">Accessibility</div>
              <div className={cn("text-4xl font-bold mb-1", getScoreTextColor(result.scores.accessibility))}>
                {result.scores.accessibility}
              </div>
              <div className="text-xs text-text-tertiary">/ 100</div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
              <div className="text-sm text-text-secondary mb-2">Best Practices</div>
              <div className={cn("text-4xl font-bold mb-1", getScoreTextColor(result.scores.bestPractices))}>
                {result.scores.bestPractices}
              </div>
              <div className="text-xs text-text-tertiary">/ 100</div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
              <div className="text-sm text-text-secondary mb-2">SEO</div>
              <div className={cn("text-4xl font-bold mb-1", getScoreTextColor(result.scores.seo))}>
                {result.scores.seo}
              </div>
              <div className="text-xs text-text-tertiary">/ 100</div>
            </div>
          </div>

          {Object.keys(result.metrics).length > 0 && (
            <div className="bg-bg-secondary rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Core Web Vitals</h3>
              <div className="space-y-2">
                {result.metrics.firstContentfulPaint && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">First Contentful Paint</span>
                    <span className="text-sm font-mono text-text-primary">
                      {formatMetric(result.metrics.firstContentfulPaint)}
                    </span>
                  </div>
                )}
                {result.metrics.largestContentfulPaint && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Largest Contentful Paint</span>
                    <span className="text-sm font-mono text-text-primary">
                      {formatMetric(result.metrics.largestContentfulPaint)}
                    </span>
                  </div>
                )}
                {result.metrics.cumulativeLayoutShift !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Cumulative Layout Shift</span>
                    <span className="text-sm font-mono text-text-primary">
                      {result.metrics.cumulativeLayoutShift.toFixed(3)}
                    </span>
                  </div>
                )}
                {result.metrics.totalBlockingTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Total Blocking Time</span>
                    <span className="text-sm font-mono text-text-primary">
                      {formatMetric(result.metrics.totalBlockingTime)}
                    </span>
                  </div>
                )}
                {result.metrics.speedIndex && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Speed Index</span>
                    <span className="text-sm font-mono text-text-primary">
                      {formatMetric(result.metrics.speedIndex)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="bg-bg-secondary rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Recommendations</h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {result.recommendations.map((rec, index) => (
                  <div key={index} className="text-sm text-text-secondary p-2 bg-bg-tertiary rounded">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


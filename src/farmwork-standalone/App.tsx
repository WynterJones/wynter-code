/**
 * Farmwork Tycoon Standalone App
 * Mobile-optimized version that runs in a WebView
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { TycoonGame } from "@/components/tools/farmwork-tycoon/game/TycoonGame";
import { StatsSidebar } from "@/components/tools/farmwork-tycoon/sidebar/StatsSidebar";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { farmworkApi, type FarmworkStats } from "./api";
import type { AuditItem } from "@/components/tools/farmwork-tycoon/types";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

// Declare ReactNativeWebView for TypeScript
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

interface StandaloneConfig {
  host: string;
  port: number;
  token: string;
  projectPath: string;
}

function parseUrlParams(): StandaloneConfig | null {
  const params = new URLSearchParams(window.location.search);
  const host = params.get("host");
  const port = params.get("port");
  const token = params.get("token");
  const projectPath = params.get("project_path");

  if (!host || !port || !token || !projectPath) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    token,
    projectPath,
  };
}

function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400 text-sm">Loading Farmwork Tycoon...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-screen w-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-white text-lg font-semibold mb-2">Connection Error</h2>
        <p className="text-neutral-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameSize, setGameSize] = useState({ width: 400, height: 400 });
  const [showSidebar, setShowSidebar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const store = useFarmworkTycoonStore;

  // Update store with fetched stats (API returns snake_case, store uses camelCase)
  const updateStoreWithStats = useCallback((stats: FarmworkStats) => {
    const state = store.getState();

    // Convert snake_case API response to camelCase for store
    const auditScores = {
      security: { score: stats.audit_scores.security.score, openItems: stats.audit_scores.security.open_items as AuditItem[], lastUpdated: stats.audit_scores.security.last_updated ?? null, status: stats.audit_scores.security.status ?? null },
      tests: { score: stats.audit_scores.tests.score, openItems: stats.audit_scores.tests.open_items as AuditItem[], lastUpdated: stats.audit_scores.tests.last_updated ?? null, status: stats.audit_scores.tests.status ?? null },
      performance: { score: stats.audit_scores.performance.score, openItems: stats.audit_scores.performance.open_items as AuditItem[], lastUpdated: stats.audit_scores.performance.last_updated ?? null, status: stats.audit_scores.performance.status ?? null },
      accessibility: { score: stats.audit_scores.accessibility.score, openItems: stats.audit_scores.accessibility.open_items as AuditItem[], lastUpdated: stats.audit_scores.accessibility.last_updated ?? null, status: stats.audit_scores.accessibility.status ?? null },
      codeQuality: { score: stats.audit_scores.code_quality.score, openItems: stats.audit_scores.code_quality.open_items as AuditItem[], lastUpdated: stats.audit_scores.code_quality.last_updated ?? null, status: stats.audit_scores.code_quality.status ?? null },
      farmhouse: { score: stats.audit_scores.farmhouse.score, openItems: stats.audit_scores.farmhouse.open_items as AuditItem[], lastUpdated: stats.audit_scores.farmhouse.last_updated ?? null, status: stats.audit_scores.farmhouse.status ?? null },
    };

    const gardenStats = stats.garden_stats ? {
      activeIdeas: stats.garden_stats.active_ideas,
      ideas: [],
      planted: stats.garden_stats.planted,
      growing: stats.garden_stats.growing,
      picked: stats.garden_stats.picked,
    } : undefined;

    const compostStats = stats.compost_stats ? {
      rejectedIdeas: stats.compost_stats.rejected_ideas,
      ideas: [],
    } : undefined;

    // Update audit scores
    store.setState({ auditScores });

    // Update garden stats
    if (gardenStats) {
      store.setState({ gardenStats });
    }

    // Update compost stats
    if (compostStats) {
      store.setState({ compostStats });
    }

    // Update beads stats
    if (stats.beads_stats) {
      store.setState({ beadsStats: stats.beads_stats });
    }

    // Update building scores
    store.setState({
      buildings: state.buildings.map((b) => {
        let newScore = 0;
        switch (b.type) {
          case "security":
            newScore = stats.audit_scores.security.score;
            break;
          case "tests":
            newScore = stats.audit_scores.tests.score;
            break;
          case "performance":
            newScore = stats.audit_scores.performance.score;
            break;
          case "accessibility":
            newScore = stats.audit_scores.accessibility.score;
            break;
          case "codeQuality":
            newScore = stats.audit_scores.code_quality.score;
            break;
          case "farmhouse":
            newScore = stats.audit_scores.farmhouse.score;
            break;
          case "garden":
            newScore = stats.garden_stats?.active_ideas ?? 0;
            break;
          case "compost":
            newScore = stats.compost_stats?.rejected_ideas ?? 0;
            break;
          default:
            newScore = b.score;
        }
        return { ...b, score: newScore };
      }),
    });
  }, [store]);

  // Initialize on mount
  useEffect(() => {
    const config = parseUrlParams();

    if (!config) {
      setError("Missing connection parameters. Please open from the mobile app.");
      setLoading(false);
      return;
    }

    farmworkApi.configure(config);

    // Fetch initial stats
    const fetchStats = async () => {
      try {
        const stats = await farmworkApi.fetchStats();
        updateStoreWithStats(stats);
        store.setState({ isInitialized: true });
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        setError("Failed to connect to desktop. Make sure Wynter Code is running.");
        setLoading(false);
      }
    };

    fetchStats();

    // Poll for updates every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const stats = await farmworkApi.fetchStats();
        updateStoreWithStats(stats);
      } catch (err) {
        console.error("Poll failed:", err);
      }
    }, 5000);

    // Connect WebSocket for real-time updates
    try {
      const ws = farmworkApi.connectWebSocket((data) => {
        // Handle real-time updates
        console.log("WebSocket update:", data);
      });

      return () => {
        clearInterval(pollInterval);
        ws.close();
      };
    } catch {
      // WebSocket failed, polling will still work
      return () => clearInterval(pollInterval);
    }
  }, [updateStoreWithStats, store]);

  // Calculate game size based on viewport
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Reserve space for sidebar toggle on mobile
      const sidebarWidth = showSidebar ? 280 : 0;
      const availableWidth = vw - sidebarWidth;
      const availableHeight = vh;

      // Make game square and fit in available space
      const size = Math.min(availableWidth, availableHeight);

      setGameSize({ width: size, height: size });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [showSidebar]);

  // Handle visibility changes to prevent animation pause in mobile WebViews
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Resume animations when page becomes visible
        store.getState().resume();
        // Force a re-render to kick the ticker
        setGameSize((prev) => ({ ...prev }));
      } else {
        // Pause when hidden to save resources
        store.getState().pause();
      }
    };

    const handleFocus = () => {
      store.getState().resume();
    };

    const handleBlur = () => {
      // Don't pause on blur - only on visibility hidden
      // This prevents pausing when interacting with overlays
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pageshow", handleFocus);

    // Ensure we start in resumed state
    store.getState().resume();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pageshow", handleFocus);
    };
  }, [store]);

  // Send messages to React Native
  const sendToReactNative = useCallback((type: string, data?: unknown) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }
  }, []);

  // Handle building click
  const handleBuildingClick = useCallback((buildingId: string) => {
    sendToReactNative("building_click", { buildingId });
    // On mobile, show sidebar when building is clicked
    setShowSidebar(true);
  }, [sendToReactNative]);

  // Handle opening audit files - send to React Native to navigate to docs
  const handleOpenAuditFile = useCallback((buildingType: string) => {
    // Map building type to audit file path
    const auditFileMap: Record<string, string> = {
      security: "_AUDIT/SECURITY.md",
      tests: "_AUDIT/TESTS.md",
      performance: "_AUDIT/PERFORMANCE.md",
      accessibility: "_AUDIT/ACCESSIBILITY.md",
      codeQuality: "_AUDIT/CODE_QUALITY.md",
      farmhouse: "_AUDIT/FARMHOUSE.md",
      garden: "_AUDIT/GARDEN.md",
      compost: "_AUDIT/COMPOST.md",
    };

    const filePath = auditFileMap[buildingType];
    if (filePath) {
      // Send message to React Native to open docs screen with this file
      sendToReactNative("open_doc", { filePath });
    }
  }, [sendToReactNative]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-neutral-950 overflow-hidden flex"
    >
      {/* Game Canvas */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ minWidth: 0 }}
      >
        <TycoonGame
          containerWidth={gameSize.width}
          containerHeight={gameSize.height}
          autoScale={true}
          isMiniPlayer={false}
          onBuildingClick={handleBuildingClick}
          onOpenAuditFile={handleOpenAuditFile}
        />

        {/* Toggle sidebar button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-4 right-4 z-50 bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-lg shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showSidebar ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar - slide in on mobile */}
      {showSidebar && (
        <div className="w-72 flex-shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Stats</span>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-neutral-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <OverlayScrollbarsComponent
            className="flex-1 min-h-0"
            options={{ scrollbars: { autoHide: "scroll" } }}
          >
            <StatsSidebar />
          </OverlayScrollbarsComponent>
        </div>
      )}
    </div>
  );
}

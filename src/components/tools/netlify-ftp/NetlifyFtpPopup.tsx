import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Plug,
  Plus,
  RefreshCw,
  Settings,
  LogOut,
  Monitor,
  Palette,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useNetlifyFtpStore } from "@/stores/netlifyFtpStore";
import { RetroDropZone } from "./RetroDropZone";
import { SiteList } from "./SiteList";
import { DeployHistory } from "./DeployHistory";
import { StatusBar } from "./StatusBar";
import { TokenSetup } from "./TokenSetup";
import { SiteSettings } from "./SiteSettings";
import "./netlify-ftp.css";

interface NetlifyFtpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type Theme = "classic" | "terminal" | "amber";

export function NetlifyFtpPopup({ isOpen, onClose }: NetlifyFtpPopupProps) {
  const [theme, setTheme] = useState<Theme>("terminal");
  const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [showSiteSettings, setShowSiteSettings] = useState(false);

  const {
    apiToken,
    connectionStatus,
    connectionError,
    sites,
    currentSiteId,
    isLoadingSites,
    deploys,
    isLoadingDeploys,
    isDeploying,
    deployProgress,
    deployMessage,
    setApiToken,
    testConnection,
    disconnect,
    fetchSites,
    selectSite,
    createSite,
    deleteSite,
    fetchDeploys,
    deployZip,
    rollbackDeploy,
    clearError,
  } = useNetlifyFtpStore();

  const currentSite = useMemo(
    () => sites.find((s) => s.id === currentSiteId) || null,
    [sites, currentSiteId]
  );

  const currentDeploys = useMemo(
    () => (currentSiteId ? deploys[currentSiteId] || [] : []),
    [deploys, currentSiteId]
  );

  // Auto-connect on mount if token exists
  useEffect(() => {
    if (isOpen && apiToken && connectionStatus === "disconnected") {
      testConnection();
    }
  }, [isOpen, apiToken, connectionStatus, testConnection]);

  const handleConnect = useCallback(
    async (token: string) => {
      setApiToken(token);
      await testConnection();
    },
    [setApiToken, testConnection]
  );

  const handleDisconnect = useCallback(() => {
    disconnect();
    setApiToken(null);
  }, [disconnect, setApiToken]);

  const handleCreateSite = useCallback(async () => {
    if (newSiteName.trim()) {
      const site = await createSite(newSiteName.trim());
      if (site) {
        selectSite(site.id);
        setNewSiteName("");
        setShowNewSiteDialog(false);
      }
    }
  }, [newSiteName, createSite, selectSite]);

  const handleDeleteSite = useCallback(
    async (siteId: string) => {
      if (confirm("Are you sure you want to delete this site?")) {
        await deleteSite(siteId);
      }
    },
    [deleteSite]
  );

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (currentSiteId) {
        await deployZip({
          siteId: currentSiteId,
          file,
        });
      }
    },
    [currentSiteId, deployZip]
  );

  const handleRollback = useCallback(
    async (deployId: string) => {
      if (currentSiteId) {
        await rollbackDeploy(currentSiteId, deployId);
      }
    },
    [currentSiteId, rollbackDeploy]
  );

  const isTerminalTheme = theme === "terminal" || theme === "amber";
  const isConnected = connectionStatus === "connected";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={false}>
      <div
        className={cn(
          "netlify-ftp flex flex-col h-[600px]",
          theme === "terminal" && "theme-terminal",
          theme === "amber" && "theme-amber"
        )}
      >
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span>Netlify FTP Manager v1.0</span>
          </div>
          <div className="retro-titlebar-buttons">
            <button
              className="retro-titlebar-button"
              onClick={() => {}}
              title="Minimize"
            >
              _
            </button>
            <button
              className="retro-titlebar-button"
              onClick={() => {}}
              title="Maximize"
            >
              □
            </button>
            <button
              className="retro-titlebar-button"
              onClick={onClose}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="retro-toolbar">
          {isConnected ? (
            <>
              <button
                className="retro-toolbar-button"
                onClick={handleDisconnect}
                title="Disconnect"
              >
                <LogOut className="w-3 h-3" />
                Disconnect
              </button>
              <div className="retro-toolbar-separator" />
              <button
                className="retro-toolbar-button"
                onClick={() => setShowNewSiteDialog(true)}
                title="New Site"
              >
                <Plus className="w-3 h-3" />
                New Site
              </button>
              <button
                className="retro-toolbar-button"
                onClick={() => fetchSites()}
                disabled={isLoadingSites}
                title="Refresh"
              >
                <RefreshCw
                  className={cn("w-3 h-3", isLoadingSites && "animate-spin")}
                />
                Refresh
              </button>
              {currentSite && (
                <>
                  <div className="retro-toolbar-separator" />
                  <button
                    className="retro-toolbar-button"
                    onClick={() => setShowSiteSettings(true)}
                    title="Site Settings"
                  >
                    <Settings className="w-3 h-3" />
                    Settings
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              className="retro-toolbar-button"
              onClick={() => apiToken && testConnection()}
              disabled={!apiToken || connectionStatus === "connecting"}
              title="Connect"
            >
              <Plug className="w-3 h-3" />
              Connect
            </button>
          )}

          <div className="flex-1" />

          {/* Theme switcher */}
          <div className="flex items-center gap-1">
            <Palette className="w-3 h-3 opacity-50" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="retro-input text-[10px] py-0"
            >
              <option value="classic">Classic</option>
              <option value="terminal">Terminal</option>
              <option value="amber">Amber</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className={cn("flex-1 min-h-0", isTerminalTheme && "crt-scanlines")}>
          {!apiToken || connectionStatus === "disconnected" ? (
            <TokenSetup
              onSubmit={handleConnect}
              isConnecting={connectionStatus === "connecting"}
              error={connectionError}
              theme={theme}
            />
          ) : connectionStatus === "connecting" ? (
            <div
              className={cn(
                "flex items-center justify-center h-full",
                isTerminalTheme && "crt-glow"
              )}
            >
              <div className="text-center">
                <div className="text-sm mb-2">
                  Connecting to Netlify
                  <span className="blink">...</span>
                </div>
                <div className="text-xs opacity-70">
                  Establishing secure connection
                </div>
              </div>
            </div>
          ) : connectionStatus === "error" ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div
                className={cn(
                  "text-red-500 text-sm mb-4",
                  isTerminalTheme && "crt-glow"
                )}
              >
                Connection Failed
              </div>
              <div className="text-xs mb-4 text-center max-w-md">
                {connectionError}
              </div>
              <div className="flex gap-2">
                <button
                  className="retro-button"
                  onClick={() => testConnection()}
                >
                  Retry
                </button>
                <button
                  className="retro-button"
                  onClick={() => {
                    clearError();
                    setApiToken(null);
                  }}
                >
                  Change Token
                </button>
              </div>
            </div>
          ) : (
            <div className="retro-split-pane">
              {/* Left Pane - Sites */}
              <div className="retro-pane" style={{ maxWidth: "200px" }}>
                <div className="retro-pane-header">📁 My Sites</div>
                <div className="retro-pane-content">
                  <SiteList
                    sites={sites}
                    selectedSiteId={currentSiteId}
                    onSelectSite={selectSite}
                    onDeleteSite={handleDeleteSite}
                    isLoading={isLoadingSites}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Right Pane - Deploy Zone & History */}
              <div className="retro-pane">
                <div className="retro-pane-header">
                  📤 {currentSite ? currentSite.name : "Select a site"}
                </div>
                <div className="retro-pane-content flex flex-col">
                  {currentSite ? (
                    <>
                      {/* Drop Zone */}
                      <div className="p-3 border-b border-current/20">
                        <RetroDropZone
                          onFileDrop={handleFileDrop}
                          isUploading={isDeploying}
                          progress={deployProgress}
                          message={deployMessage}
                          disabled={!currentSite}
                          theme={theme}
                        />
                      </div>

                      {/* Deploy History */}
                      <div className="flex-1 min-h-0">
                        <DeployHistory
                          deploys={currentDeploys}
                          isLoading={isLoadingDeploys}
                          onRollback={handleRollback}
                          theme={theme}
                        />
                      </div>
                    </>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center justify-center h-full text-sm",
                        isTerminalTheme && "crt-glow"
                      )}
                    >
                      ← Select a site to deploy
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <StatusBar
          status={connectionStatus}
          currentSite={currentSite}
          error={connectionError}
          theme={theme}
        />

        {/* Site Settings Modal */}
        {showSiteSettings && currentSite && (
          <SiteSettings
            site={currentSite}
            onClose={() => setShowSiteSettings(false)}
            theme={theme}
          />
        )}

        {/* New Site Dialog */}
        {showNewSiteDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <div
              className={cn(
                "retro-raised w-full max-w-sm",
                isTerminalTheme && "bg-[#0a0a0a]"
              )}
            >
              <div className="retro-titlebar">
                <span>Create New Site</span>
                <div className="retro-titlebar-buttons">
                  <button
                    className="retro-titlebar-button"
                    onClick={() => setShowNewSiteDialog(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={cn("p-4", isTerminalTheme && "crt-glow")}>
                <div className="text-xs mb-2">Site name (subdomain):</div>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="my-awesome-site"
                  className="retro-input w-full mb-4 font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSite();
                    if (e.key === "Escape") setShowNewSiteDialog(false);
                  }}
                />
                <div className="text-[10px] opacity-70 mb-4">
                  URL will be: {newSiteName || "my-site"}.netlify.app
                </div>
                <div className="flex gap-2">
                  <button
                    className="retro-button flex-1"
                    onClick={handleCreateSite}
                    disabled={!newSiteName.trim()}
                  >
                    Create
                  </button>
                  <button
                    className="retro-button"
                    onClick={() => setShowNewSiteDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Plug,
  Plus,
  RefreshCw,
  Settings,
  LogOut,
  Loader2,
  Upload,
} from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useNetlifyFtpStore } from "@/stores/netlifyFtpStore";
import { DropZone } from "./DropZone";
import { SiteList } from "./SiteList";
import { DeployHistory } from "./DeployHistory";
import { StatusBar } from "./StatusBar";
import { TokenSetup } from "./TokenSetup";
import { SiteSettings } from "./SiteSettings";

interface NetlifyFtpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;

export function NetlifyFtpPopup({ isOpen, onClose }: NetlifyFtpPopupProps) {
  const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

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
    deployZip,
    rollbackDeploy,
    clearError,
  } = useNetlifyFtpStore();

  const currentSite = useMemo(
    () => sites.find((s) => s.id === currentSiteId) || null,
    [sites, currentSiteId],
  );

  const currentDeploys = useMemo(
    () => (currentSiteId ? deploys[currentSiteId] || [] : []),
    [deploys, currentSiteId],
  );

  // Auto-connect on mount if token exists
  useEffect(() => {
    if (isOpen && apiToken && connectionStatus === "disconnected") {
      testConnection();
    }
  }, [isOpen, apiToken, connectionStatus, testConnection]);

  // Sidebar resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    },
    [sidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaX = e.clientX - resizeRef.current.startX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + deltaX),
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleConnect = useCallback(
    async (token: string) => {
      setApiToken(token);
      await testConnection();
    },
    [setApiToken, testConnection],
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
    [deleteSite],
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
    [currentSiteId, deployZip],
  );

  const handleRollback = useCallback(
    async (deployId: string) => {
      if (currentSiteId) {
        await rollbackDeploy(currentSiteId, deployId);
      }
    },
    [currentSiteId, rollbackDeploy],
  );

  const isConnected = connectionStatus === "connected";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="Netlify FTP">
      <div className={cn("flex flex-col h-full", isResizing && "select-none")}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          {isConnected ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <LogOut className="w-4 h-4 mr-1.5" />
                Disconnect
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewSiteDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Site
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchSites()}
                disabled={isLoadingSites}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-1.5",
                    isLoadingSites && "animate-spin",
                  )}
                />
                Refresh
              </Button>
              {currentSite && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSiteSettings(true)}
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    Settings
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => apiToken && testConnection()}
              disabled={!apiToken || connectionStatus === "connecting"}
            >
              <Plug className="w-4 h-4 mr-1.5" />
              Connect
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          {!apiToken || connectionStatus === "disconnected" ? (
            <TokenSetup
              onSubmit={handleConnect}
              isConnecting={connectionStatus === "connecting"}
              error={connectionError}
            />
          ) : connectionStatus === "connecting" ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
                <div className="text-sm text-text-primary mb-1">
                  Connecting to Netlify
                </div>
                <div className="text-xs text-text-secondary">
                  Establishing secure connection
                </div>
              </div>
            </div>
          ) : connectionStatus === "error" ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="text-accent-red text-sm font-medium mb-2">
                Connection Failed
              </div>
              <div className="text-xs text-text-secondary mb-4 text-center max-w-md">
                {connectionError}
              </div>
              <div className="flex gap-2">
                <Button variant="default" onClick={() => testConnection()}>
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearError();
                    setApiToken(null);
                  }}
                >
                  Change Token
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 h-full">
              {/* Left Pane - Sites */}
              <div
                className="relative border-r border-border flex flex-col shrink-0 bg-bg-primary"
                style={{ width: sidebarWidth }}
              >
                <SiteList
                  sites={sites}
                  selectedSiteId={currentSiteId}
                  onSelectSite={selectSite}
                  onDeleteSite={handleDeleteSite}
                  isLoading={isLoadingSites}
                />

                {/* Resize handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className={cn(
                    "absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-accent/50 transition-colors",
                    isResizing && "bg-accent/50",
                  )}
                />
              </div>

              {/* Right Pane - Deploy Zone & History */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Upload className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium">
                    {currentSite ? currentSite.name : "Select a site"}
                  </span>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  {currentSite ? (
                    <>
                      {/* Drop Zone */}
                      <div className="p-3 border-b border-border">
                        <DropZone
                          onFileDrop={handleFileDrop}
                          isUploading={isDeploying}
                          progress={deployProgress}
                          message={deployMessage}
                          disabled={!currentSite}
                        />
                      </div>

                      {/* Deploy History */}
                      <div className="flex-1 min-h-0">
                        <DeployHistory
                          deploys={currentDeploys}
                          isLoading={isLoadingDeploys}
                          onRollback={handleRollback}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                      Select a site to deploy
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
        />

        {/* Site Settings Modal */}
        {showSiteSettings && currentSite && (
          <SiteSettings
            site={currentSite}
            onClose={() => setShowSiteSettings(false)}
          />
        )}

        {/* New Site Dialog */}
        {showNewSiteDialog && (
          <Modal
            isOpen={showNewSiteDialog}
            onClose={() => setShowNewSiteDialog(false)}
            title="Create New Site"
            size="sm"
          >
            <div className="p-4">
              <label className="block text-sm text-text-secondary mb-2">
                Site name (subdomain)
              </label>
              <Input
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="my-awesome-site"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSite();
                  if (e.key === "Escape") setShowNewSiteDialog(false);
                }}
              />
              <p className="text-xs text-text-secondary mt-2">
                URL will be: {newSiteName || "my-site"}.netlify.app
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreateSite}
                  disabled={!newSiteName.trim()}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowNewSiteDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
}

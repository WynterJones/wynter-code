import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Plug,
  Plus,
  RefreshCw,
  LogOut,
  Loader2,
  Upload,
  ExternalLink,
  FolderPlus,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { Popup, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useNetlifyFtpStore } from "@/stores/netlifyFtpStore";
import { useProjectStore } from "@/stores/projectStore";
import { DropZone } from "./DropZone";
import { SiteList } from "./SiteList";
import { DeployHistory } from "./DeployHistory";
import { TokenSetup } from "./TokenSetup";

interface DeployZipResult {
  base64: string;
  folder_name: string;
  is_build_folder: boolean;
}

interface NetlifyFtpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;

export function NetlifyFtpPopup({ isOpen, onClose }: NetlifyFtpPopupProps) {
  const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isDeployingProject, setIsDeployingProject] = useState(false);
  const [deployProjectMessage, setDeployProjectMessage] = useState("");
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Get active project
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

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
    groups,
    ungroupedCollapsed,
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
    createGroup,
    renameGroup,
    deleteGroup,
    toggleGroupCollapse,
    toggleUngroupedCollapse,
    reorderGroups,
    addSiteToGroup,
    removeSiteFromGroup,
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

  const handleCreateGroup = useCallback(() => {
    if (newGroupName.trim()) {
      createGroup(newGroupName.trim());
      setNewGroupName("");
      setShowNewGroupDialog(false);
    }
  }, [newGroupName, createGroup]);

  const handleDeleteSite = useCallback(
    async (siteId: string) => {
      await deleteSite(siteId);
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

  const handleDeployProjectClick = useCallback(() => {
    if (!currentSiteId || !activeProject?.path) return;
    setShowDeployConfirm(true);
  }, [currentSiteId, activeProject?.path]);

  const handleDeployProjectConfirm = useCallback(async () => {
    setShowDeployConfirm(false);
    if (!currentSiteId || !activeProject?.path) return;

    setIsDeployingProject(true);
    setDeployProjectMessage("Preparing project...");

    try {
      // Call Tauri command to zip the project
      setDeployProjectMessage("Detecting build folder...");
      const result = await invoke<DeployZipResult>("zip_folder_for_deploy", {
        projectPath: activeProject.path,
      });

      const folderLabel = result.is_build_folder
        ? result.folder_name
        : "project";
      setDeployProjectMessage(`Zipping ${folderLabel}...`);

      // Convert base64 to File
      const binaryString = atob(result.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const file = new File([bytes], `${result.folder_name}.zip`, {
        type: "application/zip",
      });

      // Deploy using existing store method
      setDeployProjectMessage("Uploading to Netlify...");
      await deployZip({
        siteId: currentSiteId,
        file,
      });

      setDeployProjectMessage("");
    } catch (error) {
      console.error("Failed to deploy project:", error);
      setDeployProjectMessage("");
    } finally {
      setIsDeployingProject(false);
    }
  }, [currentSiteId, activeProject?.path, deployZip]);

  const handleOpenSite = useCallback(async () => {
    if (currentSite) {
      const url = currentSite.custom_domain
        ? `https://${currentSite.custom_domain}`
        : currentSite.ssl_url || currentSite.url;
      try {
        await open(url);
      } catch (err) {
        console.error("Failed to open URL:", err);
      }
    }
  }, [currentSite]);

  const isConnected = connectionStatus === "connected";

  // Get display URL for current site
  const currentSiteUrl = currentSite
    ? currentSite.custom_domain || currentSite.url.replace(/https?:\/\//, "")
    : "";

  return (
    <Popup isOpen={isOpen} onClose={onClose} size="full">
      <Popup.Header
        icon={Upload}
        title="Netlify FTP"
        actions={
          isConnected ? (
            <div className="flex items-center gap-1">
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
                  className={cn("w-4 h-4", isLoadingSites && "animate-spin")}
                />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
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
          )
        }
      />

      <Popup.Content scrollable={false} padding="none">
        <div className={cn("flex h-full", isResizing && "select-none")}>
          {!apiToken || connectionStatus === "disconnected" ? (
            <div className="w-full">
              <TokenSetup
                onSubmit={handleConnect}
                isConnecting={connectionStatus === "connecting"}
                error={connectionError}
              />
            </div>
          ) : connectionStatus === "connecting" ? (
            <div className="flex items-center justify-center w-full">
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
            <div className="flex flex-col items-center justify-center w-full p-8">
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
            <>
              {/* Left Pane - Sites */}
              <div
                className="relative border-r border-border flex flex-col shrink-0 bg-bg-primary"
                style={{ width: sidebarWidth }}
              >
                {/* Group header with add button */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
                  <span className="text-xs text-text-secondary font-medium">Sites</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewGroupDialog(true)}
                    title="New Group"
                    className="!p-1 !h-6"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <SiteList
                  sites={sites}
                  selectedSiteId={currentSiteId}
                  onSelectSite={selectSite}
                  onDeleteSite={handleDeleteSite}
                  isLoading={isLoadingSites}
                  groups={groups}
                  ungroupedCollapsed={ungroupedCollapsed}
                  onToggleGroupCollapse={toggleGroupCollapse}
                  onToggleUngroupedCollapse={toggleUngroupedCollapse}
                  onRenameGroup={renameGroup}
                  onDeleteGroup={deleteGroup}
                  onReorderGroups={reorderGroups}
                  onAddSiteToGroup={addSiteToGroup}
                  onRemoveSiteFromGroup={removeSiteFromGroup}
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
              <div className="flex-1 flex flex-col min-w-0 bg-bg-secondary">
                {currentSite ? (
                  <>
                    {/* Site Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-primary">
                      {/* Screenshot thumbnail */}
                      {currentSite.screenshot_url ? (
                        <img
                          src={currentSite.screenshot_url}
                          alt={currentSite.name}
                          className="w-16 h-10 object-cover rounded border border-border"
                        />
                      ) : (
                        <div className="w-16 h-10 rounded border border-border bg-bg-tertiary flex items-center justify-center">
                          <Upload className="w-4 h-4 text-text-secondary" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Site name */}
                        <div className="text-sm font-medium text-text-primary truncate">
                          {currentSite.name}
                        </div>

                        {/* URL */}
                        <button
                          onClick={handleOpenSite}
                          className="flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          {currentSiteUrl}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Drop Zone */}
                    <div className="p-4 border-b border-border">
                      <DropZone
                        onFileDrop={handleFileDrop}
                        isUploading={isDeploying}
                        progress={deployProgress}
                        message={deployMessage}
                        disabled={!currentSite}
                        projectPath={activeProject?.path}
                        projectName={activeProject?.name}
                        onDeployProject={handleDeployProjectClick}
                        isDeployingProject={isDeployingProject}
                        deployProjectMessage={deployProjectMessage}
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
            </>
          )}
        </div>

        {/* New Site Dialog */}
        {showNewSiteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-bg-secondary border border-border rounded-lg p-4 w-80">
              <h3 className="text-sm font-semibold mb-3">Create New Site</h3>
              <label className="block text-xs text-text-secondary mb-2">
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
          </div>
        )}

        {/* New Group Dialog */}
        {showNewGroupDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-bg-secondary border border-border rounded-lg p-4 w-80">
              <h3 className="text-sm font-semibold mb-3">Create New Group</h3>
              <label className="block text-xs text-text-secondary mb-2">
                Group name
              </label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="My Group"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") setShowNewGroupDialog(false);
                }}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowNewGroupDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deploy Confirmation Dialog */}
        {showDeployConfirm && currentSite && activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-bg-secondary border border-border rounded-lg p-4 w-96">
              <h3 className="text-sm font-semibold mb-3">Deploy to Netlify</h3>
              <p className="text-xs text-text-secondary mb-4">
                Deploy <span className="text-text-primary font-medium">{activeProject.name}</span> to{" "}
                <span className="text-accent font-medium">
                  {currentSite.custom_domain || currentSite.url.replace(/https?:\/\//, "")}
                </span>?
              </p>
              <p className="text-xs text-text-secondary mb-4">
                The build folder (if detected) or full project will be uploaded.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleDeployProjectConfirm}
                >
                  Deploy
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDeployConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </Popup.Content>
    </Popup>
  );
}

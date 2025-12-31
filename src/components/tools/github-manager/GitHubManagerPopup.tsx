import { useEffect, useCallback, useState } from "react";
import {
  Github,
  Star,
  Building2,
  Search,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Loader2,
  User,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useGitHubManagerStore } from "@/stores/githubManagerStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { cn } from "@/lib/utils";
import type { GitHubTab, GhRepo } from "@/types/github";
import { RepoList } from "./RepoList";
import { SearchPanel } from "./SearchPanel";
import { ConnectWorkflow } from "./ConnectWorkflow";
import { RepoDetailView } from "./RepoDetailView";

interface GitHubManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath?: string;
}

const TABS: { id: GitHubTab; label: string; icon: typeof Github }[] = [
  { id: "my-repos", label: "My Repos", icon: Github },
  { id: "starred", label: "Starred", icon: Star },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "search", label: "Search", icon: Search },
];

export function GitHubManagerPopup({
  isOpen,
  onClose,
  projectPath,
}: GitHubManagerPopupProps) {
  const {
    authStatus,
    authLoading,
    activeTab,
    setActiveTab,
    selectedRepo,
    setSelectedRepo,
    showConnectWorkflow,
    setShowConnectWorkflow,
    showRepoDetail,
    setShowRepoDetail,
    viewRepo,
    checkAuth,
    error,
    clearError,
    myRepos,
    myReposLoading,
    starredRepos,
    starredReposLoading,
    orgs,
    orgsLoading,
    selectedOrg,
    setSelectedOrg,
    orgRepos,
    orgReposLoading,
    loadMyRepos,
    loadStarredRepos,
    loadOrgs,
    loadOrgRepos,
  } = useGitHubManagerStore();

  // Terminal integration for running install/auth commands
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const { createSession } = useSessionStore();
  const { queueCommand } = useTerminalStore();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Determine if gh is not installed vs just not authenticated
  const ghNotInstalled = authStatus?.error?.includes("not found");

  const handleRunInTerminal = (command: string) => {
    if (!activeProjectId) return;
    const sessionId = createSession(activeProjectId, "terminal");
    queueCommand(sessionId, command);
    onClose();
  };

  const handleCopyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Check auth on open
  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, checkAuth]);

  // Load data when tab changes
  useEffect(() => {
    if (!isOpen || !authStatus?.isAuthenticated) return;

    switch (activeTab) {
      case "my-repos":
        if (myRepos.length === 0) loadMyRepos();
        break;
      case "starred":
        if (starredRepos.length === 0) loadStarredRepos();
        break;
      case "orgs":
        if (orgs.length === 0) loadOrgs();
        break;
    }
  }, [
    isOpen,
    activeTab,
    authStatus?.isAuthenticated,
    myRepos.length,
    starredRepos.length,
    orgs.length,
    loadMyRepos,
    loadStarredRepos,
    loadOrgs,
  ]);

  // Load org repos when org is selected
  useEffect(() => {
    if (selectedOrg && !orgRepos[selectedOrg]) {
      loadOrgRepos(selectedOrg);
    }
  }, [selectedOrg, orgRepos, loadOrgRepos]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConnectWorkflow) {
          setShowConnectWorkflow(false);
        } else if (showRepoDetail) {
          setShowRepoDetail(false);
        } else if (selectedRepo) {
          setSelectedRepo(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, showConnectWorkflow, showRepoDetail, selectedRepo, setShowConnectWorkflow, setShowRepoDetail, setSelectedRepo]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleRefresh = () => {
    switch (activeTab) {
      case "my-repos":
        loadMyRepos();
        break;
      case "starred":
        loadStarredRepos();
        break;
      case "orgs":
        loadOrgs();
        if (selectedOrg) loadOrgRepos(selectedOrg);
        break;
    }
  };

  const isLoading =
    myReposLoading || starredReposLoading || orgsLoading || orgReposLoading;

  const handleSelectRepo = (repo: GhRepo) => {
    setSelectedRepo(repo);
    // Extract owner from repo.url or use the owner field
    const owner = repo.owner?.login || repo.url.split("/").slice(-2, -1)[0];
    viewRepo(owner, repo.name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3" data-tauri-drag-region>
            <Github className="w-5 h-5 text-accent" />
            <span className="font-medium text-text-primary" data-tauri-drag-region>
              GitHub Manager
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 mr-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!authStatus?.isAuthenticated}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-accent text-[#3d2066]"
                      : "hover:bg-bg-hover text-text-secondary",
                    !authStatus?.isAuthenticated && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Auth Status */}
            <AuthStatusBadge
              status={authStatus}
              loading={authLoading}
              onRecheck={checkAuth}
            />

            {/* Connect button */}
            {projectPath && authStatus?.isAuthenticated && (
              <Tooltip content="Create repo from this project">
                <IconButton size="sm" onClick={() => setShowConnectWorkflow(true)}>
                  <Plus className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}

            {/* Refresh */}
            {authStatus?.isAuthenticated && activeTab !== "search" && (
              <Tooltip content="Refresh">
                <IconButton size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </IconButton>
              </Tooltip>
            )}

            {/* Close */}
            <Tooltip content="Close (Esc)">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
            <IconButton size="sm" onClick={clearError}>
              <X className="w-3 h-3" />
            </IconButton>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Not authenticated */}
          {authLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          )}

          {!authLoading && !authStatus?.isAuthenticated && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <Github className="w-16 h-16 text-text-tertiary mx-auto" />

                {ghNotInstalled ? (
                  <>
                    <h2 className="text-xl font-medium text-text-primary">
                      GitHub CLI not installed
                    </h2>
                    <p className="text-text-secondary">
                      The GitHub CLI (gh) is required. Install it using Homebrew or visit{" "}
                      <a
                        href="https://cli.github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        cli.github.com
                      </a>
                    </p>

                    {/* Install command box */}
                    <div className="p-3 rounded-lg bg-bg-tertiary border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="flex-1 px-2 py-1.5 rounded bg-bg-primary text-sm font-mono text-accent">
                          brew install gh
                        </code>
                        <Tooltip content={copiedCommand === "brew install gh" ? "Copied!" : "Copy"}>
                          <IconButton
                            size="sm"
                            onClick={() => handleCopyCommand("brew install gh")}
                          >
                            {copiedCommand === "brew install gh" ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </div>
                      {activeProjectId && (
                        <button
                          onClick={() => handleRunInTerminal("brew install gh")}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent text-[#3d2066] rounded-lg text-sm font-medium hover:bg-accent/90"
                        >
                          <Terminal className="w-4 h-4" />
                          Run in Terminal
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-medium text-text-primary">
                      GitHub CLI not authenticated
                    </h2>
                    <p className="text-text-secondary">
                      Please authenticate with GitHub to browse and manage repositories.
                    </p>

                    {/* Auth command box */}
                    <div className="p-3 rounded-lg bg-bg-tertiary border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="flex-1 px-2 py-1.5 rounded bg-bg-primary text-sm font-mono text-accent">
                          gh auth login
                        </code>
                        <Tooltip content={copiedCommand === "gh auth login" ? "Copied!" : "Copy"}>
                          <IconButton
                            size="sm"
                            onClick={() => handleCopyCommand("gh auth login")}
                          >
                            {copiedCommand === "gh auth login" ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </div>
                      {activeProjectId && (
                        <button
                          onClick={() => handleRunInTerminal("gh auth login")}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent text-[#3d2066] rounded-lg text-sm font-medium hover:bg-accent/90"
                        >
                          <Terminal className="w-4 h-4" />
                          Run in Terminal
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-text-tertiary">
                      After authenticating, reopen this tool to continue.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Authenticated content */}
          {!authLoading && authStatus?.isAuthenticated && (
            <div className="flex-1 flex flex-col min-h-0">
              {showRepoDetail ? (
                <RepoDetailView />
              ) : activeTab === "search" ? (
                <SearchPanel />
              ) : activeTab === "orgs" ? (
                <OrgReposView
                  orgs={orgs}
                  selectedOrg={selectedOrg}
                  orgRepos={orgRepos}
                  loading={orgsLoading || orgReposLoading}
                  onSelectOrg={setSelectedOrg}
                  onSelectRepo={handleSelectRepo}
                />
              ) : (
                <RepoList
                  repos={activeTab === "my-repos" ? myRepos : starredRepos}
                  loading={activeTab === "my-repos" ? myReposLoading : starredReposLoading}
                  onSelect={handleSelectRepo}
                  showOwner={activeTab === "starred"}
                />
              )}
            </div>
          )}
        </div>

        {/* Connect Workflow Modal */}
        {showConnectWorkflow && projectPath && (
          <ConnectWorkflow
            projectPath={projectPath}
            onClose={() => setShowConnectWorkflow(false)}
          />
        )}
      </div>
    </div>
  );
}

// Auth status badge component
function AuthStatusBadge({
  status,
  loading,
  onRecheck,
}: {
  status: { isAuthenticated: boolean; username?: string; error?: string } | null;
  loading: boolean;
  onRecheck: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-bg-tertiary rounded text-xs text-text-tertiary">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking...
      </div>
    );
  }

  if (!status?.isAuthenticated) {
    return (
      <Tooltip content="Click to recheck auth status">
        <button
          onClick={onRecheck}
          className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded text-xs text-red-400 hover:bg-red-500/20"
        >
          <AlertCircle className="w-3 h-3" />
          {status?.error?.includes("not found") ? "Not installed" : "Not logged in"}
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded text-xs text-green-400">
      <User className="w-3 h-3" />
      {status.username || "Authenticated"}
    </div>
  );
}

// Organization repos view
function OrgReposView({
  orgs,
  selectedOrg,
  orgRepos,
  loading,
  onSelectOrg,
  onSelectRepo,
}: {
  orgs: { login: string; name?: string }[];
  selectedOrg: string | null;
  orgRepos: Record<string, GhRepo[]>;
  loading: boolean;
  onSelectOrg: (org: string | null) => void;
  onSelectRepo: (repo: GhRepo) => void;
}) {
  if (loading && orgs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>You are not a member of any organizations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Org sidebar */}
      <div className="w-48 border-r border-border flex flex-col">
        <div className="p-2 text-xs font-medium text-text-tertiary uppercase">
          Organizations
        </div>
        <ScrollArea className="flex-1" scrollbarVisibility="visible">
          <div className="p-2 space-y-1">
            {orgs.map((org) => (
              <button
                key={org.login}
                onClick={() => onSelectOrg(org.login)}
                className={cn(
                  "w-full px-3 py-2 rounded text-left text-sm transition-colors",
                  selectedOrg === org.login
                    ? "bg-accent text-[#3d2066]"
                    : "hover:bg-bg-hover text-text-primary"
                )}
              >
                {org.name || org.login}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Org repos */}
      <div className="flex-1 min-h-0">
        {!selectedOrg ? (
          <div className="flex-1 h-full flex items-center justify-center text-text-tertiary">
            Select an organization
          </div>
        ) : loading ? (
          <div className="flex-1 h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <RepoList
            repos={orgRepos[selectedOrg] || []}
            loading={false}
            onSelect={onSelectRepo}
          />
        )}
      </div>
    </div>
  );
}

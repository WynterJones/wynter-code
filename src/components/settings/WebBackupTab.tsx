/**
 * Web Backup Settings Tab - Encrypted cloud backup configuration
 */

import { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Copy,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebBackupStore } from "@/stores/webBackupStore";
import { BACKUP_INTERVAL_OPTIONS } from "@/types/webBackup";
import { downloadBackup } from "@/services/backupOrchestrator";

export function WebBackupTab() {
  const {
    enabled,
    netlifyToken,
    siteId,
    siteName,
    siteUrl,
    lastBackupAt,
    autoBackupInterval,
    backupOnClose,
    connectionStatus,
    connectionError,
    isBackingUp,
    backupProgress,
    backupMessage,
    backupError,
    availableSites,
    isLoadingSites,
    setEnabled,
    setNetlifyToken,
    setAutoBackupInterval,
    setBackupOnClose,
    testConnection,
    createBackupSite,
    selectSite,
    performBackup,
    importFromUrl,
    clearError,
  } = useWebBackupStore();

  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(netlifyToken || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setTokenInput(netlifyToken || "");
  }, [netlifyToken]);

  const handleSaveToken = async () => {
    setNetlifyToken(tokenInput || null);
    if (tokenInput) {
      await testConnection();
    }
  };

  const handleCreateSite = async () => {
    if (!newSiteName.trim()) return;

    const site = await createBackupSite(newSiteName.trim());
    if (site) {
      setNewSiteName("");
      setShowCreateSite(false);
    }
  };

  const handleBackup = async () => {
    if (!passwordInput) {
      return;
    }
    await performBackup(passwordInput);
    setPasswordInput("");
  };

  const handleDownloadLocal = async () => {
    if (!passwordInput) {
      return;
    }
    try {
      await downloadBackup(passwordInput);
    } catch {
      // Error handling in orchestrator
    }
  };

  const handleImport = async () => {
    if (!importUrl || !importPassword) return;
    const success = await importFromUrl(importUrl, importPassword);
    if (success) {
      setImportUrl("");
      setImportPassword("");
      // Reload the page after a short delay to reflect imported data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const formatLastBackup = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Less than an hour ago";
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopyUrl = async () => {
    if (!siteUrl) return;
    await navigator.clipboard.writeText(siteUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Encrypted Web Backup
      </h2>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Cloud className="w-5 h-5 text-accent" />
          ) : (
            <CloudOff className="w-5 h-5 text-text-secondary" />
          )}
          <div>
            <label htmlFor="enable-web-backup" className="text-sm font-medium text-text-primary">
              Enable Web Backup
            </label>
            <p className="text-xs text-text-secondary">
              Encrypt and sync your data to Netlify
            </p>
          </div>
        </div>
        <button
          id="enable-web-backup"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={cn(
            "w-11 h-6 rounded-full transition-colors relative",
            enabled ? "bg-accent" : "bg-bg-hover"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
              enabled ? "left-5" : "left-0.5"
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Netlify Token */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2">
              Netlify Connection
            </h3>

            <div className="space-y-2">
              <label htmlFor="netlify-api-token" className="text-sm text-text-secondary">API Token</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    id="netlify-api-token"
                    type={showToken ? "text" : "password"}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter your Netlify personal access token"
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
                  >
                    {showToken ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleSaveToken}
                  disabled={connectionStatus === "connecting"}
                  className="btn btn-primary"
                >
                  {connectionStatus === "connecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>

              {/* Connection Status */}
              {connectionStatus !== "disconnected" && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    connectionStatus === "connected" && "text-green-400",
                    connectionStatus === "connecting" && "text-amber-400",
                    connectionStatus === "error" && "text-red-400"
                  )}
                >
                  {connectionStatus === "connected" && (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Connected to Netlify</span>
                    </>
                  )}
                  {connectionStatus === "connecting" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  )}
                  {connectionStatus === "error" && (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>{connectionError}</span>
                    </>
                  )}
                </div>
              )}

              <p className="text-xs text-text-secondary">
                Get your token from{" "}
                <a
                  href="https://app.netlify.com/user/applications#personal-access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  Netlify Settings
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Site Selection */}
          {connectionStatus === "connected" && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2">
                Backup Site
              </h3>

              {siteId ? (
                <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {siteName}
                      </p>
                      <a
                        href={siteUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                      >
                        {siteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        useWebBackupStore.setState({
                          siteId: null,
                          siteName: null,
                          siteUrl: null,
                        });
                      }}
                      className="text-xs text-text-secondary hover:text-text-primary"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Existing Sites */}
                  {availableSites.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm text-text-secondary">
                        Select existing site
                      </label>
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {availableSites.map((site) => (
                          <button
                            key={site.id}
                            onClick={() => selectSite(site.id)}
                            className="text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-bg-hover transition-colors"
                          >
                            <p className="text-sm font-medium text-text-primary">
                              {site.name}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {site.ssl_url || site.url}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create New Site */}
                  {showCreateSite ? (
                    <div className="space-y-2">
                      <label className="text-sm text-text-secondary">
                        New site name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSiteName}
                          onChange={(e) => setNewSiteName(e.target.value)}
                          placeholder="wyntercode-backup"
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={handleCreateSite}
                          disabled={!newSiteName.trim()}
                          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => setShowCreateSite(false)}
                          className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateSite(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Create new backup site</span>
                    </button>
                  )}

                  {isLoadingSites && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading sites...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Backup Settings */}
          {siteId && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2">
                  Backup Settings
                </h3>

                {/* Auto-backup interval */}
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">
                    Auto-backup interval
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {BACKUP_INTERVAL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAutoBackupInterval(option.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm transition-all",
                          autoBackupInterval === option.value
                            ? "border-accent bg-accent/10 text-text-primary"
                            : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backup on close */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="backup-on-close" className="text-sm font-medium text-text-primary">
                      Backup on app close
                    </label>
                    <p className="text-xs text-text-secondary">
                      Prompt to backup when closing the app
                    </p>
                  </div>
                  <button
                    id="backup-on-close"
                    role="switch"
                    aria-checked={backupOnClose}
                    onClick={() => setBackupOnClose(!backupOnClose)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      backupOnClose ? "bg-accent" : "bg-bg-hover"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                        backupOnClose ? "left-5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Manual Backup */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2">
                  Manual Backup
                </h3>

                {/* Backup URL Card - shown when there's a backup */}
                {lastBackupAt && siteUrl && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/20">
                        <Globe className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-text-primary">
                            Backup Available
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mb-2">
                          Last backed up {formatLastBackup(lastBackupAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-1.5 rounded bg-bg-primary/50 border border-border text-xs text-text-primary font-mono truncate">
                            {siteUrl}
                          </div>
                          <button
                            onClick={handleCopyUrl}
                            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                            title="Copy URL"
                          >
                            {urlCopied ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
                            title="Open backup page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-bg-secondary border border-border space-y-3">
                  {!lastBackupAt && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Lock className="w-4 h-4" />
                      <span>No backups yet</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="backup-password" className="text-xs text-text-secondary">
                      Backup password (entered each time, never stored)
                    </label>
                    <input
                      id="backup-password"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter encryption password"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Progress */}
                  {isBackingUp && (
                    <div className="space-y-2">
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${backupProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary">
                        {backupMessage}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {backupError && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>{backupError}</span>
                      <button
                        onClick={clearError}
                        className="ml-auto text-text-secondary hover:text-text-primary"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleBackup}
                      disabled={!passwordInput || isBackingUp}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {isBackingUp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>Backup to Netlify</span>
                    </button>
                    <button
                      onClick={handleDownloadLocal}
                      disabled={!passwordInput || isBackingUp}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Security Info */}
          <div className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-sm font-medium text-text-primary mb-2">
              How it works
            </h3>
            <ul className="text-xs text-text-secondary space-y-1">
              <li>- Your data is encrypted locally with AES-256-GCM</li>
              <li>- Password is never stored, only used to derive encryption key</li>
              <li>- Encrypted backup is deployed to your Netlify site</li>
              <li>- Recover by visiting the URL and entering your password</li>
              <li>- All decryption happens in your browser</li>
            </ul>
          </div>
        </>
      )}

      {/* Import from Backup - Always visible */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Import from Backup
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Enter your Netlify backup site URL and password to restore your data
            </p>

            <div className="space-y-3">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://your-backup.netlify.app"
                className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Backup password"
                className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleImport}
                disabled={!importUrl || !importPassword || isBackingUp}
                className="btn-primary flex items-center gap-2"
              >
                {isBackingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Import from URL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

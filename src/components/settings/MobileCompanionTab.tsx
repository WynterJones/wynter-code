import { useState, useEffect } from "react";
import {
  Smartphone,
  Wifi,
  QrCode,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Copy,
  Power,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import {
  useMobileApiStore,
  generateQRCodeUrl,
  formatPairingCode,
  formatTimeAgo,
} from "@/stores/mobileApiStore";
import { QRCodeSVG } from "qrcode.react";

export function MobileCompanionTab() {
  const {
    serverInfo,
    pairedDevices,
    currentPairingCode,
    loading,
    error,
    preferredPort,
    autoStartServer,
    startServer,
    stopServer,
    generatePairingCode,
    revokeDevice,
    refreshDevices,
    setPreferredPort,
    setAutoStartServer,
    clearError,
  } = useMobileApiStore();

  const [copied, setCopied] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);

  // Check if pairing code is expired
  useEffect(() => {
    if (!currentPairingCode) {
      setCodeExpired(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (currentPairingCode.expires_at < now) {
      setCodeExpired(true);
      return;
    }

    const timeUntilExpiry = (currentPairingCode.expires_at - now) * 1000;
    const timer = setTimeout(() => setCodeExpired(true), timeUntilExpiry);
    return () => clearTimeout(timer);
  }, [currentPairingCode]);

  // Refresh devices periodically when server is running
  useEffect(() => {
    if (!serverInfo?.running) return;
    const interval = setInterval(() => refreshDevices(), 30000);
    return () => clearInterval(interval);
  }, [serverInfo, refreshDevices]);

  const handleCopyCode = () => {
    if (currentPairingCode) {
      navigator.clipboard.writeText(currentPairingCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleServer = async () => {
    if (serverInfo?.running) {
      await stopServer();
    } else {
      await startServer();
    }
  };

  const handleGenerateCode = async () => {
    setCodeExpired(false);
    await generatePairingCode();
  };

  const qrCodeUrl = currentPairingCode ? generateQRCodeUrl(currentPairingCode) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-text-primary">Mobile Companion</h2>
          <p className="text-xs text-text-secondary">
            Connect your iOS device to control wynter-code remotely
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
          <IconButton size="sm" onClick={clearError}>
            <Trash2 className="w-3 h-3" />
          </IconButton>
        </div>
      )}

      {/* Server Control */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-text-primary">
              API Server
            </label>
            <p className="text-xs text-text-secondary">
              {serverInfo?.running
                ? `Running on ${serverInfo.host}:${serverInfo.port}`
                : "Start server to enable mobile connections"}
            </p>
          </div>
          <button
            onClick={handleToggleServer}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              serverInfo?.running
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-accent/20 text-accent hover:bg-accent/30",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Power className="w-4 h-4" />
            {loading ? "..." : serverInfo?.running ? "Stop Server" : "Start Server"}
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Wifi className={cn("w-4 h-4", serverInfo?.running ? "text-green-400" : "text-text-tertiary")} />
            <span>{serverInfo?.running ? "Broadcasting on local network" : "Not broadcasting"}</span>
          </div>
        </div>
      </div>

      {/* Port Configuration */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-primary">Port</label>
            <p className="text-xs text-text-secondary">
              Server port for mobile connections
            </p>
          </div>
          <input
            type="number"
            value={preferredPort}
            onChange={(e) => setPreferredPort(Number(e.target.value))}
            disabled={serverInfo?.running}
            className={cn(
              "w-24 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              serverInfo?.running && "opacity-50 cursor-not-allowed"
            )}
            min={1024}
            max={65535}
          />
        </div>
      </div>

      {/* Auto-start Toggle */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="auto-start" className="text-sm font-medium text-text-primary">
              Auto-start Server
            </label>
            <p className="text-xs text-text-secondary">
              Start API server when app launches
            </p>
          </div>
          <button
            id="auto-start"
            role="switch"
            aria-checked={autoStartServer}
            onClick={() => setAutoStartServer(!autoStartServer)}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative",
              autoStartServer ? "bg-accent" : "bg-bg-hover"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                autoStartServer ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>
      </div>

      {/* Pairing Section (only when server running) */}
      {serverInfo?.running && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Pair New Device</h3>
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "bg-bg-secondary border border-border hover:border-accent/50",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <QrCode className="w-3 h-3" />
              {currentPairingCode ? "New Code" : "Generate Code"}
            </button>
          </div>

          {currentPairingCode && !codeExpired && (
            <div className="p-4 rounded-lg bg-bg-secondary border border-border">
              <div className="flex gap-6">
                {/* QR Code */}
                <div className="flex-shrink-0 p-3 bg-white rounded-lg">
                  {qrCodeUrl && (
                    <QRCodeSVG
                      value={qrCodeUrl}
                      size={120}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                {/* Code and Instructions */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Pairing Code</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-bold text-accent tracking-wider">
                        {formatPairingCode(currentPairingCode.code)}
                      </span>
                      <Tooltip content={copied ? "Copied!" : "Copy code"}>
                        <IconButton size="sm" onClick={handleCopyCode}>
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />
                    <span>
                      Expires in {Math.max(0, Math.floor((currentPairingCode.expires_at - Date.now() / 1000) / 60))} minutes
                    </span>
                  </div>

                  <div className="text-xs text-text-secondary">
                    <p>1. Open the wynter-code mobile app</p>
                    <p>2. Tap "Connect to Desktop"</p>
                    <p>3. Scan the QR code or enter the code manually</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {codeExpired && currentPairingCode && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-amber-400">
                  Pairing code expired. Generate a new one to continue.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paired Devices */}
      {serverInfo?.running && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Paired Devices</h3>
            <Tooltip content="Refresh">
              <IconButton size="sm" onClick={() => refreshDevices()}>
                <RefreshCw className="w-3 h-3" />
              </IconButton>
            </Tooltip>
          </div>

          {pairedDevices.length === 0 ? (
            <div className="p-4 rounded-lg bg-bg-secondary border border-border text-center">
              <p className="text-xs text-text-secondary">No devices paired yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pairedDevices.map((device) => (
                <div
                  key={device.device_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {device.device_name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Last seen {formatTimeAgo(device.last_seen)}
                      </p>
                    </div>
                  </div>
                  <Tooltip content="Remove device">
                    <IconButton
                      size="sm"
                      onClick={() => revokeDevice(device.device_id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          How It Works
        </h3>
        <ul className="text-xs text-text-secondary space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-accent">1.</span>
            Start the API server (your iPhone must be on the same WiFi network)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">2.</span>
            Generate a pairing code and scan it with the mobile app
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">3.</span>
            View beads issues, monitor auto-build, and chat from your phone
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">4.</span>
            Approve or reject tool calls when Claude needs permission
          </li>
        </ul>
      </div>
    </div>
  );
}

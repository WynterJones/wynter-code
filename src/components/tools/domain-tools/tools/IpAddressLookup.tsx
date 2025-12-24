import { useState, useEffect } from "react";
import { Search, MapPin, Globe, Building2, Clock, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";

interface IpInfo {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: string;
}

export function IpAddressLookup() {
  const [ipAddress, setIpAddress] = useState("");
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [myIp, setMyIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMyIp, setLoadingMyIp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchMyIp();
  }, []);

  const fetchMyIp = async () => {
    setLoadingMyIp(true);
    try {
      const result = await invoke<string>("http_get_json", { url: "https://api.ipify.org?format=json" });
      const data = JSON.parse(result);
      setMyIp(data.ip);
    } catch {
      // Silently fail for my IP
    } finally {
      setLoadingMyIp(false);
    }
  };

  const handleLookup = async (ip?: string) => {
    const targetIp = ip || ipAddress.trim();
    if (!targetIp) return;

    setLoading(true);
    setError(null);
    setIpInfo(null);

    try {
      // Using ipinfo.io (free tier allows 50k requests/month without token)
      const result = await invoke<string>("http_get_json", { url: `https://ipinfo.io/${targetIp}/json` });
      const data = JSON.parse(result);

      if (data.error) {
        throw new Error(data.error.message || "Invalid IP address");
      }

      setIpInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to lookup IP address");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLookupMyIp = () => {
    if (myIp) {
      setIpAddress(myIp);
      handleLookup(myIp);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* My IP Quick Info */}
      <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          <span className="text-sm text-text-secondary">Your IP:</span>
          {loadingMyIp ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
          ) : myIp ? (
            <span className="font-mono text-sm text-text-primary">{myIp}</span>
          ) : (
            <span className="text-sm text-text-secondary">Unable to detect</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {myIp && (
            <>
              <button
                onClick={() => handleCopy(myIp, "myip")}
                className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                {copied === "myip" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <Button size="sm" variant="default" onClick={handleLookupMyIp}>
                Lookup
              </Button>
            </>
          )}
          <button
            onClick={fetchMyIp}
            className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Enter IP address (e.g., 8.8.8.8)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <Button onClick={() => handleLookup()} disabled={loading || !ipAddress.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {ipInfo && (
        <div className="flex-1 min-h-0 overflow-auto space-y-4">
          {/* Main Info Card */}
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary font-mono">{ipInfo.ip}</h3>
                {ipInfo.hostname && (
                  <p className="text-sm text-text-secondary">{ipInfo.hostname}</p>
                )}
              </div>
              <button
                onClick={() => handleCopy(ipInfo.ip, "ip")}
                className="p-2 rounded hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                {copied === "ip" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm text-text-secondary">Location</p>
                    <p className="text-text-primary">
                      {[ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(", ") || "Unknown"}
                    </p>
                    {ipInfo.postal && (
                      <p className="text-xs text-text-secondary">Postal: {ipInfo.postal}</p>
                    )}
                  </div>
                </div>

                {ipInfo.loc && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-text-secondary">Coordinates</p>
                      <p className="font-mono text-sm text-text-primary">{ipInfo.loc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Organization & Timezone */}
              <div className="space-y-3">
                {ipInfo.org && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-text-secondary">Organization</p>
                      <p className="text-text-primary text-sm">{ipInfo.org}</p>
                    </div>
                  </div>
                )}

                {ipInfo.timezone && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-text-secondary">Timezone</p>
                      <p className="text-text-primary">{ipInfo.timezone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Link */}
          {ipInfo.loc && (
            <a
              href={`https://www.google.com/maps?q=${ipInfo.loc}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-bg-secondary rounded-lg border border-border hover:border-accent transition-colors text-center"
            >
              <MapPin className="w-6 h-6 text-accent mx-auto mb-2" />
              <span className="text-sm text-text-primary">View on Google Maps</span>
            </a>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !ipInfo && (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
          <MapPin className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            Enter an IP address to lookup<br />
            geolocation and organization info
          </p>
        </div>
      )}
    </div>
  );
}

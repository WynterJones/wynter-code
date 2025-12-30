import { useState, useEffect } from "react";
import {
  Train,
  BarChart3,
  Globe,
  Bug,
  Link as LinkIcon,
  Server,
  Database,
  Cloud,
  Shield,
  Zap,
  Box,
  Layers,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Key,
  FileCode,
  GitBranch,
  Terminal,
  Settings,
  Activity,
} from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useOverwatchStore } from "@/stores/overwatchStore";
import { cn } from "@/lib/utils";
import type {
  ServiceConfig,
  ServiceConfigInput,
  ServiceProvider,
} from "@/types/overwatch";

interface ServiceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ServiceConfigInput) => void;
  workspaceId: string;
  editingService?: ServiceConfig;
}

const PROVIDERS: { id: ServiceProvider; name: string; icon: typeof Train }[] = [
  { id: "railway", name: "Railway", icon: Train },
  { id: "plausible", name: "Plausible", icon: BarChart3 },
  { id: "netlify", name: "Netlify", icon: Globe },
  { id: "sentry", name: "Sentry", icon: Bug },
  { id: "link", name: "Link", icon: LinkIcon },
];

// Icons available for Link services
const LINK_ICONS = [
  { id: "link", icon: LinkIcon, name: "Link" },
  { id: "globe", icon: Globe, name: "Globe" },
  { id: "server", icon: Server, name: "Server" },
  { id: "database", icon: Database, name: "Database" },
  { id: "cloud", icon: Cloud, name: "Cloud" },
  { id: "shield", icon: Shield, name: "Shield" },
  { id: "zap", icon: Zap, name: "Zap" },
  { id: "box", icon: Box, name: "Box" },
  { id: "layers", icon: Layers, name: "Layers" },
  { id: "monitor", icon: Monitor, name: "Monitor" },
  { id: "cpu", icon: Cpu, name: "CPU" },
  { id: "hard-drive", icon: HardDrive, name: "Storage" },
  { id: "wifi", icon: Wifi, name: "Network" },
  { id: "lock", icon: Lock, name: "Lock" },
  { id: "key", icon: Key, name: "Key" },
  { id: "file-code", icon: FileCode, name: "Code" },
  { id: "git-branch", icon: GitBranch, name: "Git" },
  { id: "terminal", icon: Terminal, name: "Terminal" },
  { id: "settings", icon: Settings, name: "Settings" },
  { id: "activity", icon: Activity, name: "Activity" },
];

// Colors available for Link services
const LINK_COLORS = [
  { id: "#6c7086", name: "Gray" },
  { id: "#cba6f7", name: "Mauve" },
  { id: "#f38ba8", name: "Red" },
  { id: "#fab387", name: "Peach" },
  { id: "#f9e2af", name: "Yellow" },
  { id: "#a6e3a1", name: "Green" },
  { id: "#94e2d5", name: "Teal" },
  { id: "#89dceb", name: "Sky" },
  { id: "#74c7ec", name: "Sapphire" },
  { id: "#89b4fa", name: "Blue" },
  { id: "#b4befe", name: "Lavender" },
  { id: "#f5c2e7", name: "Pink" },
];

export function ServiceConfigModal({
  isOpen,
  onClose,
  onSave,
  workspaceId,
  editingService,
}: ServiceConfigModalProps) {
  const [provider, setProvider] = useState<ServiceProvider>("railway");
  const [name, setName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [linkIcon, setLinkIcon] = useState("link");
  const [linkColor, setLinkColor] = useState("#6c7086");

  const { getProviderApiKey, setProviderApiKey } = useOverwatchStore();

  useEffect(() => {
    if (editingService) {
      setProvider(editingService.provider);
      setName(editingService.name);
      setExternalUrl(editingService.externalUrl || "");
      setApiKey(editingService.apiKey || "");
      setProjectId(editingService.projectId || "");
      setSiteId(editingService.siteId || "");
      setOrganizationSlug(editingService.organizationSlug || "");
      setLinkIcon(editingService.linkIcon || "link");
      setLinkColor(editingService.linkColor || "#6c7086");
    } else {
      setProvider("railway");
      setName("");
      setExternalUrl("");
      setApiKey(getProviderApiKey("railway") || "");
      setProjectId("");
      setSiteId("");
      setOrganizationSlug("");
      setLinkIcon("link");
      setLinkColor("#6c7086");
    }
  }, [editingService, isOpen, getProviderApiKey]);

  // Update API key when provider changes (for new services only)
  useEffect(() => {
    if (!editingService && isOpen && provider !== "link") {
      const savedKey = getProviderApiKey(provider);
      // Always update to the saved key for this provider (or clear if none)
      setApiKey(savedKey || "");
    }
  }, [provider, editingService, isOpen, getProviderApiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: ServiceConfigInput = {
      workspaceId,
      provider,
      name: name || PROVIDERS.find((p) => p.id === provider)?.name || provider,
      externalUrl: externalUrl || undefined,
      apiKey: provider !== "link" ? apiKey || undefined : undefined,
      projectId: projectId || undefined,
      siteId: siteId || undefined,
      organizationSlug: organizationSlug || undefined,
      linkIcon: provider === "link" ? linkIcon : undefined,
      linkColor: provider === "link" ? linkColor : undefined,
    };

    // Save API key for this provider for future use
    if (apiKey && provider !== "link") {
      setProviderApiKey(provider, apiKey);
    }

    onSave(input);
    onClose();
  };

  const renderProviderFields = () => {
    switch (provider) {
      case "link":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">URL</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://dashboard.example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Icon</label>
              <div className="grid grid-cols-10 gap-1.5">
                {LINK_ICONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLinkIcon(item.id)}
                      className={cn(
                        "p-2 rounded-md border transition-colors",
                        linkIcon === item.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      )}
                      title={item.name}
                    >
                      <Icon className="w-4 h-4" style={{ color: linkColor }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="grid grid-cols-12 gap-1.5">
                {LINK_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setLinkColor(color.id)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      linkColor === color.id
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </>
        );

      case "railway":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Railway API key"
              />
              <p className="text-xs text-text-secondary mt-1">
                Found in Railway account settings
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Project ID</label>
              <Input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-text-secondary mt-1">
                Found in Railway project settings URL
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Dashboard URL (optional)</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://railway.app/project/..."
              />
            </div>
          </>
        );

      case "plausible":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Plausible API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Site ID</label>
              <Input
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="example.com"
              />
              <p className="text-xs text-text-secondary mt-1">
                Your domain as registered in Plausible
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Dashboard URL (optional)</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://plausible.io/example.com"
              />
            </div>
          </>
        );

      case "netlify":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Netlify personal access token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Site ID</label>
              <Input
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-text-secondary mt-1">
                Found in Site settings &gt; General &gt; Site details
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Dashboard URL (optional)</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://app.netlify.com/sites/..."
              />
            </div>
          </>
        );

      case "sentry":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Sentry auth token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Organization Slug</label>
              <Input
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
                placeholder="my-organization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Project Slug</label>
              <Input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Dashboard URL (optional)</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://sentry.io/organizations/..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingService ? "Edit Service" : "Add Service"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="grid grid-cols-5 gap-2">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors",
                    provider === p.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Display Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={PROVIDERS.find((p) => p.id === provider)?.name || "Service name"}
          />
        </div>

        {/* Provider-specific fields */}
        {renderProviderFields()}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {editingService ? "Save Changes" : "Add Service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

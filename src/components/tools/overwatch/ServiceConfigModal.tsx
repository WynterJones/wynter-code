import { useState, useEffect } from "react";
import { Train, BarChart3, Globe, Bug, Link as LinkIcon, Key } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useEnvStore } from "@/stores/envStore";
import type {
  ServiceConfig,
  ServiceConfigInput,
  ServiceProvider,
  ConnectionMode,
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
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("api");
  const [externalUrl, setExternalUrl] = useState("");
  const [apiKeyId, setApiKeyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");

  const { globalVariables } = useEnvStore();

  // Filter to only show sensitive variables (likely API keys)
  const apiKeyOptions = globalVariables.filter(
    (v) => v.isSensitive || v.key.toLowerCase().includes("key") || v.key.toLowerCase().includes("token")
  );

  useEffect(() => {
    if (editingService) {
      setProvider(editingService.provider);
      setName(editingService.name);
      setConnectionMode(editingService.connectionMode);
      setExternalUrl(editingService.externalUrl || "");
      setApiKeyId(editingService.apiKeyId || "");
      setProjectId(editingService.projectId || "");
      setSiteId(editingService.siteId || "");
      setOrganizationSlug(editingService.organizationSlug || "");
    } else {
      setProvider("railway");
      setName("");
      setConnectionMode("api");
      setExternalUrl("");
      setApiKeyId("");
      setProjectId("");
      setSiteId("");
      setOrganizationSlug("");
    }
  }, [editingService, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: ServiceConfigInput = {
      workspaceId,
      provider,
      name: name || PROVIDERS.find((p) => p.id === provider)?.name || provider,
      connectionMode,
      externalUrl: externalUrl || undefined,
      apiKeyId: connectionMode === "api" ? apiKeyId || undefined : undefined,
      projectId: projectId || undefined,
      siteId: siteId || undefined,
      organizationSlug: organizationSlug || undefined,
    };

    onSave(input);
    onClose();
  };

  const renderProviderFields = () => {
    if (connectionMode === "link") {
      return (
        <div>
          <label className="block text-sm font-medium mb-1.5">Dashboard URL</label>
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://dashboard.example.com"
          />
        </div>
      );
    }

    switch (provider) {
      case "railway":
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <select
                value={apiKeyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApiKeyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select an API key...</option>
                {apiKeyOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.key}
                  </option>
                ))}
              </select>
              {apiKeyOptions.length === 0 && (
                <p className="text-xs text-text-secondary mt-1">
                  Add API keys in Environment Variables tool first
                </p>
              )}
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
              <select
                value={apiKeyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApiKeyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select an API key...</option>
                {apiKeyOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.key}
                  </option>
                ))}
              </select>
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
              <select
                value={apiKeyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApiKeyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select an API key...</option>
                {apiKeyOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.key}
                  </option>
                ))}
              </select>
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
              <select
                value={apiKeyId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApiKeyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select an API key...</option>
                {apiKeyOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.key}
                  </option>
                ))}
              </select>
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
          <label className="block text-sm font-medium mb-2">Provider</label>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                    provider === p.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  }`}
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

        {/* Connection Mode */}
        <div>
          <label className="block text-sm font-medium mb-2">Connection Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConnectionMode("api")}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                connectionMode === "api"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <Key className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">API Integration</div>
                <div className="text-xs text-text-secondary">Fetch live stats</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode("link")}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                connectionMode === "link"
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">Link Only</div>
                <div className="text-xs text-text-secondary">Just a quick link</div>
              </div>
            </button>
          </div>
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

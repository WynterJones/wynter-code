import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Plus, RefreshCw, Settings2, Folder } from "lucide-react";
import { Modal, IconButton, Tooltip, ScrollArea, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useOverwatchStore } from "@/stores/overwatchStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { ServiceCard } from "./ServiceCard";
import { ServiceConfigModal } from "./ServiceConfigModal";
import type { ServiceConfig, ServiceConfigInput } from "@/types/overwatch";

interface OverwatchPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OverwatchPopup({ isOpen, onClose }: OverwatchPopupProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfig | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { activeWorkspaceId, getWorkspace } = useWorkspaceStore();
  const activeWorkspace = activeWorkspaceId ? getWorkspace(activeWorkspaceId) : null;

  const {
    getServicesForWorkspace,
    addService,
    updateService,
    deleteService,
    refreshService,
    refreshAllServices,
    getServiceData,
    refreshing,
    autoRefreshEnabled,
    refreshInterval,
    setAutoRefresh,
    setRefreshInterval,
  } = useOverwatchStore();

  const services = activeWorkspaceId ? getServicesForWorkspace(activeWorkspaceId) : [];

  const handleRefreshAll = useCallback(() => {
    if (activeWorkspaceId) {
      refreshAllServices(activeWorkspaceId);
    }
  }, [activeWorkspaceId, refreshAllServices]);

  // Auto-refresh logic
  useEffect(() => {
    if (isOpen && autoRefreshEnabled && activeWorkspaceId) {
      // Initial refresh
      handleRefreshAll();

      // Set up interval
      intervalRef.current = setInterval(() => {
        handleRefreshAll();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, autoRefreshEnabled, refreshInterval, activeWorkspaceId, handleRefreshAll]);

  const handleSaveService = (input: ServiceConfigInput) => {
    if (editingService) {
      updateService(editingService.id, input);
    } else {
      const id = addService(input);
      // Immediately refresh the new service
      refreshService(id);
    }
    setEditingService(undefined);
  };

  const handleEditService = (service: ServiceConfig) => {
    setEditingService(service);
    setShowConfig(true);
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteService(serviceId);
    }
  };

  const isAnyRefreshing = refreshing.size > 0;

  if (!activeWorkspace) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Overwatch" size="lg">
        <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
          <Folder className="w-12 h-12 mb-4 opacity-50" />
          <p>No workspace selected</p>
          <p className="text-sm mt-1">Select a workspace to monitor services</p>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Overwatch" size="xl">
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-accent" />
              <div>
                <div className="text-sm font-medium">{activeWorkspace.name}</div>
                <div className="text-xs text-text-secondary">
                  {services.length} service{services.length !== 1 ? "s" : ""} configured
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Settings">
                <IconButton
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className={showSettings ? "text-accent bg-accent/10" : ""}
                >
                  <Settings2 className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Refresh All">
                <IconButton
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={isAnyRefreshing}
                >
                  <RefreshCw
                    className={cn("w-4 h-4", isAnyRefreshing && "animate-spin")}
                  />
                </IconButton>
              </Tooltip>
              <Button
                size="sm"
                onClick={() => {
                  setEditingService(undefined);
                  setShowConfig(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b border-border bg-surface-raised/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Auto-refresh</div>
                  <div className="text-xs text-text-secondary">
                    Automatically refresh service data
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    disabled={!autoRefreshEnabled}
                    className="text-sm bg-surface text-text-primary border border-border rounded px-2 py-1 [&>option]:bg-surface-raised [&>option]:text-text-primary"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                  </select>
                  <button
                    onClick={() => setAutoRefresh(!autoRefreshEnabled)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      autoRefreshEnabled ? "bg-accent" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        autoRefreshEnabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <Eye className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No services configured</p>
                <p className="text-sm mb-4">
                  Add services to monitor your production infrastructure
                </p>
                <Button
                  onClick={() => {
                    setEditingService(undefined);
                    setShowConfig(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    config={service}
                    data={getServiceData(service.id)}
                    isRefreshing={refreshing.has(service.id)}
                    onRefresh={() => refreshService(service.id)}
                    onEdit={() => handleEditService(service)}
                    onDelete={() => handleDeleteService(service.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {autoRefreshEnabled && services.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-surface-raised/50">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isAnyRefreshing ? "bg-blue-500 animate-pulse" : "bg-green-500"
                  )}
                />
                <span>
                  {isAnyRefreshing
                    ? "Refreshing..."
                    : `Auto-refresh every ${refreshInterval}s`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Config Modal */}
      {activeWorkspaceId && (
        <ServiceConfigModal
          isOpen={showConfig}
          onClose={() => {
            setShowConfig(false);
            setEditingService(undefined);
          }}
          onSave={handleSaveService}
          workspaceId={activeWorkspaceId}
          editingService={editingService}
        />
      )}
    </>
  );
}

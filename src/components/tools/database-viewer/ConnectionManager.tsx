import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Plug,
  PlugZap,
  Database,
  Radar,
  Loader2,
  Server,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConnectionForm } from "./ConnectionForm";
import type { ConnectionConfig } from "@/types";

interface ConnectionManagerProps {
  isVisible: boolean;
}

export function ConnectionManager({ isVisible }: ConnectionManagerProps) {
  const {
    connections,
    activeConnectionId,
    isConnected,
    connect,
    disconnect,
    deleteConnection,
    isLoading,
    detectedServices,
    detectingServices,
    detectServices,
    createConnectionFromService,
  } = useDatabaseViewerStore();

  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // Auto-detect on mount
  useEffect(() => {
    detectServices();
  }, []);

  if (!isVisible) return null;

  const handleConnect = async (id: string) => {
    if (isConnected.get(id)) {
      await disconnect(id);
    } else {
      await connect(id);
    }
  };

  const handleEdit = (connection: ConnectionConfig) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this connection?")) {
      deleteConnection(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingConnection(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "sqlite":
        return "SQLite";
      case "postgres":
        return "PostgreSQL";
      case "mysql":
        return "MySQL";
      default:
        return type;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium">Connections</h3>
        <div className="flex items-center gap-1">
          <Tooltip content="Detect Local Databases">
            <IconButton size="sm" onClick={detectServices} disabled={detectingServices}>
              {detectingServices ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Radar className="w-4 h-4" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip content="Add Connection">
            <IconButton size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <OverlayScrollbarsComponent className="flex-1 os-theme-custom" options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}>
        <div className="p-2 space-y-1">
          {/* Detected Services */}
          {detectedServices.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-text-tertiary px-2 mb-1 uppercase tracking-wider">
                Running Locally
              </p>
              {detectedServices.map((service) => {
                const isSupported = service.serviceType === "postgres";
                return (
                  <div
                    key={`${service.serviceType}-${service.port}`}
                    className={cn(
                      "p-2 rounded-md border border-dashed",
                      isSupported
                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                        : "border-gray-500/30 bg-gray-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSupported ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        )} />
                        <Server className={cn(
                          "w-3.5 h-3.5",
                          isSupported ? "text-green-500" : "text-gray-400"
                        )} />
                        <span className="text-sm font-medium">
                          {service.serviceType === "postgres" ? "PostgreSQL" : "MySQL"}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {service.host}:{service.port}
                        </span>
                      </div>
                      {isSupported && (
                        <Tooltip content="Add Connection">
                          <IconButton
                            size="sm"
                            className="p-1"
                            onClick={() => createConnectionFromService(service)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                    {!isSupported && (
                      <div className="text-xs text-text-tertiary mt-1 pl-4 italic">
                        MySQL support coming soon
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved Connections */}
          {connections.length === 0 && detectedServices.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No connections yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-sm text-accent hover:underline"
              >
                Add your first connection
              </button>
            </div>
          ) : connections.length === 0 ? null : (
            <>
              {connections.length > 0 && detectedServices.length > 0 && (
                <p className="text-xs text-text-tertiary px-2 mb-1 uppercase tracking-wider">
                  Saved Connections
                </p>
              )}
              {connections.map((connection) => {
              const connected = isConnected.get(connection.id);
              const isActive = activeConnectionId === connection.id;

              return (
                <div
                  key={connection.id}
                  className={cn(
                    "p-2 rounded-md border transition-colors",
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-transparent hover:bg-bg-hover"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          connected ? "bg-green-500" : "bg-gray-400"
                        )}
                      />
                      <span className="font-medium text-sm truncate">
                        {connection.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip content={connected ? "Disconnect" : "Connect"}>
                        <IconButton
                          size="sm"
                          onClick={() => handleConnect(connection.id)}
                          disabled={isLoading}
                          className="p-1"
                        >
                          {connected ? (
                            <PlugZap className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Plug className="w-3.5 h-3.5" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <IconButton size="sm" onClick={() => handleEdit(connection)} className="p-1">
                          <Edit2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <IconButton
                          size="sm"
                          onClick={() => handleDelete(connection.id)}
                          disabled={connected}
                          className="p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    <span className="px-1.5 py-0.5 rounded bg-bg-tertiary">
                      {getTypeIcon(connection.type)}
                    </span>
                    {connection.type === "sqlite" ? (
                      <span className="ml-2 truncate">
                        {connection.filePath?.split("/").pop()}
                      </span>
                    ) : (
                      <span className="ml-2">
                        {connection.host}:{connection.port}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </OverlayScrollbarsComponent>

      {showForm && (
        <ConnectionForm
          connection={editingConnection}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, IconButton, Tooltip, ScrollArea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DevToolsSection } from "./DevToolsSection";
import { SystemResourcesSection } from "./SystemResourcesSection";
import type { SystemCheckResults, SystemResourcesInfo } from "./types";

interface SystemHealthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemHealthPopup({ isOpen, onClose }: SystemHealthPopupProps) {
  const [devTools, setDevTools] = useState<SystemCheckResults | null>(null);
  const [resources, setResources] = useState<SystemResourcesInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const [devToolsResult, resourcesResult] = await Promise.all([
        invoke<SystemCheckResults>("check_system_requirements"),
        invoke<SystemResourcesInfo>("get_system_resources"),
      ]);
      setDevTools(devToolsResult);
      setResources(resourcesResult);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData(true);
    }
  }, [isOpen, fetchData]);

  const refreshButton = (
    <Tooltip content="Refresh">
      <IconButton
        size="sm"
        onClick={() => fetchData(true)}
        disabled={loading}
        aria-label="Refresh system health"
      >
        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
      </IconButton>
    </Tooltip>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health"
      size="lg"
      headerActions={refreshButton}
    >
      <div className="flex flex-col h-[550px] p-4">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-2">
            {loading && !devTools && !resources ? (
              <div className="flex items-center justify-center h-32 text-text-secondary">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading system health...
              </div>
            ) : (
              <>
                <DevToolsSection devTools={devTools} />
                <SystemResourcesSection resources={resources} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </Modal>
  );
}

import { useState, useEffect, useCallback } from "react";
import { History, Radio, Send } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { cn } from "@/lib/utils";
import { RequestTabs } from "./RequestTabs";
import { RequestBuilder } from "./RequestBuilder";
import { HeadersEditor } from "./HeadersEditor";
import { QueryParamsEditor } from "./QueryParamsEditor";
import { BodyEditor } from "./BodyEditor";
import { AuthEditor } from "./AuthEditor";
import { ResponseViewer } from "./ResponseViewer";
import { HistoryPanel } from "./HistoryPanel";
import { WebhookPanel } from "./WebhookPanel";
import type { ApiResponse } from "@/types";

type RequestSection = "params" | "headers" | "auth" | "body";
type SidePanel = "history" | "webhook" | null;

interface ApiTesterPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiTesterPopup({ isOpen, onClose }: ApiTesterPopupProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const {
    getTabsForProject,
    getActiveTab,
    createTab,
    getRequest,
    setResponse,
    addToHistory,
    setLoading,
    isRequestLoading,
  } = useApiTesterStore();

  const [activeSection, setActiveSection] = useState<RequestSection>("params");
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);

  const tabs = activeProjectId ? getTabsForProject(activeProjectId) : [];
  const activeTab = activeProjectId ? getActiveTab(activeProjectId) : undefined;
  const request = activeTab ? getRequest(activeTab.requestId) : undefined;
  const loading = request ? isRequestLoading(request.id) : false;

  // Create initial tab if none exist
  useEffect(() => {
    if (isOpen && activeProjectId && tabs.length === 0) {
      createTab(activeProjectId);
    }
  }, [isOpen, activeProjectId, tabs.length, createTab]);

  const handleSendRequest = useCallback(async () => {
    if (!request || loading) return;

    setLoading(request.id, true);

    try {
      const result = await invoke<ApiResponse>("send_http_request", {
        payload: {
          method: request.method,
          url: request.url,
          headers: request.headers
            .filter((h) => h.enabled && h.key)
            .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
          queryParams: request.queryParams
            .filter((p) => p.enabled && p.key)
            .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
          body: request.body.type !== "none" ? request.body.content : null,
          bodyType: request.body.type,
          auth: request.auth,
        },
      });

      const response: ApiResponse = {
        requestId: request.id,
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        bodySize: result.bodySize,
        responseTime: result.responseTime,
        timestamp: Date.now(),
      };

      setResponse(request.id, response);
      addToHistory(request, response);
    } catch (error) {
      const errorResponse: ApiResponse = {
        requestId: request.id,
        status: 0,
        statusText: "Error",
        headers: {},
        body: String(error),
        bodySize: 0,
        responseTime: 0,
        timestamp: Date.now(),
      };
      setResponse(request.id, errorResponse);
      addToHistory(request, errorResponse);
    } finally {
      setLoading(request.id, false);
    }
  }, [request, loading, setLoading, setResponse, addToHistory]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSendRequest();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSendRequest]);

  const sections: { id: RequestSection; label: string }[] = [
    { id: "params", label: "Params" },
    { id: "headers", label: "Headers" },
    { id: "auth", label: "Auth" },
    { id: "body", label: "Body" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Tester" size="xl">
      <div className="flex flex-col h-[700px]">
        {/* Header with side panel toggles */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidePanel(sidePanel === "history" ? null : "history")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                sidePanel === "history"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => setSidePanel(sidePanel === "webhook" ? null : "webhook")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                sidePanel === "webhook"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              <Radio className="w-3.5 h-3.5" />
              Webhook
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Side Panel */}
          {sidePanel && (
            <div className="w-64 border-r border-border flex-shrink-0 overflow-hidden flex flex-col">
              {sidePanel === "history" ? (
                <HistoryPanel
                  projectId={activeProjectId || ""}
                  onClose={() => setSidePanel(null)}
                />
              ) : (
                <WebhookPanel onClose={() => setSidePanel(null)} />
              )}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            {activeProjectId && (
              <RequestTabs projectId={activeProjectId} />
            )}

            {/* Request Builder */}
            {request && (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <RequestBuilder
                    request={request}
                    onSend={handleSendRequest}
                    loading={loading}
                  />
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                        activeSection === section.id
                          ? "bg-bg-tertiary text-text-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                      )}
                    >
                      {section.label}
                      {section.id === "headers" && request.headers.length > 0 && (
                        <span className="ml-1 text-[10px] text-accent">
                          ({request.headers.filter((h) => h.enabled).length})
                        </span>
                      )}
                      {section.id === "params" && request.queryParams.length > 0 && (
                        <span className="ml-1 text-[10px] text-accent">
                          ({request.queryParams.filter((p) => p.enabled).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Section Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-auto p-4">
                    {activeSection === "params" && (
                      <QueryParamsEditor requestId={request.id} />
                    )}
                    {activeSection === "headers" && (
                      <HeadersEditor requestId={request.id} />
                    )}
                    {activeSection === "auth" && (
                      <AuthEditor requestId={request.id} />
                    )}
                    {activeSection === "body" && (
                      <BodyEditor requestId={request.id} />
                    )}
                  </div>

                  {/* Response */}
                  <div className="h-[250px] border-t border-border flex-shrink-0">
                    <ResponseViewer requestId={request.id} loading={loading} />
                  </div>
                </div>
              </>
            )}

            {!request && (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <Send className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No request selected</p>
                  <button
                    onClick={() => activeProjectId && createTab(activeProjectId)}
                    className="mt-2 text-accent hover:underline text-sm"
                  >
                    Create new request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

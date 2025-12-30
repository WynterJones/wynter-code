import { useCallback } from "react";
import { usePanelStore } from "@/stores/panelStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { LayoutNode } from "./LayoutNode";
import { LayoutSelector } from "./LayoutSelector";
import { ProviderSelector } from "@/components/session/ProviderSelector";
import type { AIProvider } from "@/types";

interface PanelLayoutContainerProps {
  projectId: string;
  projectPath: string;
  sessionId?: string;
}

export function PanelLayoutContainer({ projectId, projectPath, sessionId }: PanelLayoutContainerProps) {
  const layoutState = usePanelStore((s) => s.getLayoutForProject(projectId, sessionId));
  const { getSession, updateSessionProvider, updateSessionModel } = useSessionStore();
  const { installedProviders, defaultModel, defaultCodexModel, defaultGeminiModel } = useSettingsStore();

  const currentSession = sessionId ? getSession(sessionId) : null;
  const currentProvider = currentSession?.provider || "claude";

  const handleProviderChange = useCallback((provider: AIProvider) => {
    if (sessionId) {
      updateSessionProvider(sessionId, provider);

      // Also update the model to the default for the new provider
      const newModel = provider === "codex"
        ? defaultCodexModel
        : provider === "gemini"
          ? defaultGeminiModel
          : defaultModel;
      updateSessionModel(sessionId, newModel);
    }
  }, [sessionId, updateSessionProvider, updateSessionModel, defaultModel, defaultCodexModel, defaultGeminiModel]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Layout selector toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-bg-tertiary/30">
        <div className="flex items-center gap-3">
          <div className="text-xs text-text-secondary">Layout</div>
          <LayoutSelector
            projectId={projectId}
            sessionId={sessionId}
            activeTemplateId={layoutState.activeTemplateId}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-secondary">Provider</div>
          <ProviderSelector
            currentProvider={currentProvider}
            installedProviders={installedProviders}
            onProviderChange={handleProviderChange}
            disabled={!sessionId}
          />
        </div>
      </div>

      {/* Layout content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LayoutNode
          node={layoutState.layout}
          projectId={projectId}
          projectPath={projectPath}
          sessionId={sessionId}
          panels={layoutState.panels}
        />
      </div>
    </div>
  );
}

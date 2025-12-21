import { useState, useEffect } from "react";
import { PanelRightClose } from "lucide-react";
import { ProjectTabBar } from "./ProjectTabBar";
import { SessionTabBar } from "./SessionTabBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { MinimizedPopupTabs } from "./MinimizedPopupTabs";
import { useProjectStore } from "@/stores/projectStore";
import { SettingsPopup } from "@/components/settings";
import { SubscriptionPopup } from "@/components/subscriptions";
import { Tooltip } from "@/components/ui";

const SIDEBAR_COLLAPSED_KEY = "wynter-code-sidebar-collapsed";

export function AppShell() {
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <ProjectTabBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenSubscriptions={() => setShowSubscriptions(true)}
      />

      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}
      {showSubscriptions && <SubscriptionPopup onClose={() => setShowSubscriptions(false)} />}

      {activeProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionTabBar projectId={activeProject.id} />

          <div className="flex-1 flex overflow-hidden relative">
            <MainContent project={activeProject} />
            <Sidebar
              project={activeProject}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
            />
            {sidebarCollapsed && (
              <Tooltip content="Show sidebar" side="left">
                <button
                  onClick={toggleSidebar}
                  className="absolute right-2 top-2 p-1.5 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors z-10"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            <MinimizedPopupTabs projectId={activeProject.id} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Welcome to Wynter Code
            </h2>
            <p className="text-text-secondary mb-4">
              Open a project folder to get started
            </p>
            <button
              onClick={() => {
                // Will trigger folder dialog
              }}
              className="px-4 py-2 bg-accent text-bg-primary rounded-md hover:bg-accent/90 transition-colors"
            >
              Open Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

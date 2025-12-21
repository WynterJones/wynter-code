import { useState } from "react";
import { ProjectTabBar } from "./ProjectTabBar";
import { SessionTabBar } from "./SessionTabBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { useProjectStore } from "@/stores/projectStore";
import { SettingsPopup } from "@/components/settings";

export function AppShell() {
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <ProjectTabBar onOpenSettings={() => setShowSettings(true)} />

      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}

      {activeProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionTabBar projectId={activeProject.id} />

          <div className="flex-1 flex overflow-hidden">
            <MainContent project={activeProject} />
            <Sidebar project={activeProject} />
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

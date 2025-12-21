import { useState, useEffect, useCallback, useRef } from "react";
import { PanelRightClose } from "lucide-react";
import { ProjectTabBar } from "./ProjectTabBar";
import { SessionTabBar } from "./SessionTabBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { MinimizedPopupTabs } from "./MinimizedPopupTabs";
import { useProjectStore } from "@/stores/projectStore";
import { useMeditationStore } from "@/stores/meditationStore";
import { useOnboardingStore } from "@/stores";
import { SettingsPopup } from "@/components/settings";
import { SubscriptionPopup } from "@/components/subscriptions";
import { OnboardingFlow } from "@/components/onboarding";
import { MeditationScreen, MiniMeditationPlayer, MeditationAudioController } from "@/components/meditation";
import { Tooltip } from "@/components/ui";
import type { ImageAttachment } from "@/components/files/FileBrowserPopup";

const SIDEBAR_COLLAPSED_KEY = "wynter-code-sidebar-collapsed";
const SIDEBAR_WIDTH_KEY = "wynter-code-sidebar-width";
const MIN_SIDEBAR_WIDTH = 300;
const MAX_SIDEBAR_WIDTH = 700;
const DEFAULT_SIDEBAR_WIDTH = 400;

export function AppShell() {
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const isMeditating = useMeditationStore((s) => s.isActive);
  const { hasCompletedOnboarding } = useOnboardingStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null);
  const [requestImageBrowser, setRequestImageBrowser] = useState(false);

  const handleSendToPrompt = useCallback((image: ImageAttachment) => {
    setPendingImage(image);
  }, []);

  const handleImageConsumed = useCallback(() => {
    setPendingImage(null);
  }, []);

  const handleRequestImageBrowser = useCallback(() => {
    setRequestImageBrowser(true);
  }, []);

  const handleImageBrowserOpened = useCallback(() => {
    setRequestImageBrowser(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaX = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />;
  }

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <ProjectTabBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenSubscriptions={() => setShowSubscriptions(true)}
        onSendToPrompt={handleSendToPrompt}
        requestImageBrowser={requestImageBrowser}
        onImageBrowserOpened={handleImageBrowserOpened}
      />

      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}
      {showSubscriptions && <SubscriptionPopup onClose={() => setShowSubscriptions(false)} />}
      {isMeditating && <MeditationScreen />}
      <MeditationAudioController />
      <MiniMeditationPlayer />

      {activeProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionTabBar projectId={activeProject.id} />

          <div className={`flex-1 flex overflow-hidden relative ${isResizingSidebar ? "select-none" : ""}`}>
            <MainContent
              project={activeProject}
              pendingImage={pendingImage}
              onImageConsumed={handleImageConsumed}
              onRequestImageBrowser={handleRequestImageBrowser}
            />
            {!sidebarCollapsed && (
              <div
                onMouseDown={handleResizeStart}
                className={`w-1 cursor-col-resize hover:bg-accent/50 transition-colors ${isResizingSidebar ? "bg-accent/50" : ""}`}
              />
            )}
            <Sidebar
              project={activeProject}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              width={sidebarWidth}
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

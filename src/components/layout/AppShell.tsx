import { useState, useEffect, useCallback, useRef } from "react";
import { PanelRightClose, PanelLeftClose } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ProjectTabBar } from "./ProjectTabBar";
import { SessionTabBar } from "./SessionTabBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { MinimizedPopupTabs } from "./MinimizedPopupTabs";
import { useProjectStore } from "@/stores/projectStore";
import { useMeditationStore } from "@/stores/meditationStore";
import { useOnboardingStore } from "@/stores";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";
import { SettingsPopup, KeyboardShortcutsPopup } from "@/components/settings";
import { SubscriptionPopup } from "@/components/subscriptions";
import { OnboardingFlow } from "@/components/onboarding";
import { MeditationScreen, MiniMeditationPlayer, MeditationAudioController } from "@/components/meditation";
import { CommandPalette } from "@/components/command-palette";
import { Tooltip } from "@/components/ui";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCustomMusic } from "@/hooks/useCustomMusic";
import { useBackupScheduler } from "@/hooks/useBackupScheduler";
import { DragGhost } from "@/components/files/DragGhost";
import type { ImageAttachment } from "@/components/files/FileBrowserPopup";

const SIDEBAR_WIDTH_KEY = "wynter-code-sidebar-width";
const MIN_SIDEBAR_WIDTH = 300;
const MAX_SIDEBAR_WIDTH = 700;
const DEFAULT_SIDEBAR_WIDTH = 400;

export function AppShell() {
  const { projects, activeProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const isMeditating = useMeditationStore((s) => s.isActive);
  const { hasCompletedOnboarding } = useOnboardingStore();
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null);
  const [requestImageBrowser, setRequestImageBrowser] = useState(false);
  const [hasBeads, setHasBeads] = useState(false);

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

  // Initialize custom music loading
  useCustomMusic();

  // Initialize backup scheduler
  useBackupScheduler({
    onBackupNeeded: () => {
      // Show notification or indicator that backup is due
      console.log("Backup is due - consider running a backup");
    },
  });

  // Check for beads directory when project changes
  useEffect(() => {
    const checkBeads = async () => {
      if (activeProject?.path) {
        try {
          const hasInit = await invoke<boolean>("beads_has_init", {
            projectPath: activeProject.path,
          });
          setHasBeads(hasInit);
        } catch {
          setHasBeads(false);
        }
      } else {
        setHasBeads(false);
      }
    };
    checkBeads();
  }, [activeProject?.path]);

  const handleOpenFarmwork = useCallback(() => {
    window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action: "openFarmworkTycoon" } }));
  }, []);

  const handleOpenBeads = useCallback(() => {
    window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action: "openBeadsTracker" } }));
  }, []);

  const handleOpenLivePreview = useCallback(() => {
    window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action: "openLivePreview" } }));
  }, []);

  const handleBrowseFiles = useCallback(() => {
    setRequestImageBrowser(true);
  }, []);

  const handleOpenProjectSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action: "openProjectSearch" } }));
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
      // For right sidebar: dragging left increases width
      // For left sidebar: dragging right increases width
      const deltaX = sidebarPosition === "right"
        ? resizeRef.current.startX - e.clientX
        : e.clientX - resizeRef.current.startX;
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
  }, [isResizingSidebar, sidebarPosition]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(!sidebarCollapsed), [sidebarCollapsed, setSidebarCollapsed]);

  const handleFocusPrompt = useCallback(() => {
    // Focus the prompt input - use a custom event that MainContent can listen to
    window.dispatchEvent(new CustomEvent("focus-prompt"));
  }, []);

  const handleToggleFileBrowser = useCallback(() => {
    // If sidebar is collapsed, expand it; otherwise just ensure focus
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    // Dispatch event for sidebar to switch to files tab
    window.dispatchEvent(new CustomEvent("focus-file-browser"));
  }, [sidebarCollapsed]);

  // Listen for open-settings events (e.g., from meditation Radio button)
  useEffect(() => {
    const handleOpenSettings = (e: CustomEvent<{ tab?: string }>) => {
      setSettingsInitialTab(e.detail?.tab);
      setShowSettings(true);
    };
    window.addEventListener("open-settings", handleOpenSettings as EventListener);
    return () => {
      window.removeEventListener("open-settings", handleOpenSettings as EventListener);
    };
  }, []);

  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  // Register global keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: () => setShowSettings(true),
    onToggleSidebar: toggleSidebar,
    onToggleFileBrowser: handleToggleFileBrowser,
    onShowShortcuts: () => setShowShortcuts(true),
    onFocusPrompt: handleFocusPrompt,
    onOpenCommandPalette: openCommandPalette,
  });

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      <ProjectTabBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenSubscriptions={() => setShowSubscriptions(true)}
        onSendToPrompt={handleSendToPrompt}
        requestImageBrowser={requestImageBrowser}
        onImageBrowserOpened={handleImageBrowserOpened}
      />

      {showSettings && (
        <SettingsPopup
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialTab(undefined);
          }}
          initialTab={settingsInitialTab as "general" | "editor" | "markdown" | "music" | "colors" | "compression" | "terminal" | "keyboard" | "avatar" | "data" | "backup" | "farmwork" | "about" | undefined}
        />
      )}
      {showSubscriptions && <SubscriptionPopup onClose={() => setShowSubscriptions(false)} />}
      {showShortcuts && <KeyboardShortcutsPopup onClose={() => setShowShortcuts(false)} />}
      {isMeditating && <MeditationScreen />}
      <CommandPalette />
      <MeditationAudioController />
      <MiniMeditationPlayer />
      <DragGhost />

      {activeProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionTabBar
            projectId={activeProject.id}
            hasBeads={hasBeads}
            onOpenFarmwork={handleOpenFarmwork}
            onOpenBeads={handleOpenBeads}
            onBrowseFiles={handleBrowseFiles}
            onOpenLivePreview={handleOpenLivePreview}
            onOpenProjectSearch={handleOpenProjectSearch}
          />

          <div className={`flex-1 flex overflow-hidden relative ${isResizingSidebar ? "select-none" : ""}`}>
            {sidebarPosition === "left" && (
              <Sidebar
                project={activeProject}
                isCollapsed={sidebarCollapsed}
                isResizing={isResizingSidebar}
                onToggleCollapse={toggleSidebar}
                onResizeStart={handleResizeStart}
                width={sidebarWidth}
                position="left"
              />
            )}
            <MainContent
              project={activeProject}
              pendingImage={pendingImage}
              onImageConsumed={handleImageConsumed}
              onRequestImageBrowser={handleRequestImageBrowser}
            />
            {sidebarPosition === "right" && (
              <Sidebar
                project={activeProject}
                isCollapsed={sidebarCollapsed}
                isResizing={isResizingSidebar}
                onToggleCollapse={toggleSidebar}
                onResizeStart={handleResizeStart}
                width={sidebarWidth}
                position="right"
              />
            )}
            {sidebarCollapsed && (
              <div className={`absolute top-2 ${sidebarPosition === "right" ? "right-2" : "left-2"} z-50`}>
                <Tooltip content="Show sidebar" side={sidebarPosition === "right" ? "left" : "right"}>
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors shadow-sm"
                  >
                    {sidebarPosition === "right" ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </button>
                </Tooltip>
              </div>
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
              className="btn-primary"
            >
              Open Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

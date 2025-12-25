import { useState, useEffect } from "react";
import {
  List,
  Edit3,
  HelpCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { Modal } from "@/components/ui";
import { useJustfileDetection } from "@/hooks/useJustfileDetection";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";
import { RecipesTab } from "./RecipesTab";
import { EditorTab } from "./EditorTab";
import { HelpTab } from "./HelpTab";

interface JustCommandManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "recipes" | "editor" | "help";

const tabs = [
  { id: "recipes" as const, label: "Recipes", icon: List },
  { id: "editor" as const, label: "Editor", icon: Edit3 },
  { id: "help" as const, label: "Help", icon: HelpCircle },
];

export function JustCommandManagerPopup({
  isOpen,
  onClose,
}: JustCommandManagerPopupProps) {
  const [activeTab, setActiveTab] = useState<Tab>("recipes");

  const { hasJustfile, justfileData, isDetecting, refresh } =
    useJustfileDetection();

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  useEffect(() => {
    if (isOpen) {
      refresh();
      setActiveTab("recipes");
    }
  }, [isOpen, refresh]);

  const renderNotDetected = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8">
      <AlertCircle className="w-16 h-16 opacity-20 mb-4" />
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Justfile Not Found
      </h3>
      <p className="text-sm text-center max-w-md mb-6">
        This project doesn&apos;t have a justfile. Create one with:
      </p>
      <code className="px-4 py-2 rounded-lg bg-bg-tertiary text-sm font-mono mb-4">
        touch justfile
      </code>
      <button
        onClick={() => open("https://just.systems/man/en/")}
        className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Learn about just
      </button>
    </div>
  );

  const renderContent = () => {
    if (isDetecting) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
        </div>
      );
    }

    if (!hasJustfile || !justfileData) {
      return renderNotDetected();
    }

    switch (activeTab) {
      case "recipes":
        return (
          <RecipesTab
            justfileData={justfileData}
            projectPath={activeProject?.path}
          />
        );
      case "editor":
        return <EditorTab justfileData={justfileData} onSave={refresh} />;
      case "help":
        return <HelpTab />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Just Command Manager"
      size="lg"
      className="h-[600px]"
    >
      <div className="flex flex-col h-full">
        {hasJustfile && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-tertiary/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}

            {justfileData && (
              <span className="ml-auto text-xs text-text-secondary">
                {justfileData.recipes.length} recipes
              </span>
            )}
          </div>
        )}

        {renderContent()}
      </div>
    </Modal>
  );
}

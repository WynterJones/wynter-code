import { useEffect, useState, useCallback } from "react";
import {
  X,
  Terminal,
  Zap,
  Bot,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  User,
  FolderOpen,
} from "lucide-react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";
import { useClaudeStore, useSettingsStore } from "@/stores";
import type { ClaudeFile, ClaudeFileType } from "@/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";

interface ClaudePopupProps {
  projectPath: string;
}

export function ClaudePopup({ projectPath }: ClaudePopupProps) {
  const {
    isPopupOpen,
    closePopup,
    activeTab,
    setActiveTab,
    activeScope,
    setActiveScope,
    selectedFile,
    setSelectedFile,
    commands,
    skills,
    subagents,
    userSettings,
    projectSettings,
    localSettings,
    versionInfo,
    isCheckingUpdate,
    checkForUpdate,
    loadAllFiles,
    loadSettings,
    saveFile,
    deleteFile,
    createFile,
    saveSettings,
    isLoading,
  } = useClaudeStore();

  const { editorTheme, editorFontSize } = useSettingsStore();

  const [editorContent, setEditorContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isPopupOpen) {
      loadAllFiles(projectPath);
      loadSettings(projectPath);
    }
  }, [isPopupOpen, projectPath, loadAllFiles, loadSettings]);

  useEffect(() => {
    if (selectedFile) {
      setEditorContent(selectedFile.rawContent);
      setHasChanges(false);
    } else if (activeTab === "settings") {
      const settings =
        activeScope === "user"
          ? userSettings
          : activeScope === "project"
            ? projectSettings
            : localSettings;
      setEditorContent(JSON.stringify(settings, null, 2));
      setHasChanges(false);
    }
  }, [selectedFile, activeTab, activeScope, userSettings, projectSettings, localSettings]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePopup();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [closePopup, editorContent, selectedFile, activeTab]
  );

  useEffect(() => {
    if (isPopupOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopupOpen, handleKeyDown]);

  const getCurrentFiles = (): ClaudeFile[] => {
    let files: ClaudeFile[] = [];
    switch (activeTab) {
      case "commands":
        files = commands;
        break;
      case "skills":
        files = skills;
        break;
      case "subagents":
        files = subagents;
        break;
      default:
        return [];
    }
    return files.filter((f) => f.scope === activeScope);
  };

  const getFileType = (): ClaudeFileType => {
    switch (activeTab) {
      case "commands":
        return "command";
      case "skills":
        return "skill";
      case "subagents":
        return "subagent";
      default:
        return "command";
    }
  };

  const handleSave = async () => {
    if (activeTab === "settings") {
      try {
        const parsed = JSON.parse(editorContent);
        const scope = activeScope === "user" ? "user" : activeScope === "project" ? "project" : "local";
        await saveSettings(scope, scope === "user" ? null : projectPath, parsed);
        setHasChanges(false);
      } catch (error) {
        console.error("Invalid JSON:", error);
      }
    } else if (selectedFile) {
      await saveFile(selectedFile.path, editorContent);
      setHasChanges(false);
      loadAllFiles(projectPath);
    }
  };

  const handleDelete = async () => {
    if (selectedFile) {
      if (confirm(`Delete "${selectedFile.name}"?`)) {
        await deleteFile(selectedFile.path);
        loadAllFiles(projectPath);
      }
    }
  };

  const handleCreate = async () => {
    if (!newFileName.trim()) return;

    const name = newFileName.trim().replace(/\.md$/, "");
    try {
      const path = await createFile(activeScope, getFileType(), name, projectPath);
      setNewFileName("");
      setIsCreating(false);
      loadAllFiles(projectPath);

      const files = await new Promise<ClaudeFile[]>((resolve) => {
        setTimeout(() => resolve(getCurrentFiles()), 100);
      });
      const newFile = files.find((f) => f.path === path);
      if (newFile) {
        setSelectedFile(newFile);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };

  if (!isPopupOpen) return null;

  const tabs = [
    { id: "commands" as const, label: "Commands", icon: Terminal, count: commands.length },
    { id: "skills" as const, label: "Skills", icon: Zap, count: skills.length },
    { id: "subagents" as const, label: "Subagents", icon: Bot, count: subagents.length },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const files = getCurrentFiles();
  const editorLanguage = activeTab === "settings" ? "json" : "markdown";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-5xl h-[80vh] bg-bg-primary border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <h2 className="text-lg font-semibold text-text-primary">Claude Manager</h2>
          <button
            onClick={closePopup}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 border-r border-border bg-bg-secondary flex flex-col">
            <div className="p-2 space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-bg-hover text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-auto text-xs text-text-secondary/60">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-auto p-3 border-t border-border">
              <div className="text-xs text-text-secondary mb-1">Version</div>
              <div className="text-sm text-text-primary mb-2">{versionInfo.current}</div>
              <button
                onClick={checkForUpdate}
                disabled={isCheckingUpdate}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                <RefreshCw className={cn("w-3 h-3", isCheckingUpdate && "animate-spin")} />
                {isCheckingUpdate ? "Checking..." : "Check updates"}
              </button>
              {versionInfo.updateAvailable && versionInfo.latest && (
                <div className="mt-1.5 text-xs text-accent">v{versionInfo.latest} available</div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab !== "settings" && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-tertiary/30">
                <button
                  onClick={() => setActiveScope("user")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    activeScope === "user"
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>User</span>
                </button>
                <button
                  onClick={() => setActiveScope("project")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    activeScope === "project"
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Project</span>
                </button>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-tertiary/30">
                <button
                  onClick={() => setActiveScope("user")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    activeScope === "user"
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>User</span>
                </button>
                <button
                  onClick={() => setActiveScope("project")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    activeScope === "project"
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Project</span>
                </button>
              </div>
            )}

            <div className="flex-1 flex overflow-hidden">
              {activeTab !== "settings" && (
                <div className="w-56 border-r border-border flex flex-col">
                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {files.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-text-secondary text-center">
                          No {activeTab} found
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {files.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => setSelectedFile(file)}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                selectedFile?.path === file.path
                                  ? "bg-accent/10 text-text-primary"
                                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                              )}
                            >
                              <div className="truncate">{file.name}</div>
                              {file.frontmatter?.description && (
                                <div className="text-xs text-text-secondary/60 truncate mt-0.5">
                                  {file.frontmatter.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="p-2 border-t border-border">
                    {isCreating ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreate();
                            if (e.key === "Escape") {
                              setIsCreating(false);
                              setNewFileName("");
                            }
                          }}
                          placeholder="filename"
                          className="flex-1 px-2 py-1 text-sm bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          autoFocus
                        />
                        <button
                          onClick={handleCreate}
                          className="p-1 text-accent hover:bg-accent/10 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New {activeTab.slice(0, -1)}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col overflow-hidden">
                {(selectedFile || activeTab === "settings") && (
                  <>
                    <div className="flex-1 overflow-hidden">
                      <Editor
                        height="100%"
                        language={editorLanguage}
                        value={editorContent}
                        onChange={(value) => {
                          setEditorContent(value || "");
                          setHasChanges(true);
                        }}
                        beforeMount={(monaco: Monaco) => {
                          defineMonacoThemes(monaco);
                          // Disable all diagnostics/error checking
                          monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: true,
                            noSyntaxValidation: true,
                          });
                          monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: true,
                            noSyntaxValidation: true,
                          });
                        }}
                        theme={editorTheme || "github-dark"}
                        options={{
                          fontSize: editorFontSize,
                          minimap: { enabled: false },
                          wordWrap: "on",
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          renderValidationDecorations: "off",
                          guides: {
                            indentation: false,
                            bracketPairs: false,
                            highlightActiveIndentation: false,
                          },
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-tertiary/30">
                      <div className="flex items-center gap-2">
                        {selectedFile && (
                          <span className="text-xs text-text-secondary font-mono truncate max-w-[300px]">
                            {selectedFile.path}
                          </span>
                        )}
                        {hasChanges && (
                          <span className="text-xs text-accent">Unsaved changes</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedFile && activeTab !== "settings" && (
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        )}
                        <button
                          onClick={handleSave}
                          disabled={!hasChanges || isLoading}
                          className={cn(
                            hasChanges
                              ? "btn-primary !px-3 !py-1.5"
                              : "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-bg-hover text-text-secondary cursor-not-allowed"
                          )}
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {!selectedFile && activeTab !== "settings" && (
                  <div className="flex-1 flex items-center justify-center text-text-secondary">
                    <p className="text-sm">Select a file to edit</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

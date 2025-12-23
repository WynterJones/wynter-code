import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  AlertTriangle,
  FileText,
  Globe,
  FolderOpen,
  ArrowLeftRight,
  Key,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Modal, IconButton, Tooltip } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useEnvStore, detectSensitive } from "@/stores/envStore";
import { cn } from "@/lib/utils";
import { EnvVariableRow } from "./EnvVariableRow";
import { EnvFileSelector } from "./EnvFileSelector";
import { EnvCompareView } from "./EnvCompareView";
import { EnvAddForm } from "./EnvAddForm";
import type { EnvFile, EnvVariable, SystemEnvVar } from "@/types";

type TabScope = "global" | "project";
type ViewMode = "list" | "compare";

interface EnvManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnvManagerPopup({ isOpen, onClose }: EnvManagerPopupProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = activeProjectId
    ? getProject(activeProjectId)
    : undefined;

  const {
    globalVariables,
    revealedKeys,
    addGlobalVariable,
    updateGlobalVariable,
    deleteGlobalVariable,
    revealValue,
    hideValue,
    hideAllValues,
  } = useEnvStore();

  const [activeTab, setActiveTab] = useState<TabScope>("project");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [envFiles, setEnvFiles] = useState<EnvFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>(".env");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [systemEnvVars, setSystemEnvVars] = useState<SystemEnvVar[]>([]);
  const [systemEnvLoading, setSystemEnvLoading] = useState(false);
  const [systemEnvFilter, setSystemEnvFilter] = useState("");

  const loadEnvFiles = useCallback(async () => {
    if (!activeProject?.path) return;

    setLoading(true);
    setError(null);

    try {
      const files = await invoke<EnvFile[]>("list_env_files", {
        projectPath: activeProject.path,
      });
      setEnvFiles(files);

      const firstExisting = files.find((f) => f.exists);
      if (firstExisting) {
        setSelectedFile(firstExisting.filename);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.path]);

  const loadSystemEnvVars = useCallback(async () => {
    setSystemEnvLoading(true);
    try {
      const vars = await invoke<SystemEnvVar[]>("get_system_env_vars");
      // Sort alphabetically
      vars.sort((a, b) => a.key.localeCompare(b.key));
      setSystemEnvVars(vars);
    } catch (err) {
      console.error("Failed to load system env vars:", err);
    } finally {
      setSystemEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === "global") {
      loadSystemEnvVars();
    }
  }, [isOpen, activeTab, loadSystemEnvVars]);

  useEffect(() => {
    if (isOpen && activeProject?.path) {
      loadEnvFiles();
    }
  }, [isOpen, activeProject?.path, loadEnvFiles]);

  useEffect(() => {
    if (!isOpen) {
      hideAllValues();
    }
  }, [isOpen, hideAllValues]);

  const currentEnvFile = envFiles.find((f) => f.filename === selectedFile);

  const handleSaveVariable = async (variable: EnvVariable, isNew: boolean) => {
    if (!currentEnvFile || !activeProject?.path) return;

    try {
      const updatedVariables = isNew
        ? [...currentEnvFile.variables, variable]
        : currentEnvFile.variables.map((v) =>
            v.key === variable.key ? variable : v
          );

      await invoke("write_env_file", {
        filePath: currentEnvFile.path,
        variables: updatedVariables,
      });

      await loadEnvFiles();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleDeleteVariable = async (key: string) => {
    if (!currentEnvFile) return;

    try {
      const updatedVariables = currentEnvFile.variables.filter(
        (v) => v.key !== key
      );

      await invoke("write_env_file", {
        filePath: currentEnvFile.path,
        variables: updatedVariables,
      });

      await loadEnvFiles();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleCreateEnvFile = async (filename: string) => {
    if (!activeProject?.path) return;

    try {
      await invoke("create_env_file", {
        projectPath: activeProject.path,
        filename,
      });

      await loadEnvFiles();
      setSelectedFile(filename);
    } catch (err) {
      setError(err as string);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Environment Variables"
      size="lg"
    >
      <div className="flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-border">
          <button
            onClick={() => setActiveTab("project")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === "project"
                ? "text-accent border-accent"
                : "text-text-secondary border-transparent hover:text-text-primary"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            Project
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === "global"
                ? "text-accent border-accent"
                : "text-text-secondary border-transparent hover:text-text-primary"
            )}
          >
            <Globe className="w-4 h-4" />
            Global
          </button>

          {activeTab === "project" && (
            <div className="ml-auto flex items-center gap-1">
              <Tooltip content="List View">
                <IconButton
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    viewMode === "list" && "bg-bg-hover text-accent"
                  )}
                >
                  <FileText className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Compare Files">
                <IconButton
                  size="sm"
                  onClick={() => setViewMode("compare")}
                  className={cn(
                    viewMode === "compare" && "bg-bg-hover text-accent"
                  )}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "project" ? (
            <>
              {viewMode === "list" && (
                <EnvFileSelector
                  files={envFiles}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                  onCreateFile={handleCreateEnvFile}
                  onRefresh={loadEnvFiles}
                  loading={loading}
                />
              )}

              {viewMode === "list" ? (
                <div className="flex-1 overflow-y-auto p-4">
                  {currentEnvFile &&
                    !currentEnvFile.isGitignored &&
                    currentEnvFile.exists && (
                      <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          <strong>{currentEnvFile.filename}</strong> is not in
                          .gitignore. Secrets may be committed to version
                          control.
                        </span>
                      </div>
                    )}

                  {currentEnvFile?.exists ? (
                    <div className="space-y-2">
                      {currentEnvFile.variables.map((variable) => (
                        <EnvVariableRow
                          key={variable.key}
                          variable={variable}
                          isRevealed={revealedKeys.has(variable.key)}
                          onReveal={() => revealValue(variable.key)}
                          onHide={() => hideValue(variable.key)}
                          onSave={(v) => handleSaveVariable(v, false)}
                          onDelete={() => handleDeleteVariable(variable.key)}
                        />
                      ))}

                      {currentEnvFile.variables.length === 0 && (
                        <div className="text-center py-8 text-text-secondary">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No variables in this file</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-secondary">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>File does not exist</p>
                      <button
                        onClick={() => handleCreateEnvFile(selectedFile)}
                        className="mt-2 text-accent hover:underline"
                      >
                        Create {selectedFile}
                      </button>
                    </div>
                  )}

                  {currentEnvFile?.exists && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="w-full mt-4 p-3 rounded-lg border border-dashed border-border hover:border-accent hover:bg-bg-tertiary/50 transition-colors flex items-center justify-center gap-2 text-text-secondary hover:text-accent"
                    >
                      <Plus className="w-4 h-4" />
                      Add Variable
                    </button>
                  )}
                </div>
              ) : (
                <EnvCompareView
                  files={envFiles}
                  revealedKeys={revealedKeys}
                  onReveal={revealValue}
                  onHide={hideValue}
                />
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Stored Global Variables Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-medium text-text-primary">
                    Stored Variables
                  </h3>
                  <span className="text-xs text-text-secondary">
                    ({globalVariables.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {globalVariables.map((variable) => (
                    <EnvVariableRow
                      key={variable.id}
                      variable={{
                        key: variable.key,
                        value: variable.value,
                        isSensitive: variable.isSensitive,
                      }}
                      isRevealed={revealedKeys.has(variable.key)}
                      onReveal={() => revealValue(variable.key)}
                      onHide={() => hideValue(variable.key)}
                      onSave={(v) =>
                        updateGlobalVariable(variable.id, {
                          key: v.key,
                          value: v.value,
                          isSensitive: v.isSensitive,
                        })
                      }
                      onDelete={() => deleteGlobalVariable(variable.id)}
                    />
                  ))}

                  {globalVariables.length === 0 && (
                    <div className="text-center py-4 text-text-secondary text-sm">
                      No stored variables
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full mt-3 p-2.5 rounded-lg border border-dashed border-border hover:border-accent hover:bg-bg-tertiary/50 transition-colors flex items-center justify-center gap-2 text-text-secondary hover:text-accent text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Variable
                </button>
              </div>

              {/* System Environment Variables Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-text-primary">
                    System Environment
                  </h3>
                  <span className="text-xs text-text-secondary">
                    ({systemEnvVars.length})
                  </span>
                  <div className="ml-auto">
                    <Tooltip content="Refresh">
                      <IconButton
                        size="sm"
                        onClick={loadSystemEnvVars}
                        disabled={systemEnvLoading}
                      >
                        <RefreshCw
                          className={cn(
                            "w-3.5 h-3.5",
                            systemEnvLoading && "animate-spin"
                          )}
                        />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Filter system variables..."
                  value={systemEnvFilter}
                  onChange={(e) => setSystemEnvFilter(e.target.value)}
                  className="w-full px-3 py-2 mb-3 rounded-lg bg-bg-tertiary border border-border text-sm focus:outline-none focus:border-accent"
                />

                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {systemEnvVars
                    .filter(
                      (v) =>
                        !systemEnvFilter ||
                        v.key
                          .toLowerCase()
                          .includes(systemEnvFilter.toLowerCase()) ||
                        v.value
                          .toLowerCase()
                          .includes(systemEnvFilter.toLowerCase())
                    )
                    .map((variable) => (
                      <div
                        key={variable.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary text-sm group"
                      >
                        <span className="font-mono text-accent truncate min-w-0 flex-shrink-0 max-w-[180px]">
                          {variable.key}
                        </span>
                        <span className="text-text-secondary">=</span>
                        <span className="font-mono text-text-secondary truncate min-w-0 flex-1">
                          {variable.value}
                        </span>
                      </div>
                    ))}

                  {systemEnvVars.length === 0 && !systemEnvLoading && (
                    <div className="text-center py-4 text-text-secondary text-sm">
                      No system variables found
                    </div>
                  )}

                  {systemEnvLoading && (
                    <div className="text-center py-4 text-text-secondary text-sm">
                      Loading system variables...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-secondary/70">
            {activeTab === "project"
              ? "Manage environment variables for this project. Sensitive values are hidden by default."
              : "Stored variables persist across projects. System variables are read from your shell environment."}
          </p>
        </div>

        {showAddForm && (
          <EnvAddForm
            onAdd={(key, value) => {
              if (activeTab === "global") {
                addGlobalVariable(key, value);
              } else if (currentEnvFile) {
                handleSaveVariable(
                  {
                    key,
                    value,
                    isSensitive: detectSensitive(key),
                    lineNumber: currentEnvFile.variables.length + 1,
                  },
                  true
                );
              }
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
            existingKeys={
              activeTab === "global"
                ? globalVariables.map((v) => v.key)
                : currentEnvFile?.variables.map((v) => v.key) || []
            }
          />
        )}
      </div>
    </Modal>
  );
}

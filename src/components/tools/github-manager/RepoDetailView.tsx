import { useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Folder,
  File,
  Lock,
  Unlock,
  Star,
  GitFork,
  Loader2,
  Settings,
  FolderTree,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Globe,
  Calendar,
  GitBranch,
  Save,
  X,
  Archive,
} from "lucide-react";
import { openExternalUrl } from "@/lib/urlSecurity";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useGitHubManagerStore } from "@/stores/githubManagerStore";
import { cn } from "@/lib/utils";

type DetailTab = "files" | "settings";

export function RepoDetailView() {
  const {
    repoDetails,
    repoContents,
    currentPath,
    fileContent,
    selectedFile,
    repoDetailsLoading,
    repoContentsLoading,
    fileContentLoading,
    editLoading,
    deleteLoading,
    setShowRepoDetail,
    loadRepoContents,
    loadFileContent,
    editRepo,
    deleteRepo,
  } = useGitHubManagerStore();

  const [activeTab, setActiveTab] = useState<DetailTab>("files");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (repoDetailsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!repoDetails) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-tertiary">
        Failed to load repository details
      </div>
    );
  }

  const handleBack = () => {
    setShowRepoDetail(false);
  };

  const handleOpenInBrowser = async () => {
    try {
      await openExternalUrl(repoDetails.url);
    } catch (err) {
      console.error("Failed to open repo URL:", err);
    }
  };

  const handleNavigateToPath = (path: string) => {
    loadRepoContents(repoDetails.owner.login, repoDetails.name, path);
  };

  const handleNavigateUp = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    loadRepoContents(repoDetails.owner.login, repoDetails.name, parentPath);
  };

  const handleFileClick = (item: { name: string; path: string; contentType: string }) => {
    if (item.contentType === "dir") {
      handleNavigateToPath(item.path);
    } else {
      loadFileContent(repoDetails.owner.login, repoDetails.name, item.path);
    }
  };

  const handleDelete = async () => {
    const result = await deleteRepo(repoDetails.owner.login, repoDetails.name);
    if (!result.success) {
      console.error("Failed to delete repo:", result.error);
    }
    setShowDeleteConfirm(false);
  };

  // Build breadcrumb parts
  const pathParts = currentPath ? currentPath.split("/") : [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-secondary flex items-center gap-4">
        <Tooltip content="Back to repos">
          <IconButton size="sm" onClick={handleBack} aria-label="Go back to repository list">
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
        </Tooltip>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-text-primary truncate">
              {repoDetails.fullName}
            </h2>
            {repoDetails.isPrivate ? (
              <Lock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            )}
            {repoDetails.isArchived && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded">
                Archived
              </span>
            )}
            {repoDetails.isFork && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-500 rounded flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                Fork
              </span>
            )}
          </div>
          {repoDetails.description && (
            <p className="text-sm text-text-secondary truncate mt-0.5">
              {repoDetails.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-text-tertiary">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {repoDetails.stargazerCount}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-4 h-4" />
            {repoDetails.forkCount}
          </span>
        </div>

        <Tooltip content="Open in browser">
          <IconButton size="sm" onClick={handleOpenInBrowser} aria-label="Open repository in browser">
            <ExternalLink className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Tab bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
            activeTab === "files"
              ? "bg-accent text-[#3d2066]"
              : "hover:bg-bg-hover text-text-secondary"
          )}
        >
          <FolderTree className="w-4 h-4" />
          Files
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
            activeTab === "settings"
              ? "bg-accent text-[#3d2066]"
              : "hover:bg-bg-hover text-text-secondary"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {activeTab === "files" && (
          <div className="flex-1 flex min-h-0">
            {/* File list */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-border">
              {/* Breadcrumb */}
              <div className="px-4 py-2 border-b border-border flex items-center gap-1 text-sm overflow-x-auto">
                <button
                  onClick={() => handleNavigateToPath("")}
                  className="text-accent hover:underline flex-shrink-0"
                >
                  {repoDetails.name}
                </button>
                {pathParts.map((part, idx) => (
                  <span key={idx} className="flex items-center gap-1 flex-shrink-0">
                    <ChevronRight className="w-3 h-3 text-text-tertiary" />
                    <button
                      onClick={() =>
                        handleNavigateToPath(pathParts.slice(0, idx + 1).join("/"))
                      }
                      className="text-accent hover:underline"
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>

              {/* File list content */}
              <ScrollArea className="flex-1" scrollbarVisibility="visible">
                {repoContentsLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="p-2">
                    {currentPath && (
                      <button
                        onClick={handleNavigateUp}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-bg-hover text-left"
                      >
                        <Folder className="w-4 h-4 text-accent" />
                        <span className="text-text-secondary">..</span>
                      </button>
                    )}
                    {/* Directories first, then files */}
                    {[...repoContents]
                      .sort((a, b) => {
                        if (a.contentType === "dir" && b.contentType !== "dir")
                          return -1;
                        if (a.contentType !== "dir" && b.contentType === "dir")
                          return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((item) => (
                        <button
                          key={item.path}
                          onClick={() => handleFileClick(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-bg-hover text-left",
                            selectedFile === item.path && "bg-bg-tertiary"
                          )}
                        >
                          {item.contentType === "dir" ? (
                            <Folder className="w-4 h-4 text-accent" />
                          ) : (
                            <File className="w-4 h-4 text-text-tertiary" />
                          )}
                          <span className="text-text-primary truncate flex-1">
                            {item.name}
                          </span>
                          {item.size !== undefined && item.contentType !== "dir" && (
                            <span className="text-xs text-text-tertiary">
                              {formatFileSize(item.size)}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* File preview */}
            <div className="w-1/2 flex flex-col min-h-0">
              {selectedFile ? (
                <>
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-sm text-text-primary truncate">
                      {selectedFile.split("/").pop()}
                    </span>
                    <IconButton
                      size="sm"
                      onClick={() =>
                        useGitHubManagerStore.getState().setSelectedFile(null)
                      }
                      aria-label="Close file viewer"
                    >
                      <X className="w-3 h-3" />
                    </IconButton>
                  </div>
                  <ScrollArea className="flex-1" scrollbarVisibility="visible">
                    {fileContentLoading ? (
                      <div className="p-8 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      <pre className="p-4 text-sm text-text-primary whitespace-pre-wrap font-mono">
                        {fileContent || "Unable to load file content"}
                      </pre>
                    )}
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-tertiary">
                  <div className="text-center">
                    <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a file to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsTab
            repoDetails={repoDetails}
            editLoading={editLoading}
            deleteLoading={deleteLoading}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            onEdit={editRepo}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  repoDetails,
  editLoading,
  deleteLoading,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onEdit,
  onDelete,
}: {
  repoDetails: NonNullable<ReturnType<typeof useGitHubManagerStore.getState>["repoDetails"]>;
  editLoading: boolean;
  deleteLoading: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onEdit: (
    owner: string,
    repo: string,
    options: { description?: string; visibility?: "public" | "private"; homepage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: () => Promise<void>;
}) {
  const [description, setDescription] = useState(repoDetails.description || "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    repoDetails.isPrivate ? "private" : "public"
  );
  const [homepage, setHomepage] = useState(repoDetails.homepageUrl || "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasChanges =
    description !== (repoDetails.description || "") ||
    visibility !== (repoDetails.isPrivate ? "private" : "public") ||
    homepage !== (repoDetails.homepageUrl || "");

  const handleSave = async () => {
    setSaveError(null);
    const result = await onEdit(repoDetails.owner.login, repoDetails.name, {
      description: description !== repoDetails.description ? description : undefined,
      visibility:
        visibility !== (repoDetails.isPrivate ? "private" : "public")
          ? visibility
          : undefined,
      homepage: homepage !== repoDetails.homepageUrl ? homepage : undefined,
    });
    if (!result.success) {
      setSaveError(result.error || "Failed to save changes");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ScrollArea className="flex-1" scrollbarVisibility="visible">
      <div className="p-6 max-w-2xl">
        {/* Repository Info */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-text-primary mb-4">
            Repository Information
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Created:</span>
              <span className="text-text-primary">{formatDate(repoDetails.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Updated:</span>
              <span className="text-text-primary">{formatDate(repoDetails.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <GitBranch className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Default branch:</span>
              <span className="text-text-primary">{repoDetails.defaultBranch}</span>
            </div>
            {repoDetails.parent && (
              <div className="flex items-center gap-3">
                <GitFork className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-secondary">Forked from:</span>
                <button
                  onClick={async () => {
                    try {
                      await openExternalUrl(repoDetails.parent!.url);
                    } catch (err) {
                      console.error("Failed to open parent repo URL:", err);
                    }
                  }}
                  className="text-accent hover:underline"
                >
                  {repoDetails.parent.fullName}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Edit Settings */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-text-primary mb-4">Settings</h3>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className={cn(
                  "w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg",
                  "text-text-primary placeholder:text-text-tertiary",
                  "focus:outline-none focus:border-accent resize-none"
                )}
                rows={3}
              />
            </div>

            {/* Homepage */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                <Globe className="w-3 h-3 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                placeholder="https://example.com"
                className={cn(
                  "w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg",
                  "text-text-primary placeholder:text-text-tertiary",
                  "focus:outline-none focus:border-accent"
                )}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    className="accent-accent"
                  />
                  <Unlock className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-primary">Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    className="accent-accent"
                  />
                  <Lock className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-primary">Private</span>
                </label>
              </div>
            </div>

            {/* Save button */}
            {hasChanges && (
              <div className="pt-2">
                {saveError && (
                  <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                    {saveError}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={editLoading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-accent text-[#3d2066] rounded-lg font-medium",
                    "hover:bg-accent/90 disabled:opacity-50"
                  )}
                >
                  {editLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="border border-red-500/20 rounded-lg p-4 bg-red-500/5">
          <h3 className="text-lg font-medium text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h3>

          {repoDetails.isArchived ? (
            <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg">
              <Archive className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-500 text-sm">
                This repository is archived and cannot be deleted.
              </span>
            </div>
          ) : showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete{" "}
                <span className="font-medium text-red-400">{repoDetails.fullName}</span>?
                This action cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium",
                    "hover:bg-red-600 disabled:opacity-50"
                  )}
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, delete this repository
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary font-medium">Delete this repository</p>
                <p className="text-sm text-text-tertiary">
                  Once you delete a repository, there is no going back.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

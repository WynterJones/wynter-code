import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export type GitFileStatusType =
  | "untracked"
  | "new"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "conflict";

export interface GitFileStatus {
  path: string;
  status: GitFileStatusType;
}

export interface GitStatusResult {
  gitRoot: string;
  files: GitFileStatus[];
}

export type GitStatusMap = Map<string, GitFileStatusType>;

export function useGitStatus(directoryPath: string | undefined) {
  const [gitStatus, setGitStatus] = useState<GitStatusMap>(new Map());
  const [gitRoot, setGitRoot] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchGitStatus = useCallback(async () => {
    if (!directoryPath) {
      setGitStatus(new Map());
      setGitRoot("");
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<GitStatusResult>("get_git_status", {
        directoryPath,
      });

      setGitRoot(result.gitRoot);

      const statusMap = new Map<string, GitFileStatusType>();
      for (const file of result.files) {
        statusMap.set(file.path, file.status as GitFileStatusType);
      }
      setGitStatus(statusMap);
    } catch (error) {
      console.error("Failed to get git status:", error);
      setGitStatus(new Map());
      setGitRoot("");
    } finally {
      setIsLoading(false);
    }
  }, [directoryPath]);

  useEffect(() => {
    fetchGitStatus();
  }, [fetchGitStatus]);

  const getFileStatus = useCallback(
    (filePath: string): GitFileStatusType | undefined => {
      return gitStatus.get(filePath);
    },
    [gitStatus]
  );

  const getDirectoryStatus = useCallback(
    (dirPath: string): GitFileStatusType | undefined => {
      // A directory has status if any of its children have status
      // Priority: conflict > modified > new/untracked
      let hasModified = false;
      let hasNew = false;

      for (const [path, status] of gitStatus) {
        if (path.startsWith(dirPath + "/")) {
          if (status === "conflict") {
            return "conflict";
          }
          if (status === "modified" || status === "deleted" || status === "renamed") {
            hasModified = true;
          }
          if (status === "untracked" || status === "new") {
            hasNew = true;
          }
        }
      }

      if (hasModified) return "modified";
      if (hasNew) return "untracked";
      return undefined;
    },
    [gitStatus]
  );

  return {
    gitStatus,
    gitRoot,
    isLoading,
    refetch: fetchGitStatus,
    getFileStatus,
    getDirectoryStatus,
  };
}

export function getGitStatusColor(status: GitFileStatusType | undefined): string {
  switch (status) {
    case "untracked":
    case "new":
      return "text-green-400";
    case "modified":
    case "renamed":
    case "copied":
      return "text-orange-400";
    case "deleted":
      return "text-red-400";
    case "conflict":
      return "text-red-500";
    default:
      return "";
  }
}

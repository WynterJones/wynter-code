import { invoke } from "@tauri-apps/api/core";

export function useFileOperations() {
  const createFile = async (parentPath: string, name: string): Promise<string> => {
    return invoke<string>("create_file", { parentPath, name });
  };

  const createFolder = async (parentPath: string, name: string): Promise<string> => {
    return invoke<string>("create_folder", { parentPath, name });
  };

  const renameItem = async (oldPath: string, newName: string): Promise<string> => {
    return invoke<string>("rename_item", { oldPath, newName });
  };

  const deleteToTrash = async (path: string): Promise<void> => {
    return invoke<void>("delete_to_trash", { path });
  };

  const checkNodeModulesExists = async (projectPath: string): Promise<boolean> => {
    return invoke<boolean>("check_node_modules_exists", { projectPath });
  };

  return {
    createFile,
    createFolder,
    renameItem,
    deleteToTrash,
    checkNodeModulesExists,
  };
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useFileOperations } from "./useFileOperations";

describe("useFileOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFile", () => {
    it("should call invoke with correct parameters", async () => {
      const expectedPath = "/path/to/parent/newfile.txt";
      vi.mocked(invoke).mockResolvedValue(expectedPath);

      const { result } = renderHook(() => useFileOperations());

      let createdPath: string | undefined;
      await act(async () => {
        createdPath = await result.current.createFile("/path/to/parent", "newfile.txt");
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/path/to/parent",
        name: "newfile.txt",
      });
      expect(createdPath).toBe(expectedPath);
    });

    it("should handle nested file names", async () => {
      vi.mocked(invoke).mockResolvedValue("/some/path/file.ts");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/some/path", "file.ts");
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/some/path",
        name: "file.ts",
      });
    });

    it("should handle file names with special characters", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/my-file_v2.0.txt");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/path", "my-file_v2.0.txt");
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/path",
        name: "my-file_v2.0.txt",
      });
    });
  });

  describe("createFolder", () => {
    it("should call invoke with correct parameters", async () => {
      const expectedPath = "/path/to/parent/newfolder";
      vi.mocked(invoke).mockResolvedValue(expectedPath);

      const { result } = renderHook(() => useFileOperations());

      let createdPath: string | undefined;
      await act(async () => {
        createdPath = await result.current.createFolder("/path/to/parent", "newfolder");
      });

      expect(invoke).toHaveBeenCalledWith("create_folder", {
        parentPath: "/path/to/parent",
        name: "newfolder",
      });
      expect(createdPath).toBe(expectedPath);
    });

    it("should handle folder names with spaces", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/My New Folder");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFolder("/path", "My New Folder");
      });

      expect(invoke).toHaveBeenCalledWith("create_folder", {
        parentPath: "/path",
        name: "My New Folder",
      });
    });
  });

  describe("renameItem", () => {
    it("should call invoke with correct parameters", async () => {
      const expectedPath = "/path/to/renamed-file.txt";
      vi.mocked(invoke).mockResolvedValue(expectedPath);

      const { result } = renderHook(() => useFileOperations());

      let renamedPath: string | undefined;
      await act(async () => {
        renamedPath = await result.current.renameItem("/path/to/old-file.txt", "renamed-file.txt");
      });

      expect(invoke).toHaveBeenCalledWith("rename_item", {
        oldPath: "/path/to/old-file.txt",
        newName: "renamed-file.txt",
      });
      expect(renamedPath).toBe(expectedPath);
    });

    it("should handle renaming directories", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/new-folder");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.renameItem("/path/old-folder", "new-folder");
      });

      expect(invoke).toHaveBeenCalledWith("rename_item", {
        oldPath: "/path/old-folder",
        newName: "new-folder",
      });
    });

    it("should handle changing file extensions", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/file.tsx");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.renameItem("/path/file.ts", "file.tsx");
      });

      expect(invoke).toHaveBeenCalledWith("rename_item", {
        oldPath: "/path/file.ts",
        newName: "file.tsx",
      });
    });
  });

  describe("deleteToTrash", () => {
    it("should call invoke with correct parameters", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.deleteToTrash("/path/to/file.txt");
      });

      expect(invoke).toHaveBeenCalledWith("delete_to_trash", {
        path: "/path/to/file.txt",
      });
    });

    it("should handle deleting directories", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.deleteToTrash("/path/to/folder");
      });

      expect(invoke).toHaveBeenCalledWith("delete_to_trash", {
        path: "/path/to/folder",
      });
    });
  });

  describe("moveItem", () => {
    it("should call invoke with correct parameters", async () => {
      const expectedPath = "/destination/folder/file.txt";
      vi.mocked(invoke).mockResolvedValue(expectedPath);

      const { result } = renderHook(() => useFileOperations());

      let movedPath: string | undefined;
      await act(async () => {
        movedPath = await result.current.moveItem("/source/file.txt", "/destination/folder");
      });

      expect(invoke).toHaveBeenCalledWith("move_item", {
        sourcePath: "/source/file.txt",
        destinationFolder: "/destination/folder",
      });
      expect(movedPath).toBe(expectedPath);
    });

    it("should handle moving directories", async () => {
      vi.mocked(invoke).mockResolvedValue("/new-location/my-folder");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.moveItem("/old-location/my-folder", "/new-location");
      });

      expect(invoke).toHaveBeenCalledWith("move_item", {
        sourcePath: "/old-location/my-folder",
        destinationFolder: "/new-location",
      });
    });

    it("should handle paths with spaces", async () => {
      vi.mocked(invoke).mockResolvedValue("/My Documents/file.txt");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.moveItem("/Downloads/file.txt", "/My Documents");
      });

      expect(invoke).toHaveBeenCalledWith("move_item", {
        sourcePath: "/Downloads/file.txt",
        destinationFolder: "/My Documents",
      });
    });
  });

  describe("checkNodeModulesExists", () => {
    it("should return true when node_modules exists", async () => {
      vi.mocked(invoke).mockResolvedValue(true);

      const { result } = renderHook(() => useFileOperations());

      let exists: boolean | undefined;
      await act(async () => {
        exists = await result.current.checkNodeModulesExists("/path/to/project");
      });

      expect(invoke).toHaveBeenCalledWith("check_node_modules_exists", {
        projectPath: "/path/to/project",
      });
      expect(exists).toBe(true);
    });

    it("should return false when node_modules does not exist", async () => {
      vi.mocked(invoke).mockResolvedValue(false);

      const { result } = renderHook(() => useFileOperations());

      let exists: boolean | undefined;
      await act(async () => {
        exists = await result.current.checkNodeModulesExists("/path/to/project");
      });

      expect(exists).toBe(false);
    });
  });

  describe("checkFileExists", () => {
    it("should return true when file exists", async () => {
      vi.mocked(invoke).mockResolvedValue("file content");

      const { result } = renderHook(() => useFileOperations());

      let exists: boolean | undefined;
      await act(async () => {
        exists = await result.current.checkFileExists("/path/to/file.txt");
      });

      expect(invoke).toHaveBeenCalledWith("read_file_content", {
        path: "/path/to/file.txt",
      });
      expect(exists).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("File not found"));

      const { result } = renderHook(() => useFileOperations());

      let exists: boolean | undefined;
      await act(async () => {
        exists = await result.current.checkFileExists("/path/to/nonexistent.txt");
      });

      expect(exists).toBe(false);
    });

    it("should return false on any error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Permission denied"));

      const { result } = renderHook(() => useFileOperations());

      let exists: boolean | undefined;
      await act(async () => {
        exists = await result.current.checkFileExists("/path/to/protected.txt");
      });

      expect(exists).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from createFile", async () => {
      const error = new Error("Permission denied");
      vi.mocked(invoke).mockRejectedValue(error);

      const { result } = renderHook(() => useFileOperations());

      await expect(
        act(async () => {
          await result.current.createFile("/protected", "file.txt");
        })
      ).rejects.toThrow("Permission denied");
    });

    it("should propagate errors from deleteToTrash", async () => {
      const error = new Error("File in use");
      vi.mocked(invoke).mockRejectedValue(error);

      const { result } = renderHook(() => useFileOperations());

      await expect(
        act(async () => {
          await result.current.deleteToTrash("/locked/file.txt");
        })
      ).rejects.toThrow("File in use");
    });

    it("should propagate errors from moveItem", async () => {
      const error = new Error("Destination already exists");
      vi.mocked(invoke).mockRejectedValue(error);

      const { result } = renderHook(() => useFileOperations());

      await expect(
        act(async () => {
          await result.current.moveItem("/source/file.txt", "/dest");
        })
      ).rejects.toThrow("Destination already exists");
    });
  });

  describe("path handling edge cases", () => {
    it("should handle root paths", async () => {
      vi.mocked(invoke).mockResolvedValue("/file.txt");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/", "file.txt");
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/",
        name: "file.txt",
      });
    });

    it("should handle paths with trailing slashes", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/to/file.txt");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/path/to/", "file.txt");
      });

      // The hook passes the path as-is; normalization is handled by the backend
      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/path/to/",
        name: "file.txt",
      });
    });

    it("should handle hidden files (dotfiles)", async () => {
      vi.mocked(invoke).mockResolvedValue("/path/.gitignore");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/path", ".gitignore");
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/path",
        name: ".gitignore",
      });
    });

    it("should handle very long file names", async () => {
      const longName = "a".repeat(255) + ".txt";
      vi.mocked(invoke).mockResolvedValue(`/path/${longName}`);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.createFile("/path", longName);
      });

      expect(invoke).toHaveBeenCalledWith("create_file", {
        parentPath: "/path",
        name: longName,
      });
    });
  });
});

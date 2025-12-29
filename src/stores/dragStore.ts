import { create } from "zustand";

interface DraggedFile {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface DragState {
  draggedFile: DraggedFile | null;
  draggedFiles: DraggedFile[];
  isDragging: boolean;
  hoverTargetPath: string | null;
  mousePosition: { x: number; y: number } | null;
  startDrag: (file: DraggedFile, additionalFiles?: DraggedFile[], startPos?: { x: number; y: number }) => void;
  endDrag: () => DraggedFile[];
  cancelDrag: () => void;
  setHoverTarget: (path: string | null) => void;
  getHoverTarget: () => string | null;
}

// Mouse-based drag tracking (since Tauri intercepts HTML5 drag events)
let mouseListenersAttached = false;

function findDropTarget(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);

  for (const el of elements) {
    if (el instanceof HTMLElement) {
      // Check for folder drop targets
      const isFolder = el.getAttribute("data-folder") === "true";
      const path = el.getAttribute("data-path");
      if (isFolder && path) {
        return path;
      }

      // Check for prompt input drop zone
      if (el.getAttribute("data-dropzone") === "prompt") {
        return "prompt-input";
      }
    }
  }

  return null;
}

function handleMouseMove(e: MouseEvent) {
  const state = useDragStore.getState();
  if (!state.isDragging) return;

  // Update mouse position for drag ghost
  useDragStore.setState({ mousePosition: { x: e.clientX, y: e.clientY } });

  // Find and update hover target
  const target = findDropTarget(e.clientX, e.clientY);
  if (target !== state.hoverTargetPath) {
    state.setHoverTarget(target);
  }
}

function handleMouseUp(e: MouseEvent) {
  const state = useDragStore.getState();
  if (!state.isDragging) return;

  const target = findDropTarget(e.clientX, e.clientY);

  if (target === "prompt-input" && state.draggedFiles.length > 0) {
    window.dispatchEvent(new CustomEvent("internal-file-drop", {
      detail: { files: state.draggedFiles }
    }));
  } else if (target && target !== "prompt-input" && state.draggedFiles.length > 0) {
    window.dispatchEvent(new CustomEvent("internal-folder-drop", {
      detail: { files: state.draggedFiles, targetFolder: target }
    }));
  }

  // Cleanup
  removeMouseListeners();
  useDragStore.getState().cancelDrag();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    const state = useDragStore.getState();
    if (state.isDragging) {
      removeMouseListeners();
      state.cancelDrag();
    }
  }
}

function attachMouseListeners() {
  if (mouseListenersAttached) return;
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("keydown", handleKeyDown, true);
  mouseListenersAttached = true;
}

function removeMouseListeners() {
  if (!mouseListenersAttached) return;
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("mouseup", handleMouseUp, true);
  document.removeEventListener("keydown", handleKeyDown, true);
  mouseListenersAttached = false;
}

export const useDragStore = create<DragState>((set, get) => ({
  draggedFile: null,
  draggedFiles: [],
  isDragging: false,
  hoverTargetPath: null,
  mousePosition: null,

  startDrag: (file, additionalFiles = [], startPos) => {
    const allFiles = [file, ...additionalFiles.filter(f => f.path !== file.path)];

    // Attach mouse listeners for tracking
    attachMouseListeners();

    set({
      draggedFile: file,
      draggedFiles: allFiles,
      isDragging: true,
      hoverTargetPath: null,
      mousePosition: startPos || null
    });
  },

  endDrag: () => {
    const files = get().draggedFiles;
    removeMouseListeners();
    set({ draggedFile: null, draggedFiles: [], isDragging: false, hoverTargetPath: null, mousePosition: null });
    return files;
  },

  cancelDrag: () => {
    removeMouseListeners();
    set({ draggedFile: null, draggedFiles: [], isDragging: false, hoverTargetPath: null, mousePosition: null });
  },

  setHoverTarget: (path) => {
    set({ hoverTargetPath: path });
  },

  getHoverTarget: () => {
    return get().hoverTargetPath;
  },
}));

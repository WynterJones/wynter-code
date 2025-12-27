import { create } from "zustand";

interface DraggedFile {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface DragState {
  draggedFile: DraggedFile | null;
  isDragging: boolean;
  startDrag: (file: DraggedFile) => void;
  endDrag: () => DraggedFile | null;
  cancelDrag: () => void;
}

export const useDragStore = create<DragState>((set, get) => ({
  draggedFile: null,
  isDragging: false,

  startDrag: (file) => {
    set({ draggedFile: file, isDragging: true });
  },

  endDrag: () => {
    const file = get().draggedFile;
    set({ draggedFile: null, isDragging: false });
    return file;
  },

  cancelDrag: () => {
    set({ draggedFile: null, isDragging: false });
  },
}));

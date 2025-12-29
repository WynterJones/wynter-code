export interface CodespaceTab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

export interface CodespaceState {
  tabs: CodespaceTab[];
  activeTabId: string | null;
  pendingGoToLine: number | null;
}

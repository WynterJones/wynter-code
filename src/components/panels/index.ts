// Main containers
export { PanelLayoutContainer } from "./PanelLayoutContainer";
export { LayoutNode } from "./LayoutNode";
export { Panel } from "./Panel";

// UI components
export { PanelHeader } from "./PanelHeader";
export { PanelContent } from "./PanelContent";
export { PanelCloseConfirmDialog } from "./PanelCloseConfirmDialog";
export { LayoutSelector } from "./LayoutSelector";
export { SplitResizer } from "./SplitResizer";

// Config
export { PANEL_TYPES, getPanelTypeConfig, getPanelTypeList } from "./panelRegistry";
export { LAYOUT_TEMPLATES, getLayoutTemplateList, getLayoutTemplate } from "./layoutTemplates";

// Panel types
export { EmptyPanel } from "./panel-types/EmptyPanel";
export { ClaudeOutputPanel } from "./panel-types/ClaudeOutputPanel";
export { TerminalPanelContent } from "./panel-types/TerminalPanelContent";
export { FileBrowserPanel } from "./panel-types/FileBrowserPanel";
export { FileViewerPanel } from "./panel-types/FileViewerPanel";
export { BrowserPreviewPanel } from "./panel-types/BrowserPreviewPanel";

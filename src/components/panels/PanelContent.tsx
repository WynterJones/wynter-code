import type { PanelContentProps } from "@/types/panel";
import { EmptyPanel } from "./panel-types/EmptyPanel";
import { ClaudeOutputPanel } from "./panel-types/ClaudeOutputPanel";
import { TerminalPanelContent } from "./panel-types/TerminalPanelContent";
import { FileViewerPanel } from "./panel-types/FileViewerPanel";
import { BrowserPreviewPanel } from "./panel-types/BrowserPreviewPanel";

export function PanelContent(props: PanelContentProps) {
  const { panel } = props;

  switch (panel.type) {
    case "empty":
      return <EmptyPanel {...props} />;
    case "claude-output":
      return <ClaudeOutputPanel {...props} />;
    case "terminal":
      return <TerminalPanelContent {...props} />;
    case "file-viewer":
      return <FileViewerPanel {...props} />;
    case "browser-preview":
      return <BrowserPreviewPanel {...props} />;
    default:
      return <EmptyPanel {...props} />;
  }
}

import type { PanelContentProps } from "@/types/panel";
import { EmptyPanel } from "./panel-types/EmptyPanel";
import { ClaudeOutputPanel } from "./panel-types/ClaudeOutputPanel";
import { TerminalPanelContent } from "./panel-types/TerminalPanelContent";
import { FileBrowserPanel } from "./panel-types/FileBrowserPanel";
import { FileViewerPanel } from "./panel-types/FileViewerPanel";
import { MarkdownViewerPanel } from "./panel-types/MarkdownViewerPanel";
import { FarmworkStatsPanel } from "./panel-types/FarmworkStatsPanel";
import { BrowserPreviewPanel } from "./panel-types/BrowserPreviewPanel";
import { YouTubeEmbedPanel } from "./panel-types/YouTubeEmbedPanel";

export function PanelContent(props: PanelContentProps) {
  const { panel } = props;

  switch (panel.type) {
    case "empty":
      return <EmptyPanel {...props} />;
    case "claude-output":
      return <ClaudeOutputPanel {...props} />;
    case "terminal":
      return <TerminalPanelContent {...props} />;
    case "file-browser":
      return <FileBrowserPanel {...props} />;
    case "file-viewer":
      return <FileViewerPanel {...props} />;
    case "markdown-viewer":
      return <MarkdownViewerPanel {...props} />;
    case "farmwork-stats":
      return <FarmworkStatsPanel {...props} />;
    case "browser-preview":
      return <BrowserPreviewPanel {...props} />;
    case "youtube-embed":
      return <YouTubeEmbedPanel {...props} />;
    default:
      return <EmptyPanel {...props} />;
  }
}

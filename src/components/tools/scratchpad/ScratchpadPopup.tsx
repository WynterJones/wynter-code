import { useState, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Modal } from "@/components/ui";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";

interface ScratchpadPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScratchpadPopup({ isOpen, onClose }: ScratchpadPopupProps) {
  const [content, setContent] = useState("");

  const handleEditorChange = useCallback((value: string | undefined) => {
    setContent(value ?? "");
  }, []);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    defineMonacoThemes(monaco);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scratchpad"
      size="xl"
      showCloseButton
    >
      <div className="h-[500px] w-full">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={content}
          onChange={handleEditorChange}
          beforeMount={handleBeforeMount}
          theme="catppuccin-ultrathin"
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            glyphMargin: false,
            folding: false,
            lineNumbersMinChars: 0,
            renderLineHighlight: "none",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            fontSize: 16,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 24, bottom: 24 },
            lineDecorationsWidth: 24,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "hidden",
              verticalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </Modal>
  );
}

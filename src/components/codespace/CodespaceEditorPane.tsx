import { useCallback, useRef, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDragStore } from "@/stores/dragStore";
import { cn } from "@/lib/utils";
import type { CodespaceTab } from "@/types/codespace";

type MonacoEditor = Parameters<OnMount>[0];

interface CodespaceEditorPaneProps {
  tab: CodespaceTab;
  onChange: (content: string) => void;
  pendingGoToLine?: number | null;
  onClearPendingGoToLine?: () => void;
}

export function CodespaceEditorPane({
  tab,
  onChange,
  pendingGoToLine,
  onClearPendingGoToLine,
}: CodespaceEditorPaneProps) {
  const { editorTheme, editorFontSize, editorWordWrap, editorMinimap } = useSettingsStore();
  const isDragging = useDragStore((s) => s.isDragging);
  const editorRef = useRef<MonacoEditor | null>(null);

  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    defineMonacoThemes(monaco);
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
  }, []);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Go to line when pendingGoToLine changes
  useEffect(() => {
    if (pendingGoToLine && editorRef.current) {
      editorRef.current.revealLineInCenter(pendingGoToLine);
      editorRef.current.setPosition({ lineNumber: pendingGoToLine, column: 1 });
      editorRef.current.focus();
      onClearPendingGoToLine?.();
    }
  }, [pendingGoToLine, onClearPendingGoToLine]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange(value || "");
    },
    [onChange]
  );

  return (
    <div className={cn("flex-1 overflow-hidden", isDragging && "pointer-events-none select-none")}>
      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        onChange={handleChange}
        theme={editorTheme || "github-dark"}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorMount}
        options={{
          fontSize: editorFontSize || 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: editorMinimap ?? false },
          wordWrap: editorWordWrap ? "on" : "off",
          lineNumbers: "on",
          renderLineHighlight: "line",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
        }}
      />
    </div>
  );
}

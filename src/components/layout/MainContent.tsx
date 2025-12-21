import { PromptInput } from "@/components/prompt/PromptInput";
import { OutputWindow } from "@/components/output/OutputWindow";
import { useSessionStore } from "@/stores/sessionStore";
import type { Project } from "@/types";

interface MainContentProps {
  project: Project;
}

export function MainContent({ project }: MainContentProps) {
  const { activeSessionId, getSessionsForProject } = useSessionStore();
  const sessions = getSessionsForProject(project.id);
  const currentSessionId = activeSessionId.get(project.id);
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-accent-yellow">📁</span>
          <span className="font-mono">{project.path}</span>
        </div>
      </div>

      <div className="px-4 pt-3">
        <PromptInput
          projectPath={project.path}
          sessionId={currentSession?.id}
        />
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <OutputWindow sessionId={currentSession?.id} />
      </div>
    </div>
  );
}

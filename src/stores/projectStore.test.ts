import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "./projectStore";

// Helper to reset store state while preserving methods
const resetStore = () => {
  const { addProject, addProjectWithId, removeProject, setActiveProject, updateProjectName, updateProjectColor, updateProjectIcon, toggleMinimized, reorderProjects, getProject } = useProjectStore.getState();
  useProjectStore.setState({
    projects: [],
    activeProjectId: null,
    addProject,
    addProjectWithId,
    removeProject,
    setActiveProject,
    updateProjectName,
    updateProjectColor,
    updateProjectIcon,
    toggleMinimized,
    reorderProjects,
    getProject,
  });
};

describe("projectStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("addProject", () => {
    it("adds a new project with correct defaults", () => {
      useProjectStore.getState().addProject("/Users/test/my-project");

      const projects = useProjectStore.getState().projects;
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("my-project");
      expect(projects[0].path).toBe("/Users/test/my-project");
      expect(projects[0].id).toBeDefined();
      expect(projects[0].createdAt).toBeDefined();
      expect(projects[0].lastOpenedAt).toBeDefined();
    });

    it("sets new project as active", () => {
      useProjectStore.getState().addProject("/Users/test/my-project");

      const state = useProjectStore.getState();
      expect(state.activeProjectId).toBe(state.projects[0].id);
    });

    it("extracts project name from path", () => {
      useProjectStore.getState().addProject("/some/deep/nested/path/awesome-project");

      expect(useProjectStore.getState().projects[0].name).toBe("awesome-project");
    });

    it("uses fallback name for empty path component", () => {
      useProjectStore.getState().addProject("/");

      expect(useProjectStore.getState().projects[0].name).toBe("Project");
    });

    it("does not duplicate existing project by path", () => {
      useProjectStore.getState().addProject("/Users/test/my-project");
      const firstId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().addProject("/Users/test/my-project");

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.activeProjectId).toBe(firstId);
    });

    it("activates existing project when adding duplicate path", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      useProjectStore.getState().addProject("/Users/test/project-b");
      const projectAId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().addProject("/Users/test/project-a");

      expect(useProjectStore.getState().activeProjectId).toBe(projectAId);
    });
  });

  describe("addProjectWithId", () => {
    it("adds project with specified id and name", () => {
      useProjectStore.getState().addProjectWithId("custom-id", "/path/to/project", "Custom Name");

      const project = useProjectStore.getState().getProject("custom-id");
      expect(project).toBeDefined();
      expect(project?.id).toBe("custom-id");
      expect(project?.name).toBe("Custom Name");
      expect(project?.path).toBe("/path/to/project");
    });

    it("adds project with optional color", () => {
      useProjectStore.getState().addProjectWithId(
        "color-id",
        "/path/to/project",
        "Colored Project",
        "#ff0000"
      );

      const project = useProjectStore.getState().getProject("color-id");
      expect(project?.color).toBe("#ff0000");
    });

    it("does not set as active (for mobile API)", () => {
      useProjectStore.getState().addProjectWithId("mobile-id", "/path/to/project", "Mobile Project");

      expect(useProjectStore.getState().activeProjectId).toBeNull();
    });

    it("does not duplicate existing project by path", () => {
      useProjectStore.getState().addProjectWithId("id-1", "/path/to/project", "Project 1");
      useProjectStore.getState().addProjectWithId("id-2", "/path/to/project", "Project 2");

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe("id-1");
    });
  });

  describe("removeProject", () => {
    it("removes project by id", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().removeProject(projectId);

      expect(useProjectStore.getState().projects).toHaveLength(0);
    });

    it("switches active project when removing current active", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      useProjectStore.getState().addProject("/Users/test/project-b");
      const projectAId = useProjectStore.getState().projects[0].id;
      const projectBId = useProjectStore.getState().projects[1].id;

      useProjectStore.getState().setActiveProject(projectBId);
      useProjectStore.getState().removeProject(projectBId);

      expect(useProjectStore.getState().activeProjectId).toBe(projectAId);
    });

    it("sets activeProjectId to null when removing last project", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().removeProject(projectId);

      expect(useProjectStore.getState().activeProjectId).toBeNull();
    });

    it("keeps activeProjectId unchanged when removing non-active project", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      useProjectStore.getState().addProject("/Users/test/project-b");
      const projectAId = useProjectStore.getState().projects[0].id;
      const projectBId = useProjectStore.getState().projects[1].id;

      useProjectStore.getState().setActiveProject(projectAId);
      useProjectStore.getState().removeProject(projectBId);

      expect(useProjectStore.getState().activeProjectId).toBe(projectAId);
    });
  });

  describe("setActiveProject", () => {
    it("sets the active project", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      useProjectStore.getState().addProject("/Users/test/project-b");
      const projectAId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().setActiveProject(projectAId);

      expect(useProjectStore.getState().activeProjectId).toBe(projectAId);
    });

    it("updates lastOpenedAt when switching", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;
      const initialDate = useProjectStore.getState().projects[0].lastOpenedAt;

      // Wait a tiny bit to ensure time difference
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* wait */
      }

      useProjectStore.getState().setActiveProject(projectId);

      const updatedProject = useProjectStore.getState().getProject(projectId);
      expect(updatedProject?.lastOpenedAt).not.toEqual(initialDate);
    });
  });

  describe("updateProjectName", () => {
    it("updates project name", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProjectName(projectId, "New Name");

      expect(useProjectStore.getState().getProject(projectId)?.name).toBe("New Name");
    });
  });

  describe("updateProjectColor", () => {
    it("updates project color", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProjectColor(projectId, "#00ff00");

      expect(useProjectStore.getState().getProject(projectId)?.color).toBe("#00ff00");
    });

    it("clears color when set to empty string", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProjectColor(projectId, "#ff0000");
      useProjectStore.getState().updateProjectColor(projectId, "");

      expect(useProjectStore.getState().getProject(projectId)?.color).toBeUndefined();
    });
  });

  describe("updateProjectIcon", () => {
    it("updates project icon", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProjectIcon(projectId, "folder");

      expect(useProjectStore.getState().getProject(projectId)?.icon).toBe("folder");
    });

    it("clears icon when set to empty string", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProjectIcon(projectId, "star");
      useProjectStore.getState().updateProjectIcon(projectId, "");

      expect(useProjectStore.getState().getProject(projectId)?.icon).toBeUndefined();
    });
  });

  describe("toggleMinimized", () => {
    it("toggles minimized state from undefined to true", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().toggleMinimized(projectId);

      expect(useProjectStore.getState().getProject(projectId)?.minimized).toBe(true);
    });

    it("toggles minimized state from true to false", () => {
      useProjectStore.getState().addProject("/Users/test/project-a");
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().toggleMinimized(projectId);
      useProjectStore.getState().toggleMinimized(projectId);

      expect(useProjectStore.getState().getProject(projectId)?.minimized).toBe(false);
    });
  });

  describe("reorderProjects", () => {
    it("reorders projects correctly", () => {
      useProjectStore.getState().addProject("/path/project-a");
      useProjectStore.getState().addProject("/path/project-b");
      useProjectStore.getState().addProject("/path/project-c");

      const projectA = useProjectStore.getState().projects[0].id;
      const projectB = useProjectStore.getState().projects[1].id;
      const projectC = useProjectStore.getState().projects[2].id;

      useProjectStore.getState().reorderProjects(0, 2);

      const projects = useProjectStore.getState().projects;
      expect(projects[0].id).toBe(projectB);
      expect(projects[1].id).toBe(projectC);
      expect(projects[2].id).toBe(projectA);
    });

    it("handles moving to same position", () => {
      useProjectStore.getState().addProject("/path/project-a");
      useProjectStore.getState().addProject("/path/project-b");
      const projectA = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().reorderProjects(0, 0);

      expect(useProjectStore.getState().projects[0].id).toBe(projectA);
    });

    it("handles moving item backward", () => {
      useProjectStore.getState().addProject("/path/project-a");
      useProjectStore.getState().addProject("/path/project-b");
      useProjectStore.getState().addProject("/path/project-c");

      const projectA = useProjectStore.getState().projects[0].id;
      const projectB = useProjectStore.getState().projects[1].id;
      const projectC = useProjectStore.getState().projects[2].id;

      useProjectStore.getState().reorderProjects(2, 0);

      const projects = useProjectStore.getState().projects;
      expect(projects[0].id).toBe(projectC);
      expect(projects[1].id).toBe(projectA);
      expect(projects[2].id).toBe(projectB);
    });
  });

  describe("getProject", () => {
    it("returns project by id", () => {
      useProjectStore.getState().addProject("/Users/test/my-project");
      const projectId = useProjectStore.getState().projects[0].id;

      const project = useProjectStore.getState().getProject(projectId);

      expect(project).toBeDefined();
      expect(project?.id).toBe(projectId);
    });

    it("returns undefined for non-existent id", () => {
      const project = useProjectStore.getState().getProject("non-existent-id");

      expect(project).toBeUndefined();
    });
  });
});

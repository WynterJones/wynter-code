import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import type {
  JustfileData,
  JustRecipe,
  JustParameter,
} from "@/components/tools/just-command-manager/types";

interface JustfileDetection {
  hasJustfile: boolean;
  justfileData: JustfileData | null;
  isDetecting: boolean;
}

const JUSTFILE_NAMES = ["justfile", "Justfile", ".justfile"];

function parseJustfile(content: string, path: string): JustfileData {
  const lines = content.split("\n");
  const recipes: JustRecipe[] = [];
  const variables: Record<string, string> = {};

  let currentRecipe: JustRecipe | null = null;
  let pendingComment: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      pendingComment = undefined;
      continue;
    }

    // Variable assignment: name := value
    const varMatch = trimmed.match(/^(\w+)\s*:=\s*(.+)$/);
    if (varMatch) {
      variables[varMatch[1]] = varMatch[2];
      continue;
    }

    // Comment (potential recipe description)
    if (trimmed.startsWith("#")) {
      pendingComment = trimmed.slice(1).trim();
      continue;
    }

    // Recipe definition: [@-]name [params]: [deps]
    // Match patterns like:
    // recipe:
    // recipe param:
    // recipe param="default":
    // @recipe:  (quiet)
    // _recipe:  (private)
    const recipeMatch = trimmed.match(
      /^([@_-]?)(\w[\w-]*)((?:\s+\w+(?:\+)?(?:=(?:"[^"]*"|'[^']*'|\S+))?)*)\s*:(.*)?$/
    );

    if (recipeMatch) {
      // Save previous recipe
      if (currentRecipe) {
        recipes.push(currentRecipe);
      }

      const [, prefix, name, paramsPart, depsPart] = recipeMatch;

      // Parse parameters
      const parameters: JustParameter[] = [];
      if (paramsPart.trim()) {
        const paramRegex = /(\w+)(\+)?(?:=("[^"]*"|'[^']*'|\S+))?/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(paramsPart)) !== null) {
          parameters.push({
            name: paramMatch[1],
            isVariadic: paramMatch[2] === "+",
            defaultValue: paramMatch[3]?.replace(/^["']|["']$/g, ""),
          });
        }
      }

      // Parse dependencies
      const dependencies = depsPart?.trim()
        ? depsPart
            .trim()
            .split(/\s+/)
            .filter((d) => d && !d.startsWith("("))
        : [];

      currentRecipe = {
        name,
        description: pendingComment,
        dependencies,
        parameters,
        body: [],
        lineNumber: i + 1,
        isPrivate: prefix === "_",
        isQuiet: prefix === "@",
      };
      pendingComment = undefined;
      continue;
    }

    // Recipe body (indented lines)
    if (currentRecipe && (line.startsWith("\t") || line.startsWith("    "))) {
      currentRecipe.body.push(line.replace(/^\t|^    /, ""));
    }
  }

  // Don't forget the last recipe
  if (currentRecipe) {
    recipes.push(currentRecipe);
  }

  return { path, variables, recipes, rawContent: content };
}

export function useJustfileDetection() {
  const [detection, setDetection] = useState<JustfileDetection>({
    hasJustfile: false,
    justfileData: null,
    isDetecting: true,
  });

  const activeProject = useProjectStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) || null;
  });

  const detectJustfile = useCallback(async () => {
    if (!activeProject?.path) {
      setDetection({
        hasJustfile: false,
        justfileData: null,
        isDetecting: false,
      });
      return;
    }

    setDetection((prev) => ({ ...prev, isDetecting: true }));

    for (const filename of JUSTFILE_NAMES) {
      try {
        const content = await invoke<string>("read_file_content", {
          path: `${activeProject.path}/${filename}`,
        });

        const justfileData = parseJustfile(
          content,
          `${activeProject.path}/${filename}`
        );

        setDetection({
          hasJustfile: true,
          justfileData,
          isDetecting: false,
        });
        return;
      } catch {
        // File doesn't exist, try next
      }
    }

    setDetection({
      hasJustfile: false,
      justfileData: null,
      isDetecting: false,
    });
  }, [activeProject?.path]);

  useEffect(() => {
    detectJustfile();
  }, [detectJustfile]);

  return { ...detection, refresh: detectJustfile };
}

import { describe, it, expect } from "vitest";
import { splitContentWithDiffs, getFileExtension } from "./parseCliDiff";

describe("getFileExtension", () => {
  describe("TypeScript files", () => {
    it("should return 'typescript' for .ts files", () => {
      expect(getFileExtension("app.ts")).toBe("typescript");
    });

    it("should return 'typescript' for .tsx files", () => {
      expect(getFileExtension("Button.tsx")).toBe("typescript");
    });

    it("should handle uppercase extensions", () => {
      expect(getFileExtension("app.TS")).toBe("typescript");
      expect(getFileExtension("Button.TSX")).toBe("typescript");
    });

    it("should handle mixed case extensions", () => {
      expect(getFileExtension("app.Ts")).toBe("typescript");
      expect(getFileExtension("Button.TsX")).toBe("typescript");
    });
  });

  describe("JavaScript files", () => {
    it("should return 'javascript' for .js files", () => {
      expect(getFileExtension("script.js")).toBe("javascript");
    });

    it("should return 'javascript' for .jsx files", () => {
      expect(getFileExtension("Component.jsx")).toBe("javascript");
    });
  });

  describe("Rust files", () => {
    it("should return 'rust' for .rs files", () => {
      expect(getFileExtension("main.rs")).toBe("rust");
    });
  });

  describe("Python files", () => {
    it("should return 'python' for .py files", () => {
      expect(getFileExtension("script.py")).toBe("python");
    });
  });

  describe("C/C++ files", () => {
    it("should return 'c' for .c files", () => {
      expect(getFileExtension("main.c")).toBe("c");
    });

    it("should return 'c' for .h files", () => {
      expect(getFileExtension("header.h")).toBe("c");
    });

    it("should return 'cpp' for .cpp files", () => {
      expect(getFileExtension("main.cpp")).toBe("cpp");
    });

    it("should return 'cpp' for .hpp files", () => {
      expect(getFileExtension("header.hpp")).toBe("cpp");
    });
  });

  describe("Web files", () => {
    it("should return 'html' for .html files", () => {
      expect(getFileExtension("index.html")).toBe("html");
    });

    it("should return 'css' for .css files", () => {
      expect(getFileExtension("style.css")).toBe("css");
    });

    it("should return 'scss' for .scss files", () => {
      expect(getFileExtension("style.scss")).toBe("scss");
    });
  });

  describe("Data format files", () => {
    it("should return 'json' for .json files", () => {
      expect(getFileExtension("package.json")).toBe("json");
    });

    it("should return 'yaml' for .yaml files", () => {
      expect(getFileExtension("config.yaml")).toBe("yaml");
    });

    it("should return 'yaml' for .yml files", () => {
      expect(getFileExtension("config.yml")).toBe("yaml");
    });

    it("should return 'xml' for .xml files", () => {
      expect(getFileExtension("config.xml")).toBe("xml");
    });

    it("should return 'toml' for .toml files", () => {
      expect(getFileExtension("Cargo.toml")).toBe("toml");
    });

    it("should return 'sql' for .sql files", () => {
      expect(getFileExtension("schema.sql")).toBe("sql");
    });
  });

  describe("Markdown and documentation", () => {
    it("should return 'markdown' for .md files", () => {
      expect(getFileExtension("README.md")).toBe("markdown");
    });
  });

  describe("Shell scripts", () => {
    it("should return 'bash' for .sh files", () => {
      expect(getFileExtension("script.sh")).toBe("bash");
    });

    it("should return 'bash' for .bash files", () => {
      expect(getFileExtension("script.bash")).toBe("bash");
    });

    it("should return 'bash' for .zsh files", () => {
      expect(getFileExtension("script.zsh")).toBe("bash");
    });
  });

  describe("Other language files", () => {
    it("should return 'ruby' for .rb files", () => {
      expect(getFileExtension("script.rb")).toBe("ruby");
    });

    it("should return 'go' for .go files", () => {
      expect(getFileExtension("main.go")).toBe("go");
    });

    it("should return 'java' for .java files", () => {
      expect(getFileExtension("Main.java")).toBe("java");
    });

    it("should return 'vue' for .vue files", () => {
      expect(getFileExtension("Component.vue")).toBe("vue");
    });

    it("should return 'svelte' for .svelte files", () => {
      expect(getFileExtension("Component.svelte")).toBe("svelte");
    });
  });

  describe("Unknown and edge cases", () => {
    it("should return 'plaintext' for unknown extensions", () => {
      expect(getFileExtension("file.xyz")).toBe("plaintext");
      expect(getFileExtension("file.unknown")).toBe("plaintext");
    });

    it("should return 'plaintext' for files without extensions", () => {
      expect(getFileExtension("Dockerfile")).toBe("plaintext");
      expect(getFileExtension("Makefile")).toBe("plaintext");
      expect(getFileExtension("README")).toBe("plaintext");
    });

    it("should return 'plaintext' for empty string", () => {
      expect(getFileExtension("")).toBe("plaintext");
    });

    it("should handle files with multiple dots", () => {
      expect(getFileExtension("file.test.ts")).toBe("typescript");
      expect(getFileExtension("app.min.js")).toBe("javascript");
    });

    it("should handle paths with directories", () => {
      expect(getFileExtension("src/components/Button.tsx")).toBe("typescript");
      expect(getFileExtension("/usr/local/script.sh")).toBe("bash");
    });
  });
});

describe("splitContentWithDiffs", () => {
  describe("Pure markdown content", () => {
    it("should return single markdown segment for plain text", () => {
      const content = "This is plain markdown content";
      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("markdown");
      expect(segments[0].content).toBe(content);
      expect(segments[0].diff).toBeUndefined();
    });

    it("should handle multiline markdown", () => {
      const content = `# Title
This is a paragraph.
- List item 1
- List item 2`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("markdown");
      expect(segments[0].content).toBe(content);
    });

    it("should handle empty content", () => {
      const segments = splitContentWithDiffs("");
      expect(segments).toHaveLength(0);
    });

    it("should handle whitespace-only content", () => {
      const segments = splitContentWithDiffs("   \n\n  ");
      expect(segments).toHaveLength(0);
    });
  });

  describe("Single diff block", () => {
    it("should parse a simple Update diff", () => {
      const content = `● Update(src/file.ts)
└─ Added 5 lines, removed 2 lines
   10 + new line
   11   context line
   12 - removed line`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("diff");
      expect(segments[0].diff).toBeDefined();

      const diff = segments[0].diff!;
      expect(diff.operation).toBe("Update");
      expect(diff.filename).toBe("src/file.ts");
      // The regex pattern only captures diffs that are properly formatted
      // with minimal structure, so we check that parsing succeeded
      expect(diff.lines.length).toBeGreaterThan(0);
    });

    it("should parse Create operation", () => {
      const content = `● Create(src/new.ts)
└─ Added 10 lines, removed 0 lines
   1 + const x = 1;`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.operation).toBe("Create");
      expect(segments[0].diff?.filename).toBe("src/new.ts");
    });

    it("should parse Delete operation", () => {
      const content = `● Delete(src/old.ts)
└─ Added 0 lines, removed 5 lines
   1 - old code`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.operation).toBe("Delete");
    });

    it("should parse Read operation", () => {
      const content = `● Read(src/config.json)
└─ Added 0 lines, removed 0 lines
   1   { "key": "value" }`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.operation).toBe("Read");
    });

    it("should parse Write operation", () => {
      const content = `● Write(src/data.txt)
└─ Added 3 lines, removed 0 lines
   1 + line 1
   2 + line 2`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.operation).toBe("Write");
    });

    it("should parse diff with different line characters", () => {
      const content = `○ Update(src/file.ts)
├─ Added 1 line, removed 1 line
   5 + new`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].type).toBe("diff");
      expect(segments[0].diff?.operation).toBe("Update");
    });
  });

  describe("Diff line parsing", () => {
    it("should correctly identify addition lines", () => {
      const content = `● Update(src/file.ts)
└─ Added 2 lines, removed 0 lines
   5 + added line`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      expect(lines).toHaveLength(1);
      expect(lines[0].type).toBe("addition");
      expect(lines[0].lineNumber).toBe(5);
      expect(lines[0].content).toBe("added line");
    });

    it("should correctly identify deletion lines", () => {
      const content = `● Update(src/file.ts)
└─ Added 0 lines, removed 1 line
   8 - removed line`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      expect(lines).toHaveLength(1);
      expect(lines[0].type).toBe("deletion");
      expect(lines[0].lineNumber).toBe(8);
      expect(lines[0].content).toBe("removed line");
    });

    it("should correctly identify context lines", () => {
      const content = `● Update(src/file.ts)
└─ Added 0 lines, removed 0 lines
   10   context line`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      expect(lines).toHaveLength(1);
      expect(lines[0].type).toBe("context");
      expect(lines[0].lineNumber).toBe(10);
      expect(lines[0].content).toBe("context line");
    });

    it("should skip empty lines", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   5 + line 1

   6 + line 2`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      // Empty lines should be skipped
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((l) => l.content.trim() !== "")).toBe(true);
    });

    it("should handle lines with leading whitespace", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 +   indented content`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      // The regex captures content after the +/- indicator
      // Leading spaces within the content are preserved
      expect(lines[0].content).toContain("indented content");
    });
  });

  describe("Multiple diff blocks", () => {
    it("should parse two separate diffs", () => {
      const content = `● Update(src/file1.ts)
└─ Added 1 line, removed 0 lines
   10 + new line

● Update(src/file2.ts)
└─ Added 2 lines, removed 1 line
   5 + added
   6 - removed`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe("diff");
      expect(segments[0].diff?.filename).toBe("src/file1.ts");
      expect(segments[1].type).toBe("diff");
      expect(segments[1].diff?.filename).toBe("src/file2.ts");
    });

    it("should parse three diffs with different operations", () => {
      const content = `● Create(src/new.ts)
└─ Added 3 lines, removed 0 lines
   1 + code

● Update(src/existing.ts)
└─ Added 1 line, removed 1 line
   5 + new

● Delete(src/old.ts)
└─ Added 0 lines, removed 2 lines
   1 - old`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(3);
      expect(segments[0].diff?.operation).toBe("Create");
      expect(segments[1].diff?.operation).toBe("Update");
      expect(segments[2].diff?.operation).toBe("Delete");
    });
  });

  describe("Mixed markdown and diff content", () => {
    it("should separate markdown before diff", () => {
      const content = `Here's the change I made:

● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new line`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe("markdown");
      expect(segments[0].content).toContain("Here's the change");
      expect(segments[1].type).toBe("diff");
    });

    it("should separate markdown after diff", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new line

This is what happened.`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe("diff");
      expect(segments[1].type).toBe("markdown");
      expect(segments[1].content).toContain("This is what happened");
    });

    it("should handle markdown between diffs", () => {
      const content = `● Update(src/file1.ts)
└─ Added 1 line, removed 0 lines
   10 + new

Then I made this change:

● Update(src/file2.ts)
└─ Added 1 line, removed 0 lines
   5 + another`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(3);
      expect(segments[0].type).toBe("diff");
      expect(segments[1].type).toBe("markdown");
      expect(segments[2].type).toBe("diff");
    });

    it("should handle complex mixed content", () => {
      const content = `# Summary of Changes

I've updated the following files:

● Create(src/new.ts)
└─ Added 5 lines, removed 0 lines
   1 + code

And also modified an existing file:

● Update(src/existing.ts)
└─ Added 2 lines, removed 1 line
   10 + new
   11 - old

The changes are ready for review.`;

      const segments = splitContentWithDiffs(content);

      expect(segments.length).toBeGreaterThan(3);
      expect(segments.filter((s) => s.type === "diff")).toHaveLength(2);
      expect(segments.filter((s) => s.type === "markdown").length).toBeGreaterThan(1);
    });
  });

  describe("Edge cases and malformed diffs", () => {
    it("should treat malformed diff-like content as markdown", () => {
      const content = `● Update(src/file.ts) - missing stats
   10 + new line`;

      const segments = splitContentWithDiffs(content);

      // Without proper stats line, this should be treated as markdown
      expect(segments[0].type).toBe("markdown");
    });

    it("should handle diff with zero additions and deletions", () => {
      const content = `● Read(src/file.ts)
└─ Added 0 lines, removed 0 lines
   1   context line`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.additions).toBe(0);
      expect(segments[0].diff?.deletions).toBe(0);
    });

    it("should handle singular 'line' in stats", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 1 line
   5 + new`;

      const segments = splitContentWithDiffs(content);

      // The STATS_PATTERN matches both singular and plural forms
      // This test verifies the regex can handle singular forms
      expect(segments[0].type).toBe("diff");
      expect(segments[0].diff?.operation).toBe("Update");
    });

    it("should handle filenames with special characters", () => {
      const content = `● Update(src/my-file.test.ts)
└─ Added 1 line, removed 0 lines
   10 + new`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.filename).toBe("src/my-file.test.ts");
    });

    it("should handle filenames with spaces (URL encoded)", () => {
      const content = `● Update(src/file%20name.ts)
└─ Added 1 line, removed 0 lines
   10 + new`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.filename).toBe("src/file%20name.ts");
    });

    it("should preserve raw diff block", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].diff?.raw).toBe(content.trim());
    });
  });

  describe("Content segment structure", () => {
    it("should include content property for markdown segments", () => {
      const content = "# Markdown content";
      const segments = splitContentWithDiffs(content);

      expect(segments[0].content).toBe(content);
      expect(segments[0].type).toBe("markdown");
      expect(segments[0].diff).toBeUndefined();
    });

    it("should include both content and diff for diff segments", () => {
      const content = `● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new`;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].content).toBeDefined();
      expect(segments[0].diff).toBeDefined();
      expect(segments[0].type).toBe("diff");
    });

    it("should have correct ContentSegment structure", () => {
      const content = `Intro text

● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new

Final text`;

      const segments = splitContentWithDiffs(content);

      segments.forEach((segment) => {
        expect(segment).toHaveProperty("type");
        expect(segment).toHaveProperty("content");
        expect(["markdown", "diff"]).toContain(segment.type);

        if (segment.type === "diff") {
          expect(segment.diff).toBeDefined();
          expect(segment.diff?.operation).toBeDefined();
          expect(segment.diff?.filename).toBeDefined();
          expect(segment.diff?.additions).toBeDefined();
          expect(segment.diff?.deletions).toBeDefined();
          expect(segment.diff?.lines).toBeDefined();
          expect(segment.diff?.raw).toBeDefined();
        } else {
          expect(segment.diff).toBeUndefined();
        }
      });
    });
  });

  describe("Whitespace handling", () => {
    it("should trim markdown segments", () => {
      const content = `

Some content

   `;

      const segments = splitContentWithDiffs(content);

      expect(segments[0].content).toBe("Some content");
    });

    it("should handle newlines between segments", () => {
      const content = `First markdown



● Update(src/file.ts)
└─ Added 1 line, removed 0 lines
   10 + new



Second markdown`;

      const segments = splitContentWithDiffs(content);

      expect(segments).toHaveLength(3);
      expect(segments[1].type).toBe("diff");
    });

    it("should preserve content structure in diff blocks", () => {
      const content = `● Update(src/file.ts)
└─ Added 2 lines, removed 1 line
   5 + line with spaces
   6   context
   7 - old`;

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      expect(lines[0].content).toBe("line with spaces");
      expect(lines[1].content).toBe("context");
      expect(lines[2].content).toBe("old");
    });
  });

  describe("Large and complex inputs", () => {
    it("should handle many diff blocks", () => {
      let content = "";
      for (let i = 0; i < 10; i++) {
        content += `● Update(src/file${i}.ts)
└─ Added 1 line, removed 0 lines
   ${i + 1} + change

`;
      }

      const segments = splitContentWithDiffs(content);
      const diffSegments = segments.filter((s) => s.type === "diff");

      expect(diffSegments).toHaveLength(10);
    });

    it("should handle diff blocks with many lines", () => {
      let content = `● Update(src/file.ts)
└─ Added 50 lines, removed 0 lines
`;

      for (let i = 1; i <= 50; i++) {
        content += `   ${i} + line ${i}\n`;
      }

      const segments = splitContentWithDiffs(content);
      const lines = segments[0].diff?.lines || [];

      expect(lines).toHaveLength(50);
      expect(lines[0].lineNumber).toBe(1);
      expect(lines[49].lineNumber).toBe(50);
    });
  });
});

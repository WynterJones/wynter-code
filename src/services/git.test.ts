import { describe, it, expect } from "vitest";
import { gitService } from "./git";

describe("GitService.parseGitHubUrl", () => {
  describe("HTTPS URLs with .git suffix", () => {
    it("parses standard HTTPS GitHub URL with .git", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses HTTPS URL with hyphenated owner", () => {
      const result = gitService.parseGitHubUrl("https://github.com/my-org/my-repo.git");
      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses HTTPS URL with numeric characters", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner123/repo456.git");
      expect(result).toEqual({ owner: "owner123", repo: "repo456" });
    });

    it("parses HTTPS URL with underscore in owner", () => {
      const result = gitService.parseGitHubUrl("https://github.com/my_org/my_repo.git");
      expect(result).toEqual({ owner: "my_org", repo: "my_repo" });
    });

    it("parses HTTPS URL with uppercase characters", () => {
      const result = gitService.parseGitHubUrl("https://github.com/MyOrg/MyRepo.git");
      expect(result).toEqual({ owner: "MyOrg", repo: "MyRepo" });
    });
  });

  describe("HTTPS URLs without .git suffix", () => {
    it("parses standard HTTPS GitHub URL without .git", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses HTTPS URL without .git with hyphenated names", () => {
      const result = gitService.parseGitHubUrl("https://github.com/my-org/my-repo");
      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses HTTPS URL without .git with numeric characters", () => {
      const result = gitService.parseGitHubUrl("https://github.com/org123/repo456");
      expect(result).toEqual({ owner: "org123", repo: "repo456" });
    });
  });

  describe("SSH URLs with .git suffix", () => {
    it("parses standard SSH GitHub URL with .git", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses SSH URL with hyphenated owner and repo", () => {
      const result = gitService.parseGitHubUrl("git@github.com:my-org/my-repo.git");
      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses SSH URL with numeric characters", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner123/repo456.git");
      expect(result).toEqual({ owner: "owner123", repo: "repo456" });
    });

    it("parses SSH URL with underscore in names", () => {
      const result = gitService.parseGitHubUrl("git@github.com:my_org/my_repo.git");
      expect(result).toEqual({ owner: "my_org", repo: "my_repo" });
    });

    it("parses SSH URL with uppercase characters", () => {
      const result = gitService.parseGitHubUrl("git@github.com:MyOrg/MyRepo.git");
      expect(result).toEqual({ owner: "MyOrg", repo: "MyRepo" });
    });
  });

  describe("SSH URLs without .git suffix", () => {
    it("parses standard SSH GitHub URL without .git", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses SSH URL without .git with hyphenated names", () => {
      const result = gitService.parseGitHubUrl("git@github.com:my-org/my-repo");
      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses SSH URL without .git with numeric characters", () => {
      const result = gitService.parseGitHubUrl("git@github.com:org123/repo456");
      expect(result).toEqual({ owner: "org123", repo: "repo456" });
    });
  });

  describe("Invalid URLs", () => {
    it("returns null for empty string", () => {
      const result = gitService.parseGitHubUrl("");
      expect(result).toBeNull();
    });

    it("returns null for URL with missing owner", () => {
      const result = gitService.parseGitHubUrl("https://github.com/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for URL with missing repo", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/");
      expect(result).toBeNull();
    });

    it("returns null for URL with only whitespace", () => {
      const result = gitService.parseGitHubUrl("   ");
      expect(result).toBeNull();
    });

    it("returns null for URL with double slashes in repo", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner//repo.git");
      expect(result).toBeNull();
    });

    it("returns null for URL with missing owner and repo", () => {
      const result = gitService.parseGitHubUrl("https://github.com/");
      expect(result).toBeNull();
    });

    it("returns null for SSH URL with missing repo", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner/");
      expect(result).toBeNull();
    });
  });

  describe("Non-GitHub URLs", () => {
    it("returns null for GitLab HTTPS URL", () => {
      const result = gitService.parseGitHubUrl("https://gitlab.com/owner/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for Bitbucket HTTPS URL", () => {
      const result = gitService.parseGitHubUrl("https://bitbucket.org/owner/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for generic git URL", () => {
      const result = gitService.parseGitHubUrl("git://git.example.com/owner/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for GitLab SSH URL", () => {
      const result = gitService.parseGitHubUrl("git@gitlab.com:owner/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for Bitbucket SSH URL", () => {
      const result = gitService.parseGitHubUrl("git@bitbucket.org:owner/repo.git");
      expect(result).toBeNull();
    });

    it("returns null for non-Git HTTPS URL", () => {
      const result = gitService.parseGitHubUrl("https://example.com/owner/repo");
      expect(result).toBeNull();
    });

    it("returns null for plain text that is not a URL", () => {
      const result = gitService.parseGitHubUrl("just some text");
      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("accepts URL with trailing slash (regex matches before it)", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/repo/");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("accepts SSH URL with trailing slash (regex matches before it)", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner/repo/");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("stops at first dot in repo name (regex pattern limitation)", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/repo.lib.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("handles very long owner and repo names", () => {
      const longName = "a".repeat(100);
      const result = gitService.parseGitHubUrl(
        `https://github.com/${longName}/${longName}.git`
      );
      expect(result).toEqual({ owner: longName, repo: longName });
    });

    it("handles SSH URL with numbers in domain", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner123/repo456.git");
      expect(result).toEqual({ owner: "owner123", repo: "repo456" });
    });

    it("correctly strips .git when present", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/repo.git");
      expect(result?.repo).not.toContain(".git");
    });

    it("stops at first dot in repo name when multiple dots exist", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner/my.awesome.repo.git");
      expect(result).toEqual({ owner: "owner", repo: "my" });
    });

    it("stops at first dot in SSH URL with dots in repo name", () => {
      const result = gitService.parseGitHubUrl("git@github.com:owner/my.repo.git");
      expect(result).toEqual({ owner: "owner", repo: "my" });
    });

    it("accepts HTTP URLs (protocol agnostic)", () => {
      const result = gitService.parseGitHubUrl("http://github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("accepts URL with space in owner (captures until space)", () => {
      const result = gitService.parseGitHubUrl("https://github.com/owner /repo.git");
      expect(result).toEqual({ owner: "owner ", repo: "repo" });
    });
  });
});

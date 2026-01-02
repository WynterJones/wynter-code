import { invoke } from "@tauri-apps/api/core";
import { getErrorMessage } from "@/lib/errorHandler";

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
}

export interface GitFile {
  path: string;
  status: "M" | "A" | "D" | "?" | "U";
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

async function runGit(args: string[], cwd: string): Promise<CommandOutput> {
  return invoke<CommandOutput>("run_git", { args, cwd });
}

interface GitOperationResult {
  success: boolean;
  error?: string;
  hash?: string;
}

class GitService {
  async getStatus(cwd: string): Promise<GitStatus> {
    try {
      const output = await runGit(["status", "--porcelain", "-b"], cwd);

      const lines = output.stdout.split("\n").filter(Boolean);
      const branchLine = lines[0] || "";
      const fileLines = lines.slice(1);

      // Parse branch info including ahead/behind
      // Format: ## branch...origin/branch [ahead N, behind M]
      // or: ## branch...origin/branch [ahead N]
      // or: ## branch...origin/branch [behind M]
      const branchMatch = branchLine.match(/## ([^\s.]+)/);
      const branch = branchMatch?.[1] || "main";

      // Parse ahead/behind counts
      let ahead = 0;
      let behind = 0;
      const aheadMatch = branchLine.match(/\[ahead (\d+)/);
      const behindMatch = branchLine.match(/behind (\d+)\]/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
      if (behindMatch) behind = parseInt(behindMatch[1], 10);

      // Parse file status
      const staged: GitFile[] = [];
      const modified: GitFile[] = [];
      const untracked: GitFile[] = [];

      for (const line of fileLines) {
        const status = line.substring(0, 2);
        const path = line.substring(3);

        if (status === "??") {
          untracked.push({ path, status: "?" });
        } else if (status[0] !== " ") {
          staged.push({ path, status: status[0] as GitFile["status"] });
        } else if (status[1] !== " ") {
          modified.push({ path, status: status[1] as GitFile["status"] });
        }
      }

      return {
        branch,
        ahead,
        behind,
        staged,
        modified,
        untracked,
      };
    } catch (err) {
      return {
        branch: "main",
        ahead: 0,
        behind: 0,
        staged: [],
        modified: [],
        untracked: [],
      };
    }
  }

  // === STAGING METHODS ===

  async stageFile(cwd: string, filePath: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["add", filePath], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async unstageFile(cwd: string, filePath: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["reset", "HEAD", filePath], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async stageAll(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["add", "-A"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async unstageAll(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["reset", "HEAD"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  // === COMMIT METHODS ===

  async commit(cwd: string, message: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["commit", "-m", message], cwd);
      if (output.code === 0) {
        // Extract commit hash from output
        const hashMatch = output.stdout.match(/\[[\w\s]+\s([a-f0-9]+)\]/);
        return { success: true, hash: hashMatch?.[1] };
      }
      return { success: false, error: output.stderr || output.stdout };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async getStagedDiff(cwd: string): Promise<string> {
    try {
      const output = await runGit(["diff", "--cached", "--stat"], cwd);
      return output.stdout;
    } catch (err) {
      return "";
    }
  }

  async getStagedDiffFull(cwd: string): Promise<string> {
    try {
      const output = await runGit(["diff", "--cached"], cwd);
      return output.stdout;
    } catch (err) {
      return "";
    }
  }

  async getFileDiff(cwd: string, filePath: string, isStaged: boolean): Promise<string> {
    try {
      const args = isStaged ? ["diff", "--cached", filePath] : ["diff", filePath];
      const output = await runGit(args, cwd);
      return output.stdout;
    } catch (err) {
      return "";
    }
  }

  async getUntrackedFileContent(cwd: string, filePath: string): Promise<string> {
    try {
      const output = await runGit(["show", `:${filePath}`], cwd);
      return output.stdout;
    } catch (err) {
      return "";
    }
  }

  // === REMOTE SYNC METHODS ===

  async fetch(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["fetch"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async getRemoteStatus(cwd: string): Promise<{ ahead: number; behind: number; hasRemote: boolean; error?: string }> {
    try {
      // Check if origin remote exists (separate from upstream tracking)
      const remoteOutput = await runGit(["remote", "get-url", "origin"], cwd);
      console.log("[GitService] remote get-url result:", remoteOutput);
      const hasRemote = remoteOutput.code === 0;

      if (!hasRemote) {
        console.log("[GitService] No remote detected, code:", remoteOutput.code);
        return { ahead: 0, behind: 0, hasRemote: false };
      }

      // First fetch to get latest remote info
      await this.fetch(cwd);

      // Check if upstream tracking is set for ahead/behind counts
      const upstreamOutput = await runGit(["rev-parse", "--abbrev-ref", "@{upstream}"], cwd);
      if (upstreamOutput.code !== 0) {
        // Remote exists but no upstream tracking - still "Push" not "Publish"
        return { ahead: 0, behind: 0, hasRemote: true };
      }

      // Get ahead count
      const aheadOutput = await runGit(["rev-list", "--count", "@{upstream}..HEAD"], cwd);
      const ahead = parseInt(aheadOutput.stdout.trim(), 10) || 0;

      // Get behind count
      const behindOutput = await runGit(["rev-list", "--count", "HEAD..@{upstream}"], cwd);
      const behind = parseInt(behindOutput.stdout.trim(), 10) || 0;

      return { ahead, behind, hasRemote: true };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error("[GitService] getRemoteStatus error:", errorMessage);

      // Check if this is a rate limit error and surface it to the UI
      if (errorMessage.includes("Rate limit exceeded")) {
        // Extract retry time from error message like "Try again in 21 seconds"
        const retryMatch = errorMessage.match(/Try again in (\d+) seconds/);
        const retrySeconds = retryMatch ? retryMatch[1] : "a few";
        return {
          ahead: 0,
          behind: 0,
          hasRemote: false,
          error: `Rate limited - try again in ${retrySeconds}s`
        };
      }

      return { ahead: 0, behind: 0, hasRemote: false };
    }
  }

  async push(cwd: string, options?: { setUpstream?: boolean }): Promise<GitOperationResult> {
    try {
      const args = ["push"];
      if (options?.setUpstream) {
        args.push("-u", "origin", "HEAD");
      }
      const output = await runGit(args, cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async pull(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["pull"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  // === BRANCH METHODS ===

  async checkoutBranch(cwd: string, branchName: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["checkout", branchName], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async createBranch(cwd: string, branchName: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["checkout", "-b", branchName], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async deleteBranch(cwd: string, branchName: string, force = false): Promise<GitOperationResult> {
    try {
      const flag = force ? "-D" : "-d";
      const output = await runGit(["branch", flag, branchName], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async getCommits(cwd: string, limit: number = 10): Promise<GitCommit[]> {
    try {
      const output = await runGit(
        ["log", `--max-count=${limit}`, "--pretty=format:%H|%s|%an|%ar"],
        cwd
      );

      return output.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, message, author, date] = line.split("|");
          return { hash, message, author, date };
        });
    } catch (err) {
      return [];
    }
  }

  async getBranches(cwd: string): Promise<GitBranch[]> {
    try {
      const output = await runGit(["branch", "-a"], cwd);

      return output.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const isCurrent = line.startsWith("*");
          const name = line.replace(/^\*?\s+/, "").trim();
          const isRemote = name.startsWith("remotes/");

          return {
            name: isRemote ? name.replace("remotes/origin/", "") : name,
            isCurrent,
            isRemote,
          };
        })
        .filter((b) => !b.name.includes("HEAD"));
    } catch (err) {
      return [];
    }
  }

  async isGitRepo(cwd: string): Promise<boolean> {
    try {
      const output = await runGit(["rev-parse", "--git-dir"], cwd);
      return output.code === 0;
    } catch (err) {
      return false;
    }
  }

  async getCurrentBranch(cwd: string): Promise<string | null> {
    try {
      const output = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
      if (output.code === 0) {
        return output.stdout.trim();
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  async branchExists(cwd: string, branchName: string): Promise<boolean> {
    try {
      const output = await runGit(["rev-parse", "--verify", branchName], cwd);
      return output.code === 0;
    } catch (err) {
      return false;
    }
  }

  async stashChanges(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["stash", "push", "-m", "autobuild-stash"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async stashPop(cwd: string): Promise<GitOperationResult> {
    try {
      const output = await runGit(["stash", "pop"], cwd);
      return { success: output.code === 0, error: output.stderr };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  async getDiffWithBranch(cwd: string, baseBranch: string): Promise<string> {
    try {
      const output = await runGit(["diff", `${baseBranch}...HEAD`, "--stat"], cwd);
      return output.stdout;
    } catch (err) {
      return "";
    }
  }

  async getRemoteUrl(cwd: string, remoteName: string = "origin"): Promise<string | null> {
    try {
      const output = await runGit(["remote", "get-url", remoteName], cwd);
      if (output.code === 0) {
        return output.stdout.trim();
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Parse a GitHub URL to extract owner and repo name
   * Supports: https://github.com/owner/repo.git, git@github.com:owner/repo.git
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };
    }
    return null;
  }
}

export const gitService = new GitService();

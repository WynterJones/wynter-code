import { invoke } from "@tauri-apps/api/core";
import type {
  GhAuthStatus,
  GhRepo,
  GhOrg,
  GhSearchRepo,
  CreateRepoResult,
  GhRepoDetails,
  GhRepoContent,
  EditRepoResult,
  DeleteRepoResult,
} from "@/types/github";

class GitHubService {
  async checkAuth(): Promise<GhAuthStatus> {
    return invoke<GhAuthStatus>("gh_check_auth");
  }

  async listMyRepos(limit?: number): Promise<GhRepo[]> {
    return invoke<GhRepo[]>("gh_list_my_repos", { limit });
  }

  async listStarredRepos(limit?: number): Promise<GhRepo[]> {
    return invoke<GhRepo[]>("gh_list_starred_repos", { limit });
  }

  async listOrgs(): Promise<GhOrg[]> {
    return invoke<GhOrg[]>("gh_list_orgs");
  }

  async listOrgRepos(org: string, limit?: number): Promise<GhRepo[]> {
    return invoke<GhRepo[]>("gh_list_org_repos", { org, limit });
  }

  async searchRepos(query: string, limit?: number): Promise<GhSearchRepo[]> {
    return invoke<GhSearchRepo[]>("gh_search_repos", { query, limit });
  }

  async createRepo(options: {
    name: string;
    description?: string;
    isPrivate: boolean;
    sourcePath?: string;
    push?: boolean;
  }): Promise<CreateRepoResult> {
    return invoke<CreateRepoResult>("gh_create_repo", options);
  }

  async cloneRepo(repoUrl: string, targetPath: string): Promise<void> {
    return invoke("gh_clone_repo", { repoUrl, targetPath });
  }

  async openAuth(): Promise<void> {
    return invoke("gh_open_auth");
  }

  async viewRepo(owner: string, repo: string): Promise<GhRepoDetails> {
    return invoke<GhRepoDetails>("gh_view_repo", { owner, repo });
  }

  async getRepoContents(
    owner: string,
    repo: string,
    path?: string
  ): Promise<GhRepoContent[]> {
    return invoke<GhRepoContent[]>("gh_get_repo_contents", { owner, repo, path });
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    return invoke<string>("gh_get_file_content", { owner, repo, path });
  }

  async editRepo(
    owner: string,
    repo: string,
    options: {
      description?: string;
      visibility?: "public" | "private";
      homepage?: string;
      defaultBranch?: string;
    }
  ): Promise<EditRepoResult> {
    return invoke<EditRepoResult>("gh_edit_repo", {
      owner,
      repo,
      description: options.description,
      visibility: options.visibility,
      homepage: options.homepage,
      defaultBranch: options.defaultBranch,
    });
  }

  async deleteRepo(owner: string, repo: string): Promise<DeleteRepoResult> {
    return invoke<DeleteRepoResult>("gh_delete_repo", { owner, repo });
  }
}

export const githubService = new GitHubService();

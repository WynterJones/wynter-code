export interface GhAuthStatus {
  isAuthenticated: boolean;
  username?: string;
  error?: string;
}

export interface GhLanguage {
  name: string;
}

export interface GhOwner {
  login: string;
}

export interface GhRepo {
  name: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  updatedAt: string;
  stargazerCount?: number;
  primaryLanguage?: GhLanguage;
  owner?: GhOwner;
  fullName?: string;
}

export interface GhOrg {
  login: string;
  name?: string;
}

export interface GhSearchRepo {
  fullName: string;
  description?: string;
  url: string;
  stargazerCount: number;
  primaryLanguage?: GhLanguage;
}

export interface CreateRepoResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

export interface GhRepoDetails {
  name: string;
  fullName: string;
  description?: string;
  url: string;
  homepageUrl?: string;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage?: GhLanguage;
  owner: GhOwner;
  parent?: {
    fullName: string;
    url: string;
  };
}

export interface GhRepoContent {
  name: string;
  path: string;
  contentType: string;
  size?: number;
  downloadUrl?: string;
}

export interface EditRepoResult {
  success: boolean;
  error?: string;
}

export interface DeleteRepoResult {
  success: boolean;
  error?: string;
}

export type GitHubTab = "my-repos" | "starred" | "orgs" | "search";

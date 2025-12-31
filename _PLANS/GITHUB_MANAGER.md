# GitHub Manager Tool

## Overview
A standalone tool that uses the `gh` CLI to browse GitHub repositories and connect local projects to GitHub.

## Features
- **Browse**: My repos, Starred repos, Organization repos, Search public repos
- **Connect**: Create new GitHub repo from local project and push

---

## File Structure

```
src/
  components/tools/github-manager/
    GitHubManagerPopup.tsx    # Main popup with tabs
    RepoList.tsx              # Repository list display
    RepoListItem.tsx          # Individual repo item
    RepoDetailPanel.tsx       # Side panel for repo details
    ConnectWorkflow.tsx       # Modal to create & connect repo
    AuthStatus.tsx            # Auth indicator component
    SearchPanel.tsx           # Search interface
    index.ts
  services/
    github.ts                 # Frontend service layer
  stores/
    githubManagerStore.ts     # Zustand store
  types/
    github.ts                 # TypeScript interfaces

src-tauri/src/
  github.rs                   # Rust module for gh CLI
  commands/mod.rs             # Register commands
  main.rs                     # Register module
```

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Create `/src-tauri/src/github.rs` with:
   - `GhAuthStatus`, `GhRepo`, `GhOrg` structs
   - `gh_check_auth` command
2. Register module in `main.rs`
3. Create `/src/types/github.ts` with TypeScript interfaces
4. Create `/src/services/github.ts` with `checkAuth()` method

### Phase 2: Store & Basic UI
1. Create `/src/stores/githubManagerStore.ts`
2. Create `GitHubManagerPopup.tsx` shell with header and tabs
3. Create `AuthStatus.tsx` component
4. Register in `ToolsDropdown.tsx` (actionKey: `openGitHubManager`, category: `code`)
5. Add state/handler in `ProjectTabBar.tsx`

### Phase 3: My Repos Tab
1. Implement `gh_list_my_repos` backend command
2. Add `listMyRepos()` to service
3. Create `RepoList.tsx` and `RepoListItem.tsx`
4. Display repos with name, description, visibility, updated date

### Phase 4: Other Browse Tabs
1. Implement `gh_list_starred_repos` backend
2. Implement `gh_list_orgs` + `gh_list_org_repos` backend
3. Add org selector dropdown for Organizations tab
4. Wire up tab switching

### Phase 5: Search Tab
1. Implement `gh_search_repos` backend
2. Create `SearchPanel.tsx` with debounced search input
3. Display search results with star count

### Phase 6: Connect Workflow
1. Implement `gh_create_repo` backend with:
   - `--source` for local path
   - `--remote origin`
   - `--push` option
2. Create `ConnectWorkflow.tsx` modal with:
   - Repo name input (auto-populate from folder)
   - Description input
   - Public/Private toggle
   - Push immediately checkbox
3. Wire to current project path from `ProjectTabBar`

### Phase 7: Detail Panel & Polish
1. Create `RepoDetailPanel.tsx` for selected repo
2. Add clone functionality
3. Loading spinners and error states
4. Empty states with helpful messages

---

## Key Backend Commands

```rust
// Auth
gh_check_auth() -> GhAuthStatus

// Browse
gh_list_my_repos(limit) -> Vec<GhRepo>
gh_list_starred_repos(limit) -> Vec<GhRepo>
gh_list_orgs() -> Vec<GhOrg>
gh_list_org_repos(org, limit) -> Vec<GhRepo>
gh_search_repos(query, limit) -> Vec<GhRepo>

// Create & Connect
gh_create_repo(name, description, is_private, source_path, push) -> GhRepo
```

## Key gh CLI Commands Used

```bash
gh auth status
gh repo list --json name,description,url,isPrivate,updatedAt --limit 100
gh repo list --starred --json ...
gh repo list <org> --json ...
gh search repos <query> --json fullName,description,url,stargazersCount
gh repo create <name> --public|--private --source=. --remote=origin --push
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| gh not installed | Show error with install link to cli.github.com |
| Not authenticated | Show login button, guide through `gh auth login` |
| No repos found | Empty state with message |
| Repo name exists | Show error, suggest rename |
| Project has remote | Warn before proceeding |
| Network error | Show retry button, use cached data |

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/src/github.rs` | New file - all gh CLI commands |
| `src-tauri/src/main.rs` | Register github module |
| `src/services/github.ts` | New file - service layer |
| `src/stores/githubManagerStore.ts` | New file - Zustand store |
| `src/components/tools/github-manager/*` | New directory - all UI |
| `src/components/tools/ToolsDropdown.tsx` | Add tool definition |
| `src/components/layout/ProjectTabBar.tsx` | Add popup state & handler |
| `src/components/tools/index.ts` | Export new component |

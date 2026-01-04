use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::path_utils::get_enhanced_path;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhAuthStatus {
    pub is_authenticated: bool,
    pub username: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhRepo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub url: String,
    #[serde(default)]
    pub is_private: bool,
    #[serde(default)]
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stargazer_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_language: Option<GhLanguage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<GhOwner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhLanguage {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhOwner {
    pub login: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhOrg {
    pub login: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhSearchRepo {
    pub full_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub url: String,
    #[serde(default)]
    pub stargazer_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_language: Option<GhLanguage>,
}

fn run_gh_command(args: &[&str], cwd: Option<&str>) -> Result<String, String> {
    let mut cmd = Command::new("gh");
    cmd.args(args).env("PATH", get_enhanced_path());

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run gh command: {}. Is gh CLI installed?", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(stderr)
    }
}

#[tauri::command]
pub async fn gh_check_auth() -> Result<GhAuthStatus, String> {
    let output = Command::new("gh")
        .args(["auth", "status"])
        .env("PATH", get_enhanced_path())
        .output();

    match output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();

            if out.status.success() {
                // Parse username from output - gh auth status outputs to stderr
                // Format: "Logged in to github.com account username (keyring)"
                let username = stderr
                    .lines()
                    .find(|line| line.contains("Logged in to"))
                    .and_then(|line| {
                        // Extract "account USERNAME" from the line
                        if let Some(idx) = line.find("account ") {
                            let after_account = &line[idx + 8..];
                            after_account.split_whitespace().next().map(String::from)
                        } else {
                            None
                        }
                    });

                Ok(GhAuthStatus {
                    is_authenticated: true,
                    username,
                    error: None,
                })
            } else {
                Ok(GhAuthStatus {
                    is_authenticated: false,
                    username: None,
                    error: Some(stderr),
                })
            }
        }
        Err(e) => Ok(GhAuthStatus {
            is_authenticated: false,
            username: None,
            error: Some(format!("gh CLI not found: {}", e)),
        }),
    }
}

#[tauri::command]
pub async fn gh_list_my_repos(limit: Option<i32>) -> Result<Vec<GhRepo>, String> {
    let limit_str = limit.unwrap_or(100).to_string();
    let output = run_gh_command(
        &[
            "repo",
            "list",
            "--json",
            "name,description,url,isPrivate,updatedAt,stargazerCount,primaryLanguage",
            "--limit",
            &limit_str,
        ],
        None,
    )?;

    if output.trim().is_empty() {
        return Ok(Vec::new());
    }

    let repos: Vec<GhRepo> =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse repos: {}", e))?;

    Ok(repos)
}

#[tauri::command]
pub async fn gh_list_starred_repos(limit: Option<i32>) -> Result<Vec<GhRepo>, String> {
    let limit_val = limit.unwrap_or(100);

    // Use GitHub API to get starred repos (gh repo list doesn't support --starred)
    let output = run_gh_command(
        &[
            "api",
            "user/starred",
            "--paginate",
            "-q",
            &format!(".[:{}] | map({{name: .name, description: .description, url: .html_url, isPrivate: .private, updatedAt: .updated_at, stargazerCount: .stargazers_count, primaryLanguage: (if .language then {{name: .language}} else null end), owner: {{login: .owner.login}}, fullName: .full_name}})", limit_val),
        ],
        None,
    )?;

    if output.trim().is_empty() || output.trim() == "[]" {
        return Ok(Vec::new());
    }

    let repos: Vec<GhRepo> =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse starred repos: {}", e))?;

    Ok(repos)
}

#[tauri::command]
pub async fn gh_list_orgs() -> Result<Vec<GhOrg>, String> {
    // gh org list outputs plain text (one org per line), not JSON
    let output = run_gh_command(&["org", "list", "--limit", "100"], None)?;

    if output.trim().is_empty() {
        return Ok(Vec::new());
    }

    let orgs: Vec<GhOrg> = output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| GhOrg {
            login: line.trim().to_string(),
            name: None,
        })
        .collect();

    Ok(orgs)
}

#[tauri::command]
pub async fn gh_list_org_repos(org: String, limit: Option<i32>) -> Result<Vec<GhRepo>, String> {
    let limit_str = limit.unwrap_or(100).to_string();
    let output = run_gh_command(
        &[
            "repo",
            "list",
            &org,
            "--json",
            "name,description,url,isPrivate,updatedAt,stargazerCount,primaryLanguage",
            "--limit",
            &limit_str,
        ],
        None,
    )?;

    if output.trim().is_empty() {
        return Ok(Vec::new());
    }

    let repos: Vec<GhRepo> =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse org repos: {}", e))?;

    Ok(repos)
}

#[tauri::command]
pub async fn gh_search_repos(query: String, limit: Option<i32>) -> Result<Vec<GhSearchRepo>, String> {
    let limit_str = limit.unwrap_or(30).to_string();
    let output = run_gh_command(
        &[
            "search",
            "repos",
            &query,
            "--json",
            "fullName,description,url,stargazerCount,primaryLanguage",
            "--limit",
            &limit_str,
        ],
        None,
    )?;

    if output.trim().is_empty() {
        return Ok(Vec::new());
    }

    let repos: Vec<GhSearchRepo> =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse search results: {}", e))?;

    Ok(repos)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepoResult {
    pub success: bool,
    pub repo_url: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn gh_create_repo(
    name: String,
    description: Option<String>,
    is_private: bool,
    source_path: Option<String>,
    push: bool,
) -> Result<CreateRepoResult, String> {
    // If source_path is provided, ensure it's a git repository with at least one commit
    if let Some(ref path) = source_path {
        let git_dir = std::path::Path::new(path).join(".git");
        if !git_dir.exists() {
            // Initialize git repository first
            let init_result = Command::new("git")
                .args(["init"])
                .current_dir(path)
                .env("PATH", get_enhanced_path())
                .output();

            match init_result {
                Ok(output) if !output.status.success() => {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    return Ok(CreateRepoResult {
                        success: false,
                        repo_url: None,
                        error: Some(format!("Failed to initialize git repository: {}", stderr)),
                    });
                }
                Err(e) => {
                    return Ok(CreateRepoResult {
                        success: false,
                        repo_url: None,
                        error: Some(format!("Failed to run git init: {}", e)),
                    });
                }
                _ => {}
            }
        }

        // If push is enabled, ensure there's at least one commit
        if push {
            // Check if there are any commits
            let has_commits = Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(path)
                .env("PATH", get_enhanced_path())
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);

            if !has_commits {
                // Stage all files
                let add_result = Command::new("git")
                    .args(["add", "."])
                    .current_dir(path)
                    .env("PATH", get_enhanced_path())
                    .output();

                if let Err(e) = add_result {
                    return Ok(CreateRepoResult {
                        success: false,
                        repo_url: None,
                        error: Some(format!("Failed to stage files: {}", e)),
                    });
                }

                // Create initial commit
                let commit_result = Command::new("git")
                    .args(["commit", "-m", "Initial commit"])
                    .current_dir(path)
                    .env("PATH", get_enhanced_path())
                    .output();

                match commit_result {
                    Ok(output) if !output.status.success() => {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        // Ignore "nothing to commit" errors
                        if !stderr.contains("nothing to commit") {
                            return Ok(CreateRepoResult {
                                success: false,
                                repo_url: None,
                                error: Some(format!("Failed to create initial commit: {}", stderr)),
                            });
                        }
                    }
                    Err(e) => {
                        return Ok(CreateRepoResult {
                            success: false,
                            repo_url: None,
                            error: Some(format!("Failed to run git commit: {}", e)),
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    let visibility = if is_private { "--private" } else { "--public" };

    let mut args: Vec<&str> = vec!["repo", "create", &name, visibility];

    // Temporary owned strings for description
    let desc_flag;
    if let Some(ref d) = description {
        if !d.trim().is_empty() {
            desc_flag = format!("--description={}", d);
            args.push(&desc_flag);
        }
    }

    // If source_path is provided, connect local directory
    let source_flag;
    if let Some(ref path) = source_path {
        source_flag = format!("--source={}", path);
        args.push(&source_flag);
        args.push("--remote=origin");

        if push {
            args.push("--push");
        }
    }

    let cwd = source_path.as_deref();
    match run_gh_command(&args, cwd) {
        Ok(output) => {
            // gh repo create outputs the URL to stdout
            let repo_url = output.trim().to_string();
            Ok(CreateRepoResult {
                success: true,
                repo_url: if repo_url.is_empty() {
                    None
                } else {
                    Some(repo_url)
                },
                error: None,
            })
        }
        Err(e) => Ok(CreateRepoResult {
            success: false,
            repo_url: None,
            error: Some(e),
        }),
    }
}

#[tauri::command]
pub async fn gh_clone_repo(repo_url: String, target_path: String) -> Result<(), String> {
    run_gh_command(&["repo", "clone", &repo_url, &target_path], None)?;
    Ok(())
}

#[tauri::command]
pub async fn gh_open_auth() -> Result<(), String> {
    // Open browser to authenticate with GitHub
    run_gh_command(&["auth", "login", "--web"], None)?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhRepoDetails {
    pub name: String,
    pub full_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub url: String,
    pub homepage_url: Option<String>,
    #[serde(default)]
    pub is_private: bool,
    #[serde(default)]
    pub is_fork: bool,
    #[serde(default)]
    pub is_archived: bool,
    pub default_branch: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub stargazer_count: i32,
    #[serde(default)]
    pub fork_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_language: Option<GhLanguage>,
    pub owner: GhOwner,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<Box<GhRepoParent>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhRepoParent {
    pub full_name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GhRepoContent {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
}

#[tauri::command]
pub async fn gh_view_repo(owner: String, repo: String) -> Result<GhRepoDetails, String> {
    let repo_path = format!("{}/{}", owner, repo);
    let output = match run_gh_command(
        &[
            "repo",
            "view",
            &repo_path,
            "--json",
            "name,nameWithOwner,description,url,homepageUrl,isPrivate,isFork,isArchived,defaultBranchRef,createdAt,updatedAt,stargazerCount,forkCount,primaryLanguage,owner,parent",
        ],
        None,
    ) {
        Ok(out) => out,
        Err(e) => {
            // Handle empty repository errors more gracefully
            if e.contains("404") || e.contains("This repository is empty") {
                return Err(format!("Repository {}/{} is empty or not found", owner, repo));
            }
            return Err(e);
        }
    };

    // Parse the raw JSON and transform field names
    let raw: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse repo details: {}", e))?;

    // Transform the JSON to match our struct
    let details = GhRepoDetails {
        name: raw["name"].as_str().unwrap_or_default().to_string(),
        full_name: raw["nameWithOwner"].as_str().unwrap_or_default().to_string(),
        description: raw["description"].as_str().map(String::from),
        url: raw["url"].as_str().unwrap_or_default().to_string(),
        homepage_url: raw["homepageUrl"].as_str().map(String::from),
        is_private: raw["isPrivate"].as_bool().unwrap_or(false),
        is_fork: raw["isFork"].as_bool().unwrap_or(false),
        is_archived: raw["isArchived"].as_bool().unwrap_or(false),
        default_branch: raw["defaultBranchRef"]["name"]
            .as_str()
            .unwrap_or("main")
            .to_string(),
        created_at: raw["createdAt"].as_str().unwrap_or_default().to_string(),
        updated_at: raw["updatedAt"].as_str().unwrap_or_default().to_string(),
        stargazer_count: raw["stargazerCount"].as_i64().unwrap_or(0) as i32,
        fork_count: raw["forkCount"].as_i64().unwrap_or(0) as i32,
        primary_language: raw["primaryLanguage"]["name"]
            .as_str()
            .map(|n| GhLanguage { name: n.to_string() }),
        owner: GhOwner {
            login: raw["owner"]["login"].as_str().unwrap_or_default().to_string(),
        },
        parent: raw["parent"]["nameWithOwner"].as_str().map(|full_name| {
            Box::new(GhRepoParent {
                full_name: full_name.to_string(),
                url: raw["parent"]["url"].as_str().unwrap_or_default().to_string(),
            })
        }),
    };

    Ok(details)
}

#[tauri::command]
pub async fn gh_get_repo_contents(
    owner: String,
    repo: String,
    path: Option<String>,
) -> Result<Vec<GhRepoContent>, String> {
    let api_path = match &path {
        Some(p) if !p.is_empty() => format!("repos/{}/{}/contents/{}", owner, repo, p),
        _ => format!("repos/{}/{}/contents", owner, repo),
    };

    let output = match run_gh_command(&["api", &api_path], None) {
        Ok(out) => out,
        Err(e) => {
            // Empty repos return 404 - return empty array instead of error
            if e.contains("404") || e.contains("This repository is empty") {
                return Ok(Vec::new());
            }
            return Err(e);
        }
    };

    // The API returns either an array (directory) or a single object (file)
    let raw: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse contents: {}", e))?;

    let contents: Vec<GhRepoContent> = if raw.is_array() {
        raw.as_array()
            .unwrap()
            .iter()
            .map(|item| GhRepoContent {
                name: item["name"].as_str().unwrap_or_default().to_string(),
                path: item["path"].as_str().unwrap_or_default().to_string(),
                content_type: item["type"].as_str().unwrap_or("file").to_string(),
                size: item["size"].as_i64(),
                download_url: item["download_url"].as_str().map(String::from),
            })
            .collect()
    } else {
        // Single file - return as array with one item
        vec![GhRepoContent {
            name: raw["name"].as_str().unwrap_or_default().to_string(),
            path: raw["path"].as_str().unwrap_or_default().to_string(),
            content_type: raw["type"].as_str().unwrap_or("file").to_string(),
            size: raw["size"].as_i64(),
            download_url: raw["download_url"].as_str().map(String::from),
        }]
    };

    Ok(contents)
}

#[tauri::command]
pub async fn gh_get_file_content(
    owner: String,
    repo: String,
    path: String,
) -> Result<String, String> {
    // Use the raw content API endpoint
    let api_path = format!("repos/{}/{}/contents/{}", owner, repo, path);
    let output = run_gh_command(&["api", &api_path, "-q", ".content"], None)?;

    // Content is base64 encoded
    let decoded = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        output.trim().replace('\n', ""),
    )
    .map_err(|e| format!("Failed to decode file content: {}", e))?;

    String::from_utf8(decoded).map_err(|e| format!("File content is not valid UTF-8: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditRepoResult {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn gh_edit_repo(
    owner: String,
    repo: String,
    description: Option<String>,
    visibility: Option<String>,
    homepage: Option<String>,
    default_branch: Option<String>,
) -> Result<EditRepoResult, String> {
    let repo_path = format!("{}/{}", owner, repo);
    let mut args: Vec<String> = vec!["repo".to_string(), "edit".to_string(), repo_path];

    if let Some(desc) = description {
        args.push(format!("--description={}", desc));
    }

    if let Some(vis) = visibility {
        args.push(format!("--visibility={}", vis));
    }

    if let Some(hp) = homepage {
        args.push(format!("--homepage={}", hp));
    }

    if let Some(branch) = default_branch {
        args.push(format!("--default-branch={}", branch));
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    match run_gh_command(&args_refs, None) {
        Ok(_) => Ok(EditRepoResult {
            success: true,
            error: None,
        }),
        Err(e) => Ok(EditRepoResult {
            success: false,
            error: Some(e),
        }),
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRepoResult {
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn gh_delete_repo(owner: String, repo: String) -> Result<DeleteRepoResult, String> {
    let repo_path = format!("{}/{}", owner, repo);
    match run_gh_command(&["repo", "delete", &repo_path, "--yes"], None) {
        Ok(_) => Ok(DeleteRepoResult {
            success: true,
            error: None,
        }),
        Err(e) => {
            // Provide clearer error messages
            let error_msg = if e.contains("403") || e.contains("admin rights") {
                format!(
                    "You don't have permission to delete {}/{}. Only repository owners or admins can delete repositories.",
                    owner, repo
                )
            } else if e.contains("404") {
                format!("Repository {}/{} not found.", owner, repo)
            } else {
                e
            };
            Ok(DeleteRepoResult {
                success: false,
                error: Some(error_msg),
            })
        }
    }
}

use serde::{Deserialize, Serialize};
use std::process::Command;

// === Data Structures ===

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BrewPackage {
    pub name: String,
    pub full_name: String,
    pub version: String,
    pub desc: Option<String>,
    pub homepage: Option<String>,
    pub installed_on_request: bool,
    pub outdated: bool,
    pub pinned: bool,
    pub package_type: PackageType,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PackageType {
    Formula,
    Cask,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrewSearchResult {
    pub name: String,
    pub desc: Option<String>,
    pub package_type: PackageType,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrewPackageInfo {
    pub name: String,
    pub full_name: String,
    pub version: String,
    pub desc: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
    pub dependencies: Vec<String>,
    pub caveats: Option<String>,
    pub package_type: PackageType,
    pub installed: bool,
    pub outdated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrewTap {
    pub name: String,
    pub remote: String,
    pub is_official: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrewDoctorResult {
    pub issues: Vec<String>,
    pub warnings: Vec<String>,
    pub is_healthy: bool,
    pub raw_output: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

// === Helper to get brew path ===
fn get_brew_path() -> String {
    // Try common Homebrew paths
    if std::path::Path::new("/opt/homebrew/bin/brew").exists() {
        "/opt/homebrew/bin/brew".to_string()
    } else if std::path::Path::new("/usr/local/bin/brew").exists() {
        "/usr/local/bin/brew".to_string()
    } else {
        "brew".to_string()
    }
}

// === Commands ===

/// Check if Homebrew is installed
#[tauri::command]
pub async fn brew_check_installed() -> Result<bool, String> {
    let brew_path = get_brew_path();
    let output = Command::new(&brew_path)
        .arg("--version")
        .output();

    match output {
        Ok(o) => Ok(o.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get Homebrew version
#[tauri::command]
pub async fn brew_version() -> Result<String, String> {
    let brew_path = get_brew_path();
    let output = Command::new(&brew_path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute brew: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).lines().next().unwrap_or("Unknown").to_string())
    } else {
        Err("Failed to get Homebrew version".to_string())
    }
}

/// List all installed packages (formulae and casks)
#[tauri::command]
pub async fn brew_list_installed() -> Result<Vec<BrewPackage>, String> {
    let brew_path = get_brew_path();
    let mut packages = Vec::new();

    // Get installed formulae with JSON
    let formulae_output = Command::new(&brew_path)
        .args(["list", "--formulae", "--json=v2"])
        .output()
        .map_err(|e| format!("Failed to list formulae: {}", e))?;

    if formulae_output.status.success() {
        let json_str = String::from_utf8_lossy(&formulae_output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(formulae) = json.get("formulae").and_then(|f| f.as_array()) {
                for f in formulae {
                    let name = f.get("name").and_then(|n| n.as_str()).unwrap_or_default();
                    let full_name = f.get("full_name").and_then(|n| n.as_str()).unwrap_or(name);
                    let version = f.get("installed")
                        .and_then(|i| i.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.get("version"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    let desc = f.get("desc").and_then(|d| d.as_str()).map(|s| s.to_string());
                    let homepage = f.get("homepage").and_then(|h| h.as_str()).map(|s| s.to_string());
                    let installed_on_request = f.get("installed")
                        .and_then(|i| i.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.get("installed_on_request"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    let pinned = f.get("pinned").and_then(|p| p.as_bool()).unwrap_or(false);
                    let outdated = f.get("outdated").and_then(|o| o.as_bool()).unwrap_or(false);

                    packages.push(BrewPackage {
                        name: name.to_string(),
                        full_name: full_name.to_string(),
                        version: version.to_string(),
                        desc,
                        homepage,
                        installed_on_request,
                        outdated,
                        pinned,
                        package_type: PackageType::Formula,
                    });
                }
            }
        }
    }

    // Get installed casks with JSON
    let casks_output = Command::new(&brew_path)
        .args(["list", "--casks", "--json=v2"])
        .output()
        .map_err(|e| format!("Failed to list casks: {}", e))?;

    if casks_output.status.success() {
        let json_str = String::from_utf8_lossy(&casks_output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(casks) = json.get("casks").and_then(|c| c.as_array()) {
                for c in casks {
                    let token = c.get("token").and_then(|t| t.as_str()).unwrap_or_default();
                    let version = c.get("version").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let desc = c.get("desc").and_then(|d| d.as_str()).map(|s| s.to_string());
                    let homepage = c.get("homepage").and_then(|h| h.as_str()).map(|s| s.to_string());
                    let outdated = c.get("outdated").and_then(|o| o.as_bool()).unwrap_or(false);

                    packages.push(BrewPackage {
                        name: token.to_string(),
                        full_name: token.to_string(),
                        version: version.to_string(),
                        desc,
                        homepage,
                        installed_on_request: true,
                        outdated,
                        pinned: false,
                        package_type: PackageType::Cask,
                    });
                }
            }
        }
    }

    // Sort by name
    packages.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(packages)
}

/// List outdated packages
#[tauri::command]
pub async fn brew_list_outdated() -> Result<Vec<BrewPackage>, String> {
    let brew_path = get_brew_path();
    let mut packages = Vec::new();

    // Get outdated formulae
    let formulae_output = Command::new(&brew_path)
        .args(["outdated", "--formulae", "--json=v2"])
        .output()
        .map_err(|e| format!("Failed to check outdated formulae: {}", e))?;

    if formulae_output.status.success() {
        let json_str = String::from_utf8_lossy(&formulae_output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(formulae) = json.get("formulae").and_then(|f| f.as_array()) {
                for f in formulae {
                    let name = f.get("name").and_then(|n| n.as_str()).unwrap_or_default();
                    let current = f.get("installed_versions")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    let pinned = f.get("pinned").and_then(|p| p.as_bool()).unwrap_or(false);

                    packages.push(BrewPackage {
                        name: name.to_string(),
                        full_name: name.to_string(),
                        version: current.to_string(),
                        desc: None,
                        homepage: None,
                        installed_on_request: true,
                        outdated: true,
                        pinned,
                        package_type: PackageType::Formula,
                    });
                }
            }
        }
    }

    // Get outdated casks
    let casks_output = Command::new(&brew_path)
        .args(["outdated", "--casks", "--json=v2"])
        .output()
        .map_err(|e| format!("Failed to check outdated casks: {}", e))?;

    if casks_output.status.success() {
        let json_str = String::from_utf8_lossy(&casks_output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(casks) = json.get("casks").and_then(|c| c.as_array()) {
                for c in casks {
                    let token = c.get("name").and_then(|t| t.as_str()).unwrap_or_default();
                    let current = c.get("installed_versions")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");

                    packages.push(BrewPackage {
                        name: token.to_string(),
                        full_name: token.to_string(),
                        version: current.to_string(),
                        desc: None,
                        homepage: None,
                        installed_on_request: true,
                        outdated: true,
                        pinned: false,
                        package_type: PackageType::Cask,
                    });
                }
            }
        }
    }

    Ok(packages)
}

/// Search for packages
#[tauri::command]
pub async fn brew_search(query: String) -> Result<Vec<BrewSearchResult>, String> {
    let brew_path = get_brew_path();
    let mut results = Vec::new();

    // Search returns plain text, need to parse sections
    let output = Command::new(&brew_path)
        .args(["search", &query])
        .output()
        .map_err(|e| format!("Failed to search: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut current_type = PackageType::Formula;

        for line in stdout.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if line.starts_with("==> Formulae") {
                current_type = PackageType::Formula;
                continue;
            }
            if line.starts_with("==> Casks") {
                current_type = PackageType::Cask;
                continue;
            }
            if line.starts_with("==>") {
                continue;
            }

            // Each line can have multiple packages separated by spaces
            for name in line.split_whitespace() {
                results.push(BrewSearchResult {
                    name: name.to_string(),
                    desc: None,
                    package_type: current_type.clone(),
                });
            }
        }
    }

    Ok(results)
}

/// Get detailed info about a package
#[tauri::command]
pub async fn brew_info(package_name: String, is_cask: bool) -> Result<BrewPackageInfo, String> {
    let brew_path = get_brew_path();

    let mut args = vec!["info", "--json=v2"];
    if is_cask {
        args.push("--cask");
    }
    args.push(&package_name);

    let output = Command::new(&brew_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to get info: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Package not found: {}", stderr));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    if is_cask {
        if let Some(casks) = json.get("casks").and_then(|c| c.as_array()) {
            if let Some(c) = casks.first() {
                return Ok(BrewPackageInfo {
                    name: c.get("token").and_then(|t| t.as_str()).unwrap_or_default().to_string(),
                    full_name: c.get("full_token").and_then(|t| t.as_str()).unwrap_or_default().to_string(),
                    version: c.get("version").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                    desc: c.get("desc").and_then(|d| d.as_str()).map(|s| s.to_string()),
                    homepage: c.get("homepage").and_then(|h| h.as_str()).map(|s| s.to_string()),
                    license: None,
                    dependencies: Vec::new(),
                    caveats: c.get("caveats").and_then(|c| c.as_str()).map(|s| s.to_string()),
                    package_type: PackageType::Cask,
                    installed: c.get("installed").and_then(|i| i.as_str()).is_some(),
                    outdated: c.get("outdated").and_then(|o| o.as_bool()).unwrap_or(false),
                });
            }
        }
    } else {
        if let Some(formulae) = json.get("formulae").and_then(|f| f.as_array()) {
            if let Some(f) = formulae.first() {
                let deps = f.get("dependencies")
                    .and_then(|d| d.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                    .unwrap_or_default();

                return Ok(BrewPackageInfo {
                    name: f.get("name").and_then(|n| n.as_str()).unwrap_or_default().to_string(),
                    full_name: f.get("full_name").and_then(|n| n.as_str()).unwrap_or_default().to_string(),
                    version: f.get("versions").and_then(|v| v.get("stable")).and_then(|s| s.as_str()).unwrap_or("unknown").to_string(),
                    desc: f.get("desc").and_then(|d| d.as_str()).map(|s| s.to_string()),
                    homepage: f.get("homepage").and_then(|h| h.as_str()).map(|s| s.to_string()),
                    license: f.get("license").and_then(|l| l.as_str()).map(|s| s.to_string()),
                    dependencies: deps,
                    caveats: f.get("caveats").and_then(|c| c.as_str()).map(|s| s.to_string()),
                    package_type: PackageType::Formula,
                    installed: f.get("installed").and_then(|i| i.as_array()).map(|arr| !arr.is_empty()).unwrap_or(false),
                    outdated: f.get("outdated").and_then(|o| o.as_bool()).unwrap_or(false),
                });
            }
        }
    }

    Err("Package not found".to_string())
}

/// Install a package
#[tauri::command]
pub async fn brew_install(package_name: String, is_cask: bool) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let mut args = vec!["install"];
    if is_cask {
        args.push("--cask");
    }
    args.push(&package_name);

    let output = Command::new(&brew_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to install: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Uninstall a package
#[tauri::command]
pub async fn brew_uninstall(package_name: String, is_cask: bool) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let mut args = vec!["uninstall"];
    if is_cask {
        args.push("--cask");
    }
    args.push(&package_name);

    let output = Command::new(&brew_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to uninstall: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Update Homebrew
#[tauri::command]
pub async fn brew_update() -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .arg("update")
        .output()
        .map_err(|e| format!("Failed to update: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Upgrade a package or all packages
#[tauri::command]
pub async fn brew_upgrade(package_name: Option<String>, is_cask: bool) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let mut args = vec!["upgrade"];
    if is_cask {
        args.push("--cask");
    }

    let pkg_name;
    if let Some(ref name) = package_name {
        pkg_name = name.clone();
        args.push(&pkg_name);
    }

    let output = Command::new(&brew_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to upgrade: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// List taps
#[tauri::command]
pub async fn brew_list_taps() -> Result<Vec<BrewTap>, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .arg("tap")
        .output()
        .map_err(|e| format!("Failed to list taps: {}", e))?;

    if !output.status.success() {
        return Err("Failed to list taps".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut taps = Vec::new();

    for line in stdout.lines() {
        let name = line.trim();
        if name.is_empty() {
            continue;
        }

        let is_official = name.starts_with("homebrew/");
        let remote = if is_official {
            format!("https://github.com/{}.git", name)
        } else {
            format!("https://github.com/{}.git", name)
        };

        taps.push(BrewTap {
            name: name.to_string(),
            remote,
            is_official,
        });
    }

    Ok(taps)
}

/// Add a tap
#[tauri::command]
pub async fn brew_tap(repo: String) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .args(["tap", &repo])
        .output()
        .map_err(|e| format!("Failed to tap: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Remove a tap
#[tauri::command]
pub async fn brew_untap(repo: String) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .args(["untap", &repo])
        .output()
        .map_err(|e| format!("Failed to untap: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Run brew doctor
#[tauri::command]
pub async fn brew_doctor() -> Result<BrewDoctorResult, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .arg("doctor")
        .output()
        .map_err(|e| format!("Failed to run doctor: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    let mut issues = Vec::new();
    let mut warnings = Vec::new();

    for line in combined.lines() {
        let line = line.trim();
        if line.starts_with("Error:") {
            issues.push(line.to_string());
        } else if line.starts_with("Warning:") {
            warnings.push(line.to_string());
        }
    }

    Ok(BrewDoctorResult {
        issues,
        warnings: warnings.clone(),
        is_healthy: output.status.success() && warnings.is_empty(),
        raw_output: combined,
    })
}

/// Cleanup old versions
#[tauri::command]
pub async fn brew_cleanup(dry_run: bool) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let mut args = vec!["cleanup"];
    if dry_run {
        args.push("--dry-run");
    }

    let output = Command::new(&brew_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to cleanup: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Pin a package
#[tauri::command]
pub async fn brew_pin(package_name: String) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .args(["pin", &package_name])
        .output()
        .map_err(|e| format!("Failed to pin: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

/// Unpin a package
#[tauri::command]
pub async fn brew_unpin(package_name: String) -> Result<CommandOutput, String> {
    let brew_path = get_brew_path();

    let output = Command::new(&brew_path)
        .args(["unpin", &package_name])
        .output()
        .map_err(|e| format!("Failed to unpin: {}", e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

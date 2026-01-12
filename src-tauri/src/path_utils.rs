/// Utilities for building enhanced PATH for command execution.
///
/// In production Tauri builds, the app runs with a minimal PATH that doesn't
/// include common tool locations like Homebrew or nvm. This module provides
/// a function to build an enhanced PATH that includes these locations.

/// Returns an enhanced PATH string that includes common tool locations.
///
/// This is necessary for production builds where the app is launched from
/// Finder/Spotlight and doesn't inherit the user's shell PATH.
///
/// Includes:
/// - ~/.local/bin (pip-installed tools, claude-code)
/// - /usr/local/bin (Homebrew on Intel Macs)
/// - /opt/homebrew/bin (Homebrew on Apple Silicon)
/// - ~/.asdf/shims (asdf version manager)
/// - ~/.local/share/pnpm (pnpm global bin)
/// - ~/.nvm/versions/node/*/bin (dynamically detected nvm versions)
/// - The current PATH
pub fn get_enhanced_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| String::new());
    let current_path = std::env::var("PATH").unwrap_or_default();

    if home.is_empty() {
        return current_path;
    }

    let mut paths = vec![
        format!("{}/.local/bin", home),
        format!("{}/.asdf/shims", home),
        format!("{}/.local/share/pnpm", home),
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
    ];

    // Dynamically detect installed nvm versions
    let nvm_versions_dir = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_versions_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with('v') {
                    paths.push(format!("{}/{}/bin", nvm_versions_dir, name));
                }
            }
        }
    }

    // Append current PATH at the end
    if !current_path.is_empty() {
        paths.push(current_path);
    }

    paths.join(":")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enhanced_path_includes_homebrew() {
        let path = get_enhanced_path();
        assert!(path.contains("/opt/homebrew/bin"));
        assert!(path.contains("/usr/local/bin"));
    }

    #[test]
    fn test_enhanced_path_includes_local_bin() {
        let path = get_enhanced_path();
        assert!(path.contains("/.local/bin"));
    }
}

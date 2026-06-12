use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};
use uuid::Uuid;

use crate::rate_limiter::{check_rate_limit, categories};

/// Security: Validate that a shell path is safe to execute.
/// Only allows absolute paths to valid executables. Rejects:
/// - Relative paths
/// - Paths with shell metacharacters
/// - Non-existent files
fn validate_shell_path(shell: &str) -> Result<(), String> {
    // Must be an absolute path
    if !shell.starts_with('/') {
        return Err(format!(
            "Security: Shell must be an absolute path, got: {}",
            shell
        ));
    }

    // Check for shell metacharacters that could indicate command injection
    let forbidden_chars = ['|', '&', ';', '$', '`', '(', ')', '{', '}', '[', ']', '<', '>', '!', '\\', '"', '\'', '\n', '\r', ' '];
    if shell.chars().any(|c| forbidden_chars.contains(&c)) {
        return Err("Security: Shell path contains invalid characters".to_string());
    }

    // Verify the file exists and is executable
    let path = Path::new(shell);
    if !path.exists() {
        return Err(format!("Security: Shell not found: {}", shell));
    }

    Ok(())
}

/// Find the byte index where an incomplete trailing UTF-8 sequence starts.
/// PTY reads are arbitrary byte chunks, so a multi-byte character (every
/// box-drawing glyph a TUI emits) regularly straddles a chunk boundary.
/// Decoding each chunk independently turns both halves into U+FFFD, which
/// desyncs diff-rendering TUIs like Claude Code. Bytes from this index on
/// must be carried into the next chunk.
fn utf8_incomplete_tail_start(bytes: &[u8]) -> usize {
    let len = bytes.len();
    for back in 1..=3.min(len) {
        let b = bytes[len - back];
        if b & 0b1100_0000 == 0b1100_0000 {
            // Start byte of a multi-byte sequence
            let need = if b >= 0xF0 {
                4
            } else if b >= 0xE0 {
                3
            } else {
                2
            };
            return if back < need { len - back } else { len };
        }
        if b & 0b1000_0000 == 0 {
            // ASCII byte - everything before the tail is complete
            return len;
        }
        // Continuation byte - keep scanning backwards
    }
    len
}

/// Security: Validate that a working directory is safe.
fn validate_cwd(cwd: &str) -> Result<(), String> {
    if cwd.is_empty() {
        return Err("Security: Working directory cannot be empty".to_string());
    }

    // Must be an absolute path
    if !cwd.starts_with('/') {
        return Err(format!(
            "Security: Working directory must be an absolute path, got: {}",
            cwd
        ));
    }

    let path = Path::new(cwd);
    if !path.exists() {
        return Err(format!("Security: Working directory not found: {}", cwd));
    }

    if !path.is_dir() {
        return Err(format!("Security: Path is not a directory: {}", cwd));
    }

    Ok(())
}

#[derive(Clone, Serialize)]
pub struct PtyOutput {
    #[serde(rename = "ptyId")]
    pub pty_id: String,
    pub data: String,
}

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    // Store the master PTY handle for resize operations
    master: Box<dyn MasterPty + Send>,
    #[allow(dead_code)] // Kept alive to keep the reader thread running
    reader_handle: Option<std::thread::JoinHandle<()>>,
}

pub struct PtyManager {
    instances: Mutex<HashMap<String, PtyInstance>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a new PTY (pseudo-terminal) session.
///
/// # Security Note
/// This command intentionally spawns an interactive shell to provide terminal functionality.
/// Input validation is performed on shell path and working directory to prevent injection attacks.
/// The terminal runs with the same permissions as the parent application.
#[tauri::command]
pub async fn create_pty(
    window: tauri::Window,
    state: State<'_, Arc<PtyManager>>,
    cwd: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
) -> Result<String, String> {
    // Rate limit check
    check_rate_limit(categories::TERMINAL)?;

    // Security: Validate working directory
    validate_cwd(&cwd)?;

    // Use provided shell or fall back to user's default shell
    let shell = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    });

    // Security: Validate shell path
    validate_shell_path(&shell)?;

    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let pty_id = Uuid::new_v4().to_string();

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);

    // Set up environment
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get reader and writer
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store the PTY instance
    let pty_id_clone = pty_id.clone();
    let window_clone = window.clone();

    // Spawn a thread to read from the PTY and emit events
    let reader_handle = std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        // Carries an incomplete UTF-8 sequence from the end of one read
        // into the start of the next so multi-byte chars never get split
        let mut carry: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let mut bytes = std::mem::take(&mut carry);
                    bytes.extend_from_slice(&buf[..n]);
                    let complete = utf8_incomplete_tail_start(&bytes);
                    carry = bytes[complete..].to_vec();
                    if complete == 0 {
                        continue;
                    }
                    let data = String::from_utf8_lossy(&bytes[..complete]).to_string();

                    // Debug logging for newline investigation
                    // Shows \r, \n, and escape sequences with visible markers
                    #[cfg(debug_assertions)]
                    {
                        let escaped = data
                            .replace('\r', "⏎\\r")
                            .replace('\n', "↵\\n")
                            .replace('\x1b', "␛");
                        eprintln!("[PTY {}] {} bytes: {}", pty_id_clone, n, escaped);
                    }

                    #[cfg(debug_assertions)]
                    if let Err(e) = window_clone.emit(
                        "pty-output",
                        PtyOutput {
                            pty_id: pty_id_clone.clone(),
                            data: data.clone(),
                        },
                    ) {
                        eprintln!("[DEBUG] Failed to emit 'pty-output': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window_clone.emit(
                        "pty-output",
                        PtyOutput {
                            pty_id: pty_id_clone.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
    });

    // Store PTY instance with master handle for resize operations
    let mut instances = state.instances.lock().expect("PTY instances mutex poisoned");
    instances.insert(
        pty_id.clone(),
        PtyInstance {
            writer,
            master: pair.master,
            reader_handle: Some(reader_handle),
        },
    );

    // Spawn a thread to wait for the child process
    let pty_id_for_wait = pty_id.clone();
    let state_clone = state.inner().clone();
    std::thread::spawn(move || {
        let _ = child.wait();
        // Clean up when the process exits
        let mut instances = state_clone.instances.lock().expect("PTY instances mutex poisoned");
        instances.remove(&pty_id_for_wait);
    });

    Ok(pty_id)
}

#[tauri::command]
pub async fn write_pty(
    state: State<'_, Arc<PtyManager>>,
    pty_id: String,
    data: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().expect("PTY instances mutex poisoned");

    if let Some(instance) = instances.get_mut(&pty_id) {
        instance
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        instance
            .writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    } else {
        Err("PTY not found".to_string())
    }
}

#[tauri::command]
pub async fn resize_pty(
    state: State<'_, Arc<PtyManager>>,
    pty_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let instances = state.instances.lock().expect("PTY instances mutex poisoned");

    if let Some(instance) = instances.get(&pty_id) {
        instance
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    } else {
        Err("PTY not found".to_string())
    }
}

#[tauri::command]
pub async fn close_pty(state: State<'_, Arc<PtyManager>>, pty_id: String) -> Result<(), String> {
    let mut instances = state.instances.lock().expect("PTY instances mutex poisoned");
    instances.remove(&pty_id);
    Ok(())
}

#[tauri::command]
pub async fn is_pty_active(state: State<'_, Arc<PtyManager>>, pty_id: String) -> Result<bool, String> {
    let instances = state.instances.lock().expect("PTY instances mutex poisoned");
    Ok(instances.contains_key(&pty_id))
}

#[cfg(test)]
mod tests {
    use super::utf8_incomplete_tail_start;

    #[test]
    fn complete_ascii_passes_through() {
        assert_eq!(utf8_incomplete_tail_start(b"hello"), 5);
    }

    #[test]
    fn complete_multibyte_passes_through() {
        let s = "── ⏺ ↓".as_bytes();
        assert_eq!(utf8_incomplete_tail_start(s), s.len());
    }

    #[test]
    fn split_three_byte_char_is_carried() {
        // "─" is E2 94 80; cut after 1 and 2 bytes
        let full = "abc─".as_bytes();
        assert_eq!(utf8_incomplete_tail_start(&full[..4]), 3); // abc + E2
        assert_eq!(utf8_incomplete_tail_start(&full[..5]), 3); // abc + E2 94
        assert_eq!(utf8_incomplete_tail_start(full), 6);
    }

    #[test]
    fn split_four_byte_char_is_carried() {
        // emoji U+1F600 is F0 9F 98 80
        let full = "x😀".as_bytes();
        for cut in 2..5 {
            assert_eq!(utf8_incomplete_tail_start(&full[..cut]), 1);
        }
        assert_eq!(utf8_incomplete_tail_start(full), 5);
    }

    #[test]
    fn lone_continuation_bytes_are_not_carried_forever() {
        // Garbage continuation bytes with no start byte: nothing to wait for
        assert_eq!(utf8_incomplete_tail_start(&[0x80, 0x80, 0x80, 0x80]), 4);
    }
}

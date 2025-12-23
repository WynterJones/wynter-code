use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};
use uuid::Uuid;

#[derive(Clone, Serialize)]
pub struct PtyOutput {
    #[serde(rename = "ptyId")]
    pub pty_id: String,
    pub data: String,
}

struct PtyInstance {
    writer: Box<dyn Write + Send>,
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

#[tauri::command]
pub async fn create_pty(
    window: tauri::Window,
    state: State<'_, Arc<PtyManager>>,
    cwd: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
) -> Result<String, String> {
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

    // Use provided shell or fall back to user's default shell
    let shell = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    });

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
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
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

    // Store PTY instance
    let mut instances = state.instances.lock().unwrap();
    instances.insert(
        pty_id.clone(),
        PtyInstance {
            writer,
            reader_handle: Some(reader_handle),
        },
    );

    // Spawn a thread to wait for the child process
    let pty_id_for_wait = pty_id.clone();
    let state_clone = state.inner().clone();
    std::thread::spawn(move || {
        let _ = child.wait();
        // Clean up when the process exits
        let mut instances = state_clone.instances.lock().unwrap();
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
    let mut instances = state.instances.lock().unwrap();

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
    _state: State<'_, Arc<PtyManager>>,
    _pty_id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    // Note: portable-pty doesn't have a direct resize method on the stored writer
    // For now, resize is a no-op. A more complete implementation would need to
    // store the master PTY handle and call resize on it.
    Ok(())
}

#[tauri::command]
pub async fn close_pty(state: State<'_, Arc<PtyManager>>, pty_id: String) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();
    instances.remove(&pty_id);
    Ok(())
}

#[tauri::command]
pub async fn is_pty_active(state: State<'_, Arc<PtyManager>>, pty_id: String) -> Result<bool, String> {
    let instances = state.instances.lock().unwrap();
    Ok(instances.contains_key(&pty_id))
}

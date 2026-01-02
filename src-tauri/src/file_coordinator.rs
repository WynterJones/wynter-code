use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::TcpListener;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use tungstenite::{accept, Message};
use uuid::Uuid;

/// Information about an active file lock
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileLock {
    pub lock_id: String,
    pub file_path: String,
    pub issue_id: String,
    pub acquired_at: u64, // Unix timestamp in ms
}

/// Response to lock operations
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LockResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lock_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub holder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Request from MCP script
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LockRequest {
    pub action: String, // "acquire", "release", "check", "list", "release_all"
    #[serde(default)]
    pub file_path: String,
    #[serde(default)]
    pub issue_id: String,
    #[serde(default)]
    pub lock_id: String,
}

/// Event emitted when lock state changes
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LockEvent {
    pub action: String,
    pub file_path: String,
    pub issue_id: String,
    pub lock_id: String,
}

/// Manages file locks for concurrent auto-build
pub struct FileCoordinatorManager {
    /// Map of file_path -> FileLock
    locks: RwLock<HashMap<String, FileLock>>,
    /// Currently running server port (if any)
    server_port: RwLock<Option<u16>>,
    /// Shutdown signal for the server
    shutdown_signal: RwLock<Option<Arc<RwLock<bool>>>>,
    /// Lock timeout in seconds (5 minutes default)
    lock_timeout_secs: u64,
}

impl FileCoordinatorManager {
    pub fn new() -> Self {
        Self {
            locks: RwLock::new(HashMap::new()),
            server_port: RwLock::new(None),
            shutdown_signal: RwLock::new(None),
            lock_timeout_secs: 300, // 5 minutes
        }
    }

    /// Get the current server port (if running)
    pub fn get_port(&self) -> Option<u16> {
        *self.server_port.read().expect("server_port RwLock poisoned")
    }

    /// Try to acquire a lock on a file
    pub fn acquire_lock(&self, file_path: &str, issue_id: &str) -> LockResponse {
        let mut locks = self.locks.write().expect("locks RwLock poisoned");

        // Check if already locked
        if let Some(existing) = locks.get(file_path) {
            // Check if lock has expired
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            let age_secs = (now - existing.acquired_at) / 1000;

            if age_secs > self.lock_timeout_secs {
                // Lock expired, remove it
                eprintln!(
                    "[FileCoordinator] Lock expired for {} (held by {})",
                    file_path, existing.issue_id
                );
            } else if existing.issue_id == issue_id {
                // Same issue already holds the lock
                return LockResponse {
                    success: true,
                    lock_id: Some(existing.lock_id.clone()),
                    holder: None,
                    message: Some("Already holding lock".to_string()),
                };
            } else {
                // Different issue holds the lock
                return LockResponse {
                    success: false,
                    lock_id: None,
                    holder: Some(existing.issue_id.clone()),
                    message: Some(format!("File locked by {}", existing.issue_id)),
                };
            }
        }

        // Create new lock
        let lock_id = Uuid::new_v4().to_string();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let lock = FileLock {
            lock_id: lock_id.clone(),
            file_path: file_path.to_string(),
            issue_id: issue_id.to_string(),
            acquired_at: now,
        };

        locks.insert(file_path.to_string(), lock);

        eprintln!(
            "[FileCoordinator] Lock acquired: {} by {} (lock_id: {})",
            file_path, issue_id, lock_id
        );

        LockResponse {
            success: true,
            lock_id: Some(lock_id),
            holder: None,
            message: Some("Lock acquired".to_string()),
        }
    }

    /// Release a lock on a file
    pub fn release_lock(&self, file_path: &str, lock_id: &str) -> LockResponse {
        let mut locks = self.locks.write().expect("locks RwLock poisoned");

        if let Some(existing) = locks.get(file_path) {
            if existing.lock_id == lock_id {
                let issue_id = existing.issue_id.clone();
                locks.remove(file_path);
                eprintln!(
                    "[FileCoordinator] Lock released: {} by {}",
                    file_path, issue_id
                );
                return LockResponse {
                    success: true,
                    lock_id: None,
                    holder: None,
                    message: Some("Lock released".to_string()),
                };
            } else {
                return LockResponse {
                    success: false,
                    lock_id: None,
                    holder: Some(existing.issue_id.clone()),
                    message: Some("Lock ID mismatch".to_string()),
                };
            }
        }

        // Lock doesn't exist - that's fine, just confirm
        LockResponse {
            success: true,
            lock_id: None,
            holder: None,
            message: Some("No lock to release".to_string()),
        }
    }

    /// Check status of a file
    pub fn check_status(&self, file_path: &str) -> LockResponse {
        let locks = self.locks.read().expect("locks RwLock poisoned");

        if let Some(existing) = locks.get(file_path) {
            // Check if expired
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            let age_secs = (now - existing.acquired_at) / 1000;

            if age_secs > self.lock_timeout_secs {
                return LockResponse {
                    success: true,
                    lock_id: None,
                    holder: None,
                    message: Some("File is available (lock expired)".to_string()),
                };
            }

            LockResponse {
                success: false,
                lock_id: Some(existing.lock_id.clone()),
                holder: Some(existing.issue_id.clone()),
                message: Some(format!("Locked by {}", existing.issue_id)),
            }
        } else {
            LockResponse {
                success: true,
                lock_id: None,
                holder: None,
                message: Some("File is available".to_string()),
            }
        }
    }

    /// Get all locks for an issue
    pub fn get_locks_for_issue(&self, issue_id: &str) -> Vec<FileLock> {
        let locks = self.locks.read().expect("locks RwLock poisoned");
        locks
            .values()
            .filter(|l| l.issue_id == issue_id)
            .cloned()
            .collect()
    }

    /// Release all locks for an issue
    pub fn release_all_for_issue(&self, issue_id: &str) -> usize {
        let mut locks = self.locks.write().expect("locks RwLock poisoned");
        let initial_count = locks.len();
        locks.retain(|_, lock| lock.issue_id != issue_id);
        let released = initial_count - locks.len();
        if released > 0 {
            eprintln!(
                "[FileCoordinator] Released {} locks for issue {}",
                released, issue_id
            );
        }
        released
    }

    /// Clean up expired locks
    pub fn cleanup_expired(&self) -> usize {
        let mut locks = self.locks.write().expect("locks RwLock poisoned");
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let initial_count = locks.len();
        locks.retain(|_, lock| {
            let age_secs = (now - lock.acquired_at) / 1000;
            age_secs <= self.lock_timeout_secs
        });
        let cleaned = initial_count - locks.len();
        if cleaned > 0 {
            eprintln!("[FileCoordinator] Cleaned up {} expired locks", cleaned);
        }
        cleaned
    }

    /// Handle a lock request
    fn handle_request(&self, request: LockRequest, window: &tauri::Window) -> LockResponse {
        match request.action.as_str() {
            "acquire" => {
                let response = self.acquire_lock(&request.file_path, &request.issue_id);
                if response.success {
                    #[cfg(debug_assertions)]
                    if let Err(e) = window.emit(
                        "file-lock-change",
                        LockEvent {
                            action: "acquired".to_string(),
                            file_path: request.file_path.clone(),
                            issue_id: request.issue_id.clone(),
                            lock_id: response.lock_id.clone().unwrap_or_default(),
                        },
                    ) {
                        eprintln!("[DEBUG] Failed to emit 'file-lock-change': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window.emit(
                        "file-lock-change",
                        LockEvent {
                            action: "acquired".to_string(),
                            file_path: request.file_path.clone(),
                            issue_id: request.issue_id.clone(),
                            lock_id: response.lock_id.clone().unwrap_or_default(),
                        },
                    );
                }
                response
            }
            "release" => {
                let response = self.release_lock(&request.file_path, &request.lock_id);
                if response.success {
                    #[cfg(debug_assertions)]
                    if let Err(e) = window.emit(
                        "file-lock-change",
                        LockEvent {
                            action: "released".to_string(),
                            file_path: request.file_path.clone(),
                            issue_id: request.issue_id.clone(),
                            lock_id: request.lock_id.clone(),
                        },
                    ) {
                        eprintln!("[DEBUG] Failed to emit 'file-lock-change': {}", e);
                    }
                    #[cfg(not(debug_assertions))]
                    let _ = window.emit(
                        "file-lock-change",
                        LockEvent {
                            action: "released".to_string(),
                            file_path: request.file_path.clone(),
                            issue_id: request.issue_id.clone(),
                            lock_id: request.lock_id.clone(),
                        },
                    );
                }
                response
            }
            "check" => self.check_status(&request.file_path),
            "list" => {
                let locks = self.get_locks_for_issue(&request.issue_id);
                LockResponse {
                    success: true,
                    lock_id: None,
                    holder: None,
                    message: Some(serde_json::to_string(&locks).unwrap_or_default()),
                }
            }
            "release_all" => {
                let count = self.release_all_for_issue(&request.issue_id);
                #[cfg(debug_assertions)]
                if let Err(e) = window.emit(
                    "file-lock-change",
                    LockEvent {
                        action: "released_all".to_string(),
                        file_path: String::new(),
                        issue_id: request.issue_id.clone(),
                        lock_id: String::new(),
                    },
                ) {
                    eprintln!("[DEBUG] Failed to emit 'file-lock-change': {}", e);
                }
                #[cfg(not(debug_assertions))]
                let _ = window.emit(
                    "file-lock-change",
                    LockEvent {
                        action: "released_all".to_string(),
                        file_path: String::new(),
                        issue_id: request.issue_id.clone(),
                        lock_id: String::new(),
                    },
                );
                LockResponse {
                    success: true,
                    lock_id: None,
                    holder: None,
                    message: Some(format!("Released {} locks", count)),
                }
            }
            _ => LockResponse {
                success: false,
                lock_id: None,
                holder: None,
                message: Some(format!("Unknown action: {}", request.action)),
            },
        }
    }
}

impl Default for FileCoordinatorManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Handle a single WebSocket connection
fn handle_coordinator_connection(
    stream: std::net::TcpStream,
    state: Arc<FileCoordinatorManager>,
    window: tauri::Window,
    shutdown: Arc<RwLock<bool>>,
) {
    // Set non-blocking with timeout for shutdown checks
    stream
        .set_read_timeout(Some(Duration::from_secs(1)))
        .ok();

    let mut websocket = match accept(stream) {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("[FileCoordinator] WebSocket handshake failed: {}", e);
            return;
        }
    };

    eprintln!("[FileCoordinator] WebSocket connected");

    loop {
        // Check shutdown
        if *shutdown.read().expect("shutdown RwLock poisoned") {
            break;
        }

        match websocket.read() {
            Ok(Message::Text(text)) => {
                eprintln!(
                    "[FileCoordinator] Received: {}",
                    &text[..std::cmp::min(200, text.len())]
                );

                // Parse the request
                match serde_json::from_str::<LockRequest>(&text) {
                    Ok(request) => {
                        let response = state.handle_request(request, &window);
                        let json = serde_json::to_string(&response).unwrap();
                        if let Err(e) = websocket.send(Message::Text(json)) {
                            eprintln!("[FileCoordinator] Failed to send response: {}", e);
                        }
                    }
                    Err(e) => {
                        eprintln!("[FileCoordinator] Failed to parse request: {}", e);
                        let response = LockResponse {
                            success: false,
                            lock_id: None,
                            holder: None,
                            message: Some(format!("Invalid request: {}", e)),
                        };
                        let json = serde_json::to_string(&response).unwrap();
                        let _ = websocket.send(Message::Text(json));
                    }
                }
            }
            Ok(Message::Close(_)) => {
                eprintln!("[FileCoordinator] WebSocket closed");
                break;
            }
            Ok(_) => {
                // Ignore other message types
            }
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut =>
            {
                // Timeout, check shutdown and continue
                continue;
            }
            Err(e) => {
                eprintln!("[FileCoordinator] WebSocket error: {}", e);
                break;
            }
        }
    }

    eprintln!("[FileCoordinator] Connection handler exiting");
}

/// Start the file coordinator WebSocket server
#[tauri::command]
pub async fn start_file_coordinator_server(
    window: tauri::Window,
    state: State<'_, Arc<FileCoordinatorManager>>,
) -> Result<u16, String> {
    // Check if already running
    {
        let port = state.server_port.read().expect("server_port RwLock poisoned");
        if port.is_some() {
            return Ok(port.expect("port already checked"));
        }
    }

    // Find an available port
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind file coordinator server: {}", e))?;
    let port = listener.local_addr().unwrap().port();

    eprintln!("[FileCoordinator] Starting server on port {}", port);

    // Store the port
    {
        let mut server_port = state.server_port.write().expect("server_port RwLock poisoned");
        *server_port = Some(port);
    }

    // Create shutdown signal
    let shutdown = Arc::new(RwLock::new(false));
    {
        let mut signal = state.shutdown_signal.write().expect("shutdown_signal RwLock poisoned");
        *signal = Some(shutdown.clone());
    }

    // Clone state for the thread
    let state_clone = state.inner().clone();
    let window_clone = window.clone();

    // Spawn cleanup thread
    let state_cleanup = state.inner().clone();
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(60));
            state_cleanup.cleanup_expired();
        }
    });

    // Spawn the WebSocket server thread
    thread::spawn(move || {
        eprintln!("[FileCoordinator] Server thread started");

        for stream in listener.incoming() {
            // Check shutdown
            if *shutdown.read().expect("shutdown RwLock poisoned") {
                break;
            }

            match stream {
                Ok(stream) => {
                    eprintln!("[FileCoordinator] New WebSocket connection");
                    let state = state_clone.clone();
                    let window = window_clone.clone();
                    let shutdown_clone = shutdown.clone();

                    thread::spawn(move || {
                        handle_coordinator_connection(stream, state, window, shutdown_clone);
                    });
                }
                Err(e) => {
                    eprintln!("[FileCoordinator] Connection error: {}", e);
                }
            }
        }

        eprintln!("[FileCoordinator] Server thread exiting");
    });

    Ok(port)
}

/// Stop the file coordinator server
#[tauri::command]
pub async fn stop_file_coordinator_server(
    state: State<'_, Arc<FileCoordinatorManager>>,
) -> Result<(), String> {
    // Set shutdown signal
    {
        let signal = state.shutdown_signal.read().expect("shutdown_signal RwLock poisoned");
        if let Some(shutdown) = signal.as_ref() {
            *shutdown.write().expect("shutdown RwLock poisoned") = true;
        }
    }

    // Clear port
    {
        let mut port = state.server_port.write().expect("server_port RwLock poisoned");
        *port = None;
    }

    // Clear all locks
    {
        let mut locks = state.locks.write().expect("locks RwLock poisoned");
        locks.clear();
    }

    eprintln!("[FileCoordinator] Server stopped");
    Ok(())
}

/// Get the current file coordinator server port
#[tauri::command]
pub async fn get_file_coordinator_port(
    state: State<'_, Arc<FileCoordinatorManager>>,
) -> Result<Option<u16>, String> {
    Ok(state.get_port())
}

/// Get all active locks (for UI display)
#[tauri::command]
pub async fn get_all_file_locks(
    state: State<'_, Arc<FileCoordinatorManager>>,
) -> Result<Vec<FileLock>, String> {
    let locks = state.locks.read().expect("locks RwLock poisoned");
    Ok(locks.values().cloned().collect())
}

/// Manually release all locks for an issue (from UI)
#[tauri::command]
pub async fn release_issue_locks(
    state: State<'_, Arc<FileCoordinatorManager>>,
    issue_id: String,
) -> Result<usize, String> {
    Ok(state.release_all_for_issue(&issue_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create a manager with custom timeout for testing
    fn create_test_manager(timeout_secs: u64) -> FileCoordinatorManager {
        FileCoordinatorManager {
            locks: RwLock::new(HashMap::new()),
            server_port: RwLock::new(None),
            shutdown_signal: RwLock::new(None),
            lock_timeout_secs: timeout_secs,
        }
    }

    // FileCoordinatorManager::new tests
    #[test]
    fn test_manager_new_empty_locks() {
        let manager = FileCoordinatorManager::new();
        let locks = manager.locks.read().unwrap();
        assert!(locks.is_empty());
    }

    #[test]
    fn test_manager_new_no_port() {
        let manager = FileCoordinatorManager::new();
        assert!(manager.get_port().is_none());
    }

    #[test]
    fn test_manager_default() {
        let manager = FileCoordinatorManager::default();
        let locks = manager.locks.read().unwrap();
        assert!(locks.is_empty());
    }

    // acquire_lock tests
    #[test]
    fn test_acquire_lock_success() {
        let manager = FileCoordinatorManager::new();
        let response = manager.acquire_lock("/path/to/file.rs", "issue-123");
        assert!(response.success);
        assert!(response.lock_id.is_some());
        assert!(response.holder.is_none());
    }

    #[test]
    fn test_acquire_lock_already_held_same_issue() {
        let manager = FileCoordinatorManager::new();
        let first = manager.acquire_lock("/path/to/file.rs", "issue-123");
        assert!(first.success);

        // Same issue requesting lock again
        let second = manager.acquire_lock("/path/to/file.rs", "issue-123");
        assert!(second.success);
        assert_eq!(second.lock_id, first.lock_id); // Same lock_id
        assert_eq!(second.message, Some("Already holding lock".to_string()));
    }

    #[test]
    fn test_acquire_lock_blocked_different_issue() {
        let manager = FileCoordinatorManager::new();
        let first = manager.acquire_lock("/path/to/file.rs", "issue-123");
        assert!(first.success);

        // Different issue trying to get same file
        let second = manager.acquire_lock("/path/to/file.rs", "issue-456");
        assert!(!second.success);
        assert!(second.lock_id.is_none());
        assert_eq!(second.holder, Some("issue-123".to_string()));
    }

    #[test]
    fn test_acquire_lock_multiple_files() {
        let manager = FileCoordinatorManager::new();
        let lock1 = manager.acquire_lock("/path/to/file1.rs", "issue-123");
        let lock2 = manager.acquire_lock("/path/to/file2.rs", "issue-123");

        assert!(lock1.success);
        assert!(lock2.success);
        // Different lock IDs
        assert_ne!(lock1.lock_id, lock2.lock_id);
    }

    #[test]
    fn test_acquire_lock_expired_replaced() {
        // Create manager with short timeout
        let manager = create_test_manager(1);

        // Insert a lock with an old timestamp (2 seconds ago)
        let old_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - 2000;
        {
            let mut locks = manager.locks.write().unwrap();
            locks.insert(
                "/path/to/file.rs".to_string(),
                FileLock {
                    lock_id: "old-lock".to_string(),
                    file_path: "/path/to/file.rs".to_string(),
                    issue_id: "issue-123".to_string(),
                    acquired_at: old_timestamp,
                },
            );
        }

        // Lock should be expired, different issue can take it
        let second = manager.acquire_lock("/path/to/file.rs", "issue-456");
        assert!(second.success);
        assert_ne!(second.lock_id.as_deref(), Some("old-lock"));
    }

    // release_lock tests
    #[test]
    fn test_release_lock_success() {
        let manager = FileCoordinatorManager::new();
        let acquired = manager.acquire_lock("/path/to/file.rs", "issue-123");
        let lock_id = acquired.lock_id.unwrap();

        let released = manager.release_lock("/path/to/file.rs", &lock_id);
        assert!(released.success);
        assert_eq!(released.message, Some("Lock released".to_string()));
    }

    #[test]
    fn test_release_lock_wrong_lock_id() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file.rs", "issue-123");

        let released = manager.release_lock("/path/to/file.rs", "wrong-lock-id");
        assert!(!released.success);
        assert_eq!(released.holder, Some("issue-123".to_string()));
        assert_eq!(released.message, Some("Lock ID mismatch".to_string()));
    }

    #[test]
    fn test_release_lock_no_lock_exists() {
        let manager = FileCoordinatorManager::new();

        let released = manager.release_lock("/path/to/file.rs", "any-lock-id");
        assert!(released.success);
        assert_eq!(released.message, Some("No lock to release".to_string()));
    }

    #[test]
    fn test_release_lock_file_can_be_relocked() {
        let manager = FileCoordinatorManager::new();

        // Acquire
        let first = manager.acquire_lock("/path/to/file.rs", "issue-123");
        let lock_id = first.lock_id.unwrap();

        // Release
        manager.release_lock("/path/to/file.rs", &lock_id);

        // Different issue can now acquire
        let second = manager.acquire_lock("/path/to/file.rs", "issue-456");
        assert!(second.success);
    }

    // check_status tests
    #[test]
    fn test_check_status_unlocked() {
        let manager = FileCoordinatorManager::new();
        let status = manager.check_status("/path/to/file.rs");
        assert!(status.success);
        assert!(status.holder.is_none());
        assert_eq!(status.message, Some("File is available".to_string()));
    }

    #[test]
    fn test_check_status_locked() {
        let manager = FileCoordinatorManager::new();
        let acquired = manager.acquire_lock("/path/to/file.rs", "issue-123");

        let status = manager.check_status("/path/to/file.rs");
        assert!(!status.success);
        assert_eq!(status.holder, Some("issue-123".to_string()));
        assert_eq!(status.lock_id, acquired.lock_id);
    }

    #[test]
    fn test_check_status_expired() {
        let manager = create_test_manager(1);

        // Insert a lock with an old timestamp (2 seconds ago)
        let old_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - 2000;
        {
            let mut locks = manager.locks.write().unwrap();
            locks.insert(
                "/path/to/file.rs".to_string(),
                FileLock {
                    lock_id: "old-lock".to_string(),
                    file_path: "/path/to/file.rs".to_string(),
                    issue_id: "issue-123".to_string(),
                    acquired_at: old_timestamp,
                },
            );
        }

        let status = manager.check_status("/path/to/file.rs");
        assert!(status.success);
        assert!(status.holder.is_none());
        assert_eq!(
            status.message,
            Some("File is available (lock expired)".to_string())
        );
    }

    // get_locks_for_issue tests
    #[test]
    fn test_get_locks_for_issue_empty() {
        let manager = FileCoordinatorManager::new();
        let locks = manager.get_locks_for_issue("issue-123");
        assert!(locks.is_empty());
    }

    #[test]
    fn test_get_locks_for_issue_single() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file.rs", "issue-123");

        let locks = manager.get_locks_for_issue("issue-123");
        assert_eq!(locks.len(), 1);
        assert_eq!(locks[0].file_path, "/path/to/file.rs");
        assert_eq!(locks[0].issue_id, "issue-123");
    }

    #[test]
    fn test_get_locks_for_issue_multiple() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file1.rs", "issue-123");
        manager.acquire_lock("/path/to/file2.rs", "issue-123");
        manager.acquire_lock("/path/to/file3.rs", "issue-456"); // Different issue

        let locks = manager.get_locks_for_issue("issue-123");
        assert_eq!(locks.len(), 2);
    }

    #[test]
    fn test_get_locks_for_issue_filters_correctly() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file1.rs", "issue-123");
        manager.acquire_lock("/path/to/file2.rs", "issue-456");

        let locks_123 = manager.get_locks_for_issue("issue-123");
        let locks_456 = manager.get_locks_for_issue("issue-456");

        assert_eq!(locks_123.len(), 1);
        assert_eq!(locks_456.len(), 1);
        assert_eq!(locks_123[0].issue_id, "issue-123");
        assert_eq!(locks_456[0].issue_id, "issue-456");
    }

    // release_all_for_issue tests
    #[test]
    fn test_release_all_for_issue_empty() {
        let manager = FileCoordinatorManager::new();
        let count = manager.release_all_for_issue("issue-123");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_release_all_for_issue_single() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file.rs", "issue-123");

        let count = manager.release_all_for_issue("issue-123");
        assert_eq!(count, 1);

        let locks = manager.get_locks_for_issue("issue-123");
        assert!(locks.is_empty());
    }

    #[test]
    fn test_release_all_for_issue_multiple() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file1.rs", "issue-123");
        manager.acquire_lock("/path/to/file2.rs", "issue-123");
        manager.acquire_lock("/path/to/file3.rs", "issue-123");

        let count = manager.release_all_for_issue("issue-123");
        assert_eq!(count, 3);
    }

    #[test]
    fn test_release_all_for_issue_only_target_issue() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file1.rs", "issue-123");
        manager.acquire_lock("/path/to/file2.rs", "issue-456");

        let count = manager.release_all_for_issue("issue-123");
        assert_eq!(count, 1);

        // Other issue's lock should still exist
        let locks = manager.get_locks_for_issue("issue-456");
        assert_eq!(locks.len(), 1);
    }

    // cleanup_expired tests
    #[test]
    fn test_cleanup_expired_none() {
        let manager = FileCoordinatorManager::new();
        manager.acquire_lock("/path/to/file.rs", "issue-123");

        let count = manager.cleanup_expired();
        assert_eq!(count, 0);

        // Lock should still exist
        let status = manager.check_status("/path/to/file.rs");
        assert!(!status.success); // Locked
    }

    #[test]
    fn test_cleanup_expired_all() {
        let manager = create_test_manager(1);

        // Insert locks with old timestamps (2 seconds ago)
        let old_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - 2000;
        {
            let mut locks = manager.locks.write().unwrap();
            locks.insert(
                "/path/to/file1.rs".to_string(),
                FileLock {
                    lock_id: "lock-1".to_string(),
                    file_path: "/path/to/file1.rs".to_string(),
                    issue_id: "issue-123".to_string(),
                    acquired_at: old_timestamp,
                },
            );
            locks.insert(
                "/path/to/file2.rs".to_string(),
                FileLock {
                    lock_id: "lock-2".to_string(),
                    file_path: "/path/to/file2.rs".to_string(),
                    issue_id: "issue-456".to_string(),
                    acquired_at: old_timestamp,
                },
            );
        }

        let count = manager.cleanup_expired();
        assert_eq!(count, 2);

        // All locks should be gone
        let locks = manager.locks.read().unwrap();
        assert!(locks.is_empty());
    }

    // FileLock serialization tests
    #[test]
    fn test_file_lock_serialize() {
        let lock = FileLock {
            lock_id: "abc-123".to_string(),
            file_path: "/path/to/file.rs".to_string(),
            issue_id: "issue-456".to_string(),
            acquired_at: 1704067200000,
        };
        let json = serde_json::to_string(&lock).unwrap();
        assert!(json.contains("lockId")); // camelCase
        assert!(json.contains("filePath"));
        assert!(json.contains("issueId"));
        assert!(json.contains("acquiredAt"));
    }

    #[test]
    fn test_lock_response_serialize() {
        let response = LockResponse {
            success: true,
            lock_id: Some("abc-123".to_string()),
            holder: None,
            message: Some("Lock acquired".to_string()),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("lockId")); // camelCase
        assert!(!json.contains("holder")); // Should be skipped when None
    }

    #[test]
    fn test_lock_request_deserialize() {
        let json = r#"{"action":"acquire","filePath":"/path/to/file.rs","issueId":"issue-123"}"#;
        let request: LockRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.action, "acquire");
        assert_eq!(request.file_path, "/path/to/file.rs");
        assert_eq!(request.issue_id, "issue-123");
    }

    #[test]
    fn test_lock_request_defaults() {
        let json = r#"{"action":"list"}"#;
        let request: LockRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.action, "list");
        assert_eq!(request.file_path, ""); // Default
        assert_eq!(request.issue_id, ""); // Default
        assert_eq!(request.lock_id, ""); // Default
    }
}

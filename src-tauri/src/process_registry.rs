//! Centralized process registry for tracking child processes spawned by the application.
//! This provides security by ensuring we can only kill processes we've spawned.

use std::collections::HashSet;
use std::sync::Mutex;

/// Registry of all child processes spawned by this application.
/// Used to validate kill requests to prevent terminating arbitrary system processes.
pub struct ProcessRegistry {
    pids: Mutex<HashSet<u32>>,
}

impl ProcessRegistry {
    pub fn new() -> Self {
        Self {
            pids: Mutex::new(HashSet::new()),
        }
    }

    /// Register a child process PID
    pub fn register(&self, pid: u32) {
        let mut pids = self.pids.lock().unwrap();
        pids.insert(pid);
    }

    /// Unregister a child process PID (when it exits)
    pub fn unregister(&self, pid: u32) {
        let mut pids = self.pids.lock().unwrap();
        pids.remove(&pid);
    }

    /// Check if a PID belongs to a process we spawned
    pub fn is_our_child(&self, pid: u32) -> bool {
        let pids = self.pids.lock().unwrap();
        pids.contains(&pid)
    }

    /// Get all registered PIDs (for debugging/listing)
    pub fn get_all(&self) -> Vec<u32> {
        let pids = self.pids.lock().unwrap();
        pids.iter().copied().collect()
    }
}

impl Default for ProcessRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_and_check() {
        let registry = ProcessRegistry::new();

        assert!(!registry.is_our_child(1234));

        registry.register(1234);
        assert!(registry.is_our_child(1234));

        registry.unregister(1234);
        assert!(!registry.is_our_child(1234));
    }
}

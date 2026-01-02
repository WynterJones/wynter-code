use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Rate limiter using a sliding window algorithm
/// Tracks command executions per category and rejects if limit is exceeded
pub struct RateLimiter {
    /// Map of category -> (last_reset_time, count)
    buckets: Mutex<HashMap<String, (Instant, u32)>>,
    /// Maximum requests per window
    max_requests: u32,
    /// Time window duration
    window: Duration,
}

impl RateLimiter {
    /// Create a new rate limiter
    /// - `max_requests`: Maximum number of requests allowed per window
    /// - `window_secs`: Time window in seconds
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Check if a request should be allowed and record it if so
    /// Returns Ok(()) if allowed, Err with message if rate limited
    pub fn check(&self, category: &str) -> Result<(), String> {
        let mut buckets = self.buckets.lock().map_err(|_| "Rate limiter lock error")?;
        let now = Instant::now();

        let entry = buckets.entry(category.to_string()).or_insert((now, 0));

        // Check if window has expired
        if now.duration_since(entry.0) > self.window {
            // Reset the window
            entry.0 = now;
            entry.1 = 1;
            return Ok(());
        }

        // Check if we're over the limit
        if entry.1 >= self.max_requests {
            let remaining = self.window.as_secs() - now.duration_since(entry.0).as_secs();
            return Err(format!(
                "Rate limit exceeded for '{}'. {} requests allowed per {} seconds. Try again in {} seconds.",
                category, self.max_requests, self.window.as_secs(), remaining
            ));
        }

        // Increment counter
        entry.1 += 1;
        Ok(())
    }

    /// Get current usage for a category (for monitoring)
    #[allow(dead_code)]
    pub fn get_usage(&self, category: &str) -> Option<(u32, u32)> {
        let buckets = self.buckets.lock().ok()?;
        let now = Instant::now();

        buckets.get(category).and_then(|(reset_time, count)| {
            // Only return if window is still active
            if now.duration_since(*reset_time) <= self.window {
                Some((*count, self.max_requests))
            } else {
                Some((0, self.max_requests))
            }
        })
    }

    /// Clear expired entries (for memory management)
    #[allow(dead_code)]
    pub fn cleanup(&self) {
        if let Ok(mut buckets) = self.buckets.lock() {
            let now = Instant::now();
            buckets.retain(|_, (reset_time, _)| now.duration_since(*reset_time) <= self.window);
        }
    }
}

// Global rate limiter instance for shell commands
// Limits: 60 commands per 60 seconds (1 per second average, with burst capacity)
lazy_static::lazy_static! {
    pub static ref SHELL_COMMAND_LIMITER: RateLimiter = RateLimiter::new(60, 60);
}

/// Rate limit categories for different command types
pub mod categories {
    /// Generic shell command execution
    #[allow(dead_code)]
    pub const SHELL: &str = "shell";
    /// Git operations
    pub const GIT: &str = "git";
    /// Domain lookups (whois, dns, ssl)
    pub const DOMAIN: &str = "domain";
    /// HTTP requests via domain tools
    pub const HTTP: &str = "http";
    /// Claude CLI execution
    pub const CLAUDE: &str = "claude";
    /// npm operations
    pub const NPM: &str = "npm";
    /// Terminal PTY operations
    pub const TERMINAL: &str = "terminal";
    /// Mobile API authentication/pairing
    pub const MOBILE_AUTH: &str = "mobile_auth";
}

// Rate limiter for mobile API authentication
// More restrictive: 5 attempts per 60 seconds to prevent brute-force attacks
lazy_static::lazy_static! {
    pub static ref MOBILE_AUTH_LIMITER: RateLimiter = RateLimiter::new(5, 60);
}

/// Check rate limit for mobile API authentication
/// Returns Ok(()) if allowed, Err with message if rate limited
pub fn check_mobile_auth_limit(client_id: &str) -> Result<(), String> {
    MOBILE_AUTH_LIMITER.check(&format!("{}:{}", categories::MOBILE_AUTH, client_id))
}

/// Check rate limit for a command category
/// Returns Ok(()) if allowed, Err with message if rate limited
pub fn check_rate_limit(category: &str) -> Result<(), String> {
    SHELL_COMMAND_LIMITER.check(category)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn test_rate_limiter_allows_within_limit() {
        let limiter = RateLimiter::new(5, 10);

        for _ in 0..5 {
            assert!(limiter.check("test").is_ok());
        }
    }

    #[test]
    fn test_rate_limiter_blocks_over_limit() {
        let limiter = RateLimiter::new(2, 10);

        assert!(limiter.check("test").is_ok());
        assert!(limiter.check("test").is_ok());
        assert!(limiter.check("test").is_err());
    }

    #[test]
    fn test_rate_limiter_resets_after_window() {
        let limiter = RateLimiter::new(1, 1);

        assert!(limiter.check("test").is_ok());
        assert!(limiter.check("test").is_err());

        sleep(Duration::from_secs(2));

        assert!(limiter.check("test").is_ok());
    }

    #[test]
    fn test_rate_limiter_separate_categories() {
        let limiter = RateLimiter::new(1, 10);

        assert!(limiter.check("cat1").is_ok());
        assert!(limiter.check("cat2").is_ok());
        assert!(limiter.check("cat1").is_err());
        assert!(limiter.check("cat2").is_err());
    }
}

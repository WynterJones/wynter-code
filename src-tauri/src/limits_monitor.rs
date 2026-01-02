use chrono::{DateTime, Datelike, Duration, TimeZone, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelTier {
    Sonnet,
    Opus,
    Haiku,
    Unknown,
}

/// Usage data from Claude Code JSONL - uses snake_case in source
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsage {
    #[serde(default)]
    pub input_tokens: u64,
    #[serde(default)]
    pub output_tokens: u64,
    #[serde(default)]
    pub cache_creation_input_tokens: u64,
    #[serde(default)]
    pub cache_read_input_tokens: u64,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    usage: Option<TokenUsage>,
}

#[derive(Debug, Deserialize)]
struct JournalEntry {
    timestamp: String,
    #[serde(default)]
    message: Option<MessageContent>,
    /// "assistant", "user", "summary", etc.
    #[serde(rename = "type")]
    entry_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiveHourBlock {
    pub start_time: String,
    pub end_time: String,
    pub sonnet_tokens: u64,
    pub opus_tokens: u64,
    pub haiku_tokens: u64,
    pub is_current: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    // Current 5-hour block
    pub current_block: FiveHourBlock,
    pub time_until_block_reset: u64, // seconds

    // Weekly totals (since Monday 00:00 UTC)
    pub weekly_sonnet_tokens: u64,
    pub weekly_opus_tokens: u64,
    pub weekly_haiku_tokens: u64,
    pub weekly_sonnet_hours: f64,
    pub weekly_opus_hours: f64,
    pub time_until_weekly_reset: u64, // seconds

    // Burn rate (tokens per minute over last 30 min)
    pub sonnet_burn_rate: f64,
    pub opus_burn_rate: f64,

    // Recent 5-hour blocks (last 24 hours)
    pub recent_blocks: Vec<FiveHourBlock>,

    // Total counts
    pub total_messages_today: u64,
    pub total_sessions_today: u64,

    // Last updated
    pub last_updated: String,
}

struct UsageEntry {
    timestamp: DateTime<Utc>,
    tier: ModelTier,
    total_tokens: u64,
}

/// Classify a model name into its tier (sonnet/opus/haiku)
fn classify_model(model_name: &str) -> ModelTier {
    let lower = model_name.to_lowercase();
    if lower.contains("sonnet") {
        ModelTier::Sonnet
    } else if lower.contains("opus") {
        ModelTier::Opus
    } else if lower.contains("haiku") {
        ModelTier::Haiku
    } else {
        ModelTier::Unknown
    }
}

/// Convert tokens to "equivalent hours" based on tier
/// These are approximate rates based on Claude's pricing model
/// - Sonnet: ~1M tokens = 1 hour equivalent
/// - Opus: ~250K tokens = 1 hour equivalent (4x heavier)
fn tokens_to_hours(tokens: u64, tier: ModelTier) -> f64 {
    match tier {
        ModelTier::Sonnet => tokens as f64 / 1_000_000.0,
        ModelTier::Opus => tokens as f64 / 250_000.0,
        ModelTier::Haiku => tokens as f64 / 4_000_000.0, // Much cheaper
        ModelTier::Unknown => tokens as f64 / 1_000_000.0,
    }
}

/// Get the start of the current 5-hour block
fn get_five_hour_block_start(now: DateTime<Utc>) -> DateTime<Utc> {
    let hour = now.hour() as i64;
    let block_start_hour = (hour / 5) * 5;
    now.date_naive()
        .and_hms_opt(block_start_hour as u32, 0, 0)
        .map(|dt| Utc.from_utc_datetime(&dt))
        .unwrap_or(now)
}

/// Get the start of the current week (Monday 00:00 UTC)
fn get_week_start(now: DateTime<Utc>) -> DateTime<Utc> {
    let days_since_monday = now.weekday().num_days_from_monday() as i64;
    let monday = now - Duration::days(days_since_monday);
    monday
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .map(|dt| Utc.from_utc_datetime(&dt))
        .unwrap_or(now)
}

/// Parse recent JSONL files from Claude projects directory (last 7 days only)
fn parse_all_jsonl_files() -> Vec<UsageEntry> {
    let mut entries = Vec::new();

    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return entries,
    };

    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return entries;
    }

    // Only process files modified in last 7 days
    let cutoff = std::time::SystemTime::now()
        .checked_sub(std::time::Duration::from_secs(7 * 24 * 60 * 60))
        .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

    let mut files_processed = 0;
    const MAX_FILES: usize = 100; // Limit to prevent hanging

    // Iterate through all project directories
    if let Ok(project_dirs) = fs::read_dir(&projects_dir) {
        'outer: for project_entry in project_dirs.flatten() {
            let project_path = project_entry.path();
            if !project_path.is_dir() {
                continue;
            }

            // Find all JSONL files in the project directory
            if let Ok(files) = fs::read_dir(&project_path) {
                for file_entry in files.flatten() {
                    if files_processed >= MAX_FILES {
                        break 'outer;
                    }

                    let file_path = file_entry.path();
                    if file_path.extension().map_or(false, |ext| ext == "jsonl") {
                        // Only process recent files
                        if let Ok(metadata) = file_path.metadata() {
                            if let Ok(modified) = metadata.modified() {
                                if modified < cutoff {
                                    continue;
                                }
                            }
                        }
                        parse_jsonl_file(&file_path, &mut entries);
                        files_processed += 1;
                    }
                }
            }
        }
    }

    entries
}

/// Parse a single JSONL file and extract usage entries (limited to recent entries)
fn parse_jsonl_file(path: &PathBuf, entries: &mut Vec<UsageEntry>) {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return,
    };

    let reader = BufReader::new(file);
    let mut lines_processed = 0;
    const MAX_LINES: usize = 5000; // Limit lines per file

    // Only consider entries from last 7 days
    let cutoff = Utc::now() - Duration::days(7);

    for line in reader.lines().flatten() {
        if lines_processed >= MAX_LINES {
            break;
        }
        lines_processed += 1;

        if line.is_empty() {
            continue;
        }

        // Parse the JSON line
        let entry: JournalEntry = match serde_json::from_str(&line) {
            Ok(e) => e,
            Err(_) => continue,
        };

        // Only process assistant messages with usage info
        if entry.entry_type.as_deref() != Some("assistant") {
            continue;
        }

        let message = match entry.message {
            Some(m) => m,
            None => continue,
        };

        let model = match message.model {
            Some(m) => m,
            None => continue,
        };

        let usage = match message.usage {
            Some(u) => u,
            None => continue,
        };

        // Parse timestamp
        let timestamp = match DateTime::parse_from_rfc3339(&entry.timestamp) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(_) => continue,
        };

        // Skip entries older than 7 days
        if timestamp < cutoff {
            continue;
        }

        let tier = classify_model(&model);
        let total_tokens = usage.input_tokens
            + usage.output_tokens
            + usage.cache_creation_input_tokens
            + usage.cache_read_input_tokens;

        entries.push(UsageEntry {
            timestamp,
            tier,
            total_tokens,
        });
    }
}

/// Calculate 5-hour blocks for the last 24 hours
fn calculate_five_hour_blocks(entries: &[UsageEntry], now: DateTime<Utc>) -> Vec<FiveHourBlock> {
    let mut blocks = Vec::new();
    let current_block_start = get_five_hour_block_start(now);

    // Generate blocks for the last 24 hours (5 blocks back)
    for i in 0..5 {
        let block_start = current_block_start - Duration::hours(5 * i);
        let block_end = block_start + Duration::hours(5);

        let mut sonnet_tokens = 0u64;
        let mut opus_tokens = 0u64;
        let mut haiku_tokens = 0u64;

        for entry in entries {
            if entry.timestamp >= block_start && entry.timestamp < block_end {
                match entry.tier {
                    ModelTier::Sonnet => sonnet_tokens += entry.total_tokens,
                    ModelTier::Opus => opus_tokens += entry.total_tokens,
                    ModelTier::Haiku => haiku_tokens += entry.total_tokens,
                    ModelTier::Unknown => sonnet_tokens += entry.total_tokens,
                }
            }
        }

        blocks.push(FiveHourBlock {
            start_time: block_start.to_rfc3339(),
            end_time: block_end.to_rfc3339(),
            sonnet_tokens,
            opus_tokens,
            haiku_tokens,
            is_current: i == 0,
        });
    }

    blocks
}

/// Calculate burn rate (tokens per minute) over the last N minutes
fn calculate_burn_rate(entries: &[UsageEntry], now: DateTime<Utc>, minutes: i64) -> (f64, f64) {
    let cutoff = now - Duration::minutes(minutes);

    let mut sonnet_tokens = 0u64;
    let mut opus_tokens = 0u64;

    for entry in entries {
        if entry.timestamp >= cutoff {
            match entry.tier {
                ModelTier::Sonnet => sonnet_tokens += entry.total_tokens,
                ModelTier::Opus => opus_tokens += entry.total_tokens,
                _ => {}
            }
        }
    }

    let sonnet_rate = sonnet_tokens as f64 / minutes as f64;
    let opus_rate = opus_tokens as f64 / minutes as f64;

    (sonnet_rate, opus_rate)
}

/// Count unique sessions today (with limits)
fn count_sessions_today(now: DateTime<Utc>) -> u64 {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return 0,
    };

    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return 0;
    }

    let today = now.date_naive();
    let mut session_count = 0u64;
    let mut dirs_checked = 0;
    const MAX_DIRS: usize = 50;

    // Count JSONL files modified today as rough session count
    if let Ok(project_dirs) = fs::read_dir(&projects_dir) {
        for project_entry in project_dirs.flatten() {
            if dirs_checked >= MAX_DIRS {
                break;
            }
            dirs_checked += 1;

            let project_path = project_entry.path();
            if !project_path.is_dir() {
                continue;
            }

            if let Ok(files) = fs::read_dir(&project_path) {
                for file_entry in files.flatten() {
                    let file_path = file_entry.path();
                    if file_path.extension().map_or(false, |ext| ext == "jsonl") {
                        if let Ok(metadata) = file_path.metadata() {
                            if let Ok(modified) = metadata.modified() {
                                let modified_dt: DateTime<Utc> = modified.into();
                                if modified_dt.date_naive() == today {
                                    session_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    session_count
}

#[tauri::command]
pub fn calculate_usage_summary() -> Result<UsageSummary, String> {
    let now = Utc::now();
    let entries = parse_all_jsonl_files();

    // Current 5-hour block
    let current_block_start = get_five_hour_block_start(now);
    let current_block_end = current_block_start + Duration::hours(5);
    let time_until_block_reset = (current_block_end - now).num_seconds().max(0) as u64;

    // Weekly totals
    let week_start = get_week_start(now);
    let next_week_start = week_start + Duration::days(7);
    let time_until_weekly_reset = (next_week_start - now).num_seconds().max(0) as u64;

    let mut weekly_sonnet_tokens = 0u64;
    let mut weekly_opus_tokens = 0u64;
    let mut weekly_haiku_tokens = 0u64;

    let mut current_block_sonnet = 0u64;
    let mut current_block_opus = 0u64;
    let mut current_block_haiku = 0u64;

    let today = now.date_naive();
    let mut messages_today = 0u64;

    for entry in &entries {
        // Weekly totals
        if entry.timestamp >= week_start {
            match entry.tier {
                ModelTier::Sonnet => weekly_sonnet_tokens += entry.total_tokens,
                ModelTier::Opus => weekly_opus_tokens += entry.total_tokens,
                ModelTier::Haiku => weekly_haiku_tokens += entry.total_tokens,
                ModelTier::Unknown => weekly_sonnet_tokens += entry.total_tokens,
            }
        }

        // Current block
        if entry.timestamp >= current_block_start && entry.timestamp < current_block_end {
            match entry.tier {
                ModelTier::Sonnet => current_block_sonnet += entry.total_tokens,
                ModelTier::Opus => current_block_opus += entry.total_tokens,
                ModelTier::Haiku => current_block_haiku += entry.total_tokens,
                ModelTier::Unknown => current_block_sonnet += entry.total_tokens,
            }
        }

        // Today's messages
        if entry.timestamp.date_naive() == today {
            messages_today += 1;
        }
    }

    // Calculate hours
    let weekly_sonnet_hours = tokens_to_hours(weekly_sonnet_tokens, ModelTier::Sonnet);
    let weekly_opus_hours = tokens_to_hours(weekly_opus_tokens, ModelTier::Opus);

    // Burn rate (last 30 minutes)
    let (sonnet_burn_rate, opus_burn_rate) = calculate_burn_rate(&entries, now, 30);

    // 5-hour blocks for the last 24 hours
    let recent_blocks = calculate_five_hour_blocks(&entries, now);

    // Current block
    let current_block = FiveHourBlock {
        start_time: current_block_start.to_rfc3339(),
        end_time: current_block_end.to_rfc3339(),
        sonnet_tokens: current_block_sonnet,
        opus_tokens: current_block_opus,
        haiku_tokens: current_block_haiku,
        is_current: true,
    };

    // Session count
    let sessions_today = count_sessions_today(now);

    Ok(UsageSummary {
        current_block,
        time_until_block_reset,
        weekly_sonnet_tokens,
        weekly_opus_tokens,
        weekly_haiku_tokens,
        weekly_sonnet_hours,
        weekly_opus_hours,
        time_until_weekly_reset,
        sonnet_burn_rate,
        opus_burn_rate,
        recent_blocks,
        total_messages_today: messages_today,
        total_sessions_today: sessions_today,
        last_updated: now.to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Weekday;

    // classify_model tests
    #[test]
    fn test_classify_model_sonnet() {
        assert_eq!(
            classify_model("claude-sonnet-4-20250514"),
            ModelTier::Sonnet
        );
    }

    #[test]
    fn test_classify_model_opus() {
        assert_eq!(
            classify_model("claude-opus-4-5-20251101"),
            ModelTier::Opus
        );
    }

    #[test]
    fn test_classify_model_haiku() {
        assert_eq!(
            classify_model("claude-haiku-4-5-20251001"),
            ModelTier::Haiku
        );
    }

    #[test]
    fn test_classify_model_unknown() {
        assert_eq!(classify_model("unknown-model"), ModelTier::Unknown);
    }

    #[test]
    fn test_classify_model_case_insensitive() {
        assert_eq!(classify_model("CLAUDE-SONNET-4"), ModelTier::Sonnet);
        assert_eq!(classify_model("Claude-Opus-4"), ModelTier::Opus);
        assert_eq!(classify_model("HAIKU-model"), ModelTier::Haiku);
    }

    #[test]
    fn test_classify_model_partial_match() {
        assert_eq!(classify_model("my-custom-sonnet-model"), ModelTier::Sonnet);
        assert_eq!(classify_model("opus-v2-beta"), ModelTier::Opus);
    }

    #[test]
    fn test_classify_model_empty() {
        assert_eq!(classify_model(""), ModelTier::Unknown);
    }

    // tokens_to_hours tests
    #[test]
    fn test_tokens_to_hours_sonnet() {
        assert!((tokens_to_hours(1_000_000, ModelTier::Sonnet) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_opus() {
        assert!((tokens_to_hours(250_000, ModelTier::Opus) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_haiku() {
        assert!((tokens_to_hours(4_000_000, ModelTier::Haiku) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_unknown_uses_sonnet_rate() {
        // Unknown uses same rate as Sonnet
        assert!((tokens_to_hours(1_000_000, ModelTier::Unknown) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_zero() {
        assert!((tokens_to_hours(0, ModelTier::Sonnet) - 0.0).abs() < 0.001);
        assert!((tokens_to_hours(0, ModelTier::Opus) - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_fractional() {
        // 500K tokens = 0.5 hours for Sonnet
        assert!((tokens_to_hours(500_000, ModelTier::Sonnet) - 0.5).abs() < 0.001);
        // 125K tokens = 0.5 hours for Opus
        assert!((tokens_to_hours(125_000, ModelTier::Opus) - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_tokens_to_hours_large_values() {
        // 10M tokens = 10 hours for Sonnet
        assert!((tokens_to_hours(10_000_000, ModelTier::Sonnet) - 10.0).abs() < 0.001);
    }

    // get_five_hour_block_start tests
    #[test]
    fn test_five_hour_block_start_hour_0() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 2, 30, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 0);
    }

    #[test]
    fn test_five_hour_block_start_hour_5() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 7, 30, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 5);
    }

    #[test]
    fn test_five_hour_block_start_hour_10() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 12, 30, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 10);
    }

    #[test]
    fn test_five_hour_block_start_hour_15() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 17, 45, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 15);
    }

    #[test]
    fn test_five_hour_block_start_hour_20() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 23, 59, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 20);
    }

    #[test]
    fn test_five_hour_block_start_boundary() {
        // Exactly at block boundary
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 10, 0, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.hour(), 10);
    }

    #[test]
    fn test_five_hour_block_start_preserves_date() {
        let now = Utc.with_ymd_and_hms(2025, 6, 15, 14, 30, 0).unwrap();
        let block_start = get_five_hour_block_start(now);
        assert_eq!(block_start.year(), 2025);
        assert_eq!(block_start.month(), 6);
        assert_eq!(block_start.day(), 15);
    }

    // get_week_start tests
    #[test]
    fn test_get_week_start_from_thursday() {
        let now = Utc.with_ymd_and_hms(2025, 12, 26, 15, 30, 0).unwrap(); // Thursday
        let week_start = get_week_start(now);
        assert_eq!(week_start.weekday(), Weekday::Mon);
        assert_eq!(week_start.hour(), 0);
        assert_eq!(week_start.minute(), 0);
    }

    #[test]
    fn test_get_week_start_from_monday() {
        let now = Utc.with_ymd_and_hms(2025, 12, 22, 10, 0, 0).unwrap(); // Monday
        let week_start = get_week_start(now);
        assert_eq!(week_start.weekday(), Weekday::Mon);
        assert_eq!(week_start.day(), 22);
    }

    #[test]
    fn test_get_week_start_from_sunday() {
        let now = Utc.with_ymd_and_hms(2025, 12, 28, 23, 59, 0).unwrap(); // Sunday
        let week_start = get_week_start(now);
        assert_eq!(week_start.weekday(), Weekday::Mon);
        assert_eq!(week_start.day(), 22); // Previous Monday
    }

    #[test]
    fn test_get_week_start_midnight() {
        let now = Utc.with_ymd_and_hms(2025, 12, 25, 0, 0, 0).unwrap(); // Thursday midnight
        let week_start = get_week_start(now);
        assert_eq!(week_start.hour(), 0);
        assert_eq!(week_start.minute(), 0);
        assert_eq!(week_start.second(), 0);
    }

    // calculate_burn_rate tests
    #[test]
    fn test_calculate_burn_rate_empty() {
        let entries: Vec<UsageEntry> = vec![];
        let now = Utc::now();
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 0.0).abs() < 0.001);
        assert!((opus_rate - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_burn_rate_sonnet_only() {
        let now = Utc::now();
        let entries = vec![UsageEntry {
            timestamp: now - Duration::minutes(10),
            tier: ModelTier::Sonnet,
            total_tokens: 30000,
        }];
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 1000.0).abs() < 0.001); // 30000 / 30 = 1000
        assert!((opus_rate - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_burn_rate_opus_only() {
        let now = Utc::now();
        let entries = vec![UsageEntry {
            timestamp: now - Duration::minutes(5),
            tier: ModelTier::Opus,
            total_tokens: 60000,
        }];
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 0.0).abs() < 0.001);
        assert!((opus_rate - 2000.0).abs() < 0.001); // 60000 / 30 = 2000
    }

    #[test]
    fn test_calculate_burn_rate_mixed() {
        let now = Utc::now();
        let entries = vec![
            UsageEntry {
                timestamp: now - Duration::minutes(10),
                tier: ModelTier::Sonnet,
                total_tokens: 15000,
            },
            UsageEntry {
                timestamp: now - Duration::minutes(5),
                tier: ModelTier::Opus,
                total_tokens: 30000,
            },
        ];
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 500.0).abs() < 0.001); // 15000 / 30
        assert!((opus_rate - 1000.0).abs() < 0.001); // 30000 / 30
    }

    #[test]
    fn test_calculate_burn_rate_ignores_haiku() {
        let now = Utc::now();
        let entries = vec![UsageEntry {
            timestamp: now - Duration::minutes(10),
            tier: ModelTier::Haiku,
            total_tokens: 100000,
        }];
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 0.0).abs() < 0.001);
        assert!((opus_rate - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_burn_rate_old_entries_excluded() {
        let now = Utc::now();
        let entries = vec![UsageEntry {
            timestamp: now - Duration::minutes(60), // Outside 30 min window
            tier: ModelTier::Sonnet,
            total_tokens: 100000,
        }];
        let (sonnet_rate, opus_rate) = calculate_burn_rate(&entries, now, 30);
        assert!((sonnet_rate - 0.0).abs() < 0.001);
        assert!((opus_rate - 0.0).abs() < 0.001);
    }

    // calculate_five_hour_blocks tests
    #[test]
    fn test_calculate_five_hour_blocks_returns_5_blocks() {
        let entries: Vec<UsageEntry> = vec![];
        let now = Utc::now();
        let blocks = calculate_five_hour_blocks(&entries, now);
        assert_eq!(blocks.len(), 5);
    }

    #[test]
    fn test_calculate_five_hour_blocks_first_is_current() {
        let entries: Vec<UsageEntry> = vec![];
        let now = Utc::now();
        let blocks = calculate_five_hour_blocks(&entries, now);
        assert!(blocks[0].is_current);
        assert!(!blocks[1].is_current);
    }

    #[test]
    fn test_calculate_five_hour_blocks_accumulates_tokens() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 12, 0, 0).unwrap();
        let entries = vec![
            UsageEntry {
                timestamp: now - Duration::hours(1), // In current block
                tier: ModelTier::Sonnet,
                total_tokens: 1000,
            },
            UsageEntry {
                timestamp: now - Duration::hours(2), // In current block
                tier: ModelTier::Sonnet,
                total_tokens: 2000,
            },
        ];
        let blocks = calculate_five_hour_blocks(&entries, now);
        assert_eq!(blocks[0].sonnet_tokens, 3000);
    }

    #[test]
    fn test_calculate_five_hour_blocks_separates_tiers() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 12, 0, 0).unwrap();
        let entries = vec![
            UsageEntry {
                timestamp: now - Duration::hours(1),
                tier: ModelTier::Sonnet,
                total_tokens: 1000,
            },
            UsageEntry {
                timestamp: now - Duration::hours(1),
                tier: ModelTier::Opus,
                total_tokens: 2000,
            },
            UsageEntry {
                timestamp: now - Duration::hours(1),
                tier: ModelTier::Haiku,
                total_tokens: 3000,
            },
        ];
        let blocks = calculate_five_hour_blocks(&entries, now);
        assert_eq!(blocks[0].sonnet_tokens, 1000);
        assert_eq!(blocks[0].opus_tokens, 2000);
        assert_eq!(blocks[0].haiku_tokens, 3000);
    }

    #[test]
    fn test_calculate_five_hour_blocks_unknown_counted_as_sonnet() {
        let now = Utc.with_ymd_and_hms(2025, 12, 31, 12, 0, 0).unwrap();
        let entries = vec![UsageEntry {
            timestamp: now - Duration::hours(1),
            tier: ModelTier::Unknown,
            total_tokens: 5000,
        }];
        let blocks = calculate_five_hour_blocks(&entries, now);
        assert_eq!(blocks[0].sonnet_tokens, 5000);
    }

    // ModelTier serialization tests
    #[test]
    fn test_model_tier_serialize() {
        assert_eq!(
            serde_json::to_string(&ModelTier::Sonnet).unwrap(),
            "\"sonnet\""
        );
        assert_eq!(
            serde_json::to_string(&ModelTier::Opus).unwrap(),
            "\"opus\""
        );
        assert_eq!(
            serde_json::to_string(&ModelTier::Haiku).unwrap(),
            "\"haiku\""
        );
        assert_eq!(
            serde_json::to_string(&ModelTier::Unknown).unwrap(),
            "\"unknown\""
        );
    }

    #[test]
    fn test_model_tier_deserialize() {
        assert_eq!(
            serde_json::from_str::<ModelTier>("\"sonnet\"").unwrap(),
            ModelTier::Sonnet
        );
        assert_eq!(
            serde_json::from_str::<ModelTier>("\"opus\"").unwrap(),
            ModelTier::Opus
        );
    }
}

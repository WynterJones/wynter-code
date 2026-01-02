use lazy_static::lazy_static;
use regex::Regex;
use std::process::Command;

use crate::rate_limiter::{check_rate_limit, categories};

lazy_static! {
    /// Compiled regex for validating domain names
    static ref DOMAIN_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$")
        .expect("invalid domain regex pattern");

    /// Compiled regex for validating IPv4 addresses
    static ref IPV4_REGEX: Regex = Regex::new(r"^(\d{1,3}\.){3}\d{1,3}$")
        .expect("invalid IPv4 regex pattern");

    /// Compiled regex for validating IPv6 addresses
    static ref IPV6_REGEX: Regex = Regex::new(r"^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$")
        .expect("invalid IPv6 regex pattern");
}

/// Validate a domain name to prevent command injection
/// Allows: alphanumeric, hyphens, dots, and underscores
/// Must not start/end with hyphen or dot, no consecutive dots
fn validate_domain(domain: &str) -> Result<(), String> {
    if domain.is_empty() || domain.len() > 253 {
        return Err("Invalid domain: must be 1-253 characters".to_string());
    }

    if !DOMAIN_REGEX.is_match(domain) {
        return Err("Invalid domain: contains invalid characters or format".to_string());
    }

    // Additional check: no shell metacharacters
    let forbidden_chars = ['|', '&', ';', '$', '`', '(', ')', '{', '}', '[', ']', '<', '>', '!', '\\', '"', '\'', '\n', '\r', '\t', ' '];
    if domain.chars().any(|c| forbidden_chars.contains(&c)) {
        return Err("Invalid domain: contains forbidden characters".to_string());
    }

    Ok(())
}

/// Validate a DNS record type
fn validate_record_type(record_type: &str) -> Result<(), String> {
    const ALLOWED_RECORD_TYPES: &[&str] = &[
        "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR", "SRV", "CAA", "DNSKEY", "DS", "NAPTR", "HINFO", "ANY"
    ];

    let upper = record_type.to_uppercase();
    if !ALLOWED_RECORD_TYPES.contains(&upper.as_str()) {
        return Err(format!("Invalid record type: {}. Allowed: {:?}", record_type, ALLOWED_RECORD_TYPES));
    }
    Ok(())
}

/// Validate an IP address (for DNS server)
fn validate_ip_or_hostname(server: &str) -> Result<(), String> {
    // Allow IPv4, IPv6, or valid hostnames
    if IPV4_REGEX.is_match(server) || IPV6_REGEX.is_match(server) {
        return Ok(());
    }

    // If not an IP, validate as hostname
    validate_domain(server)
}

/// Validate a URL for HTTP requests
fn validate_url(url: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }

    // Parse URL and validate host
    let url_obj = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

    if let Some(host) = url_obj.host_str() {
        // Validate the host part
        if !host.is_empty() {
            // Allow localhost and IP addresses
            if host == "localhost" || host.parse::<std::net::IpAddr>().is_ok() {
                return Ok(());
            }
            // Validate as domain
            validate_domain(host)?;
        }
    }

    Ok(())
}

/// Perform a WHOIS lookup for a domain
#[tauri::command]
pub async fn whois_lookup(domain: String) -> Result<String, String> {
    check_rate_limit(categories::DOMAIN)?;
    validate_domain(&domain)?;

    let output = Command::new("whois")
        .arg(&domain)
        .output()
        .map_err(|e| format!("Failed to execute whois command: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        if result.trim().is_empty() {
            Err("No WHOIS data found for this domain".to_string())
        } else {
            Ok(result)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("WHOIS lookup failed: {}", stderr))
    }
}

/// Perform a DNS lookup for a domain using dig
#[tauri::command]
pub async fn dns_lookup(domain: String, record_type: String) -> Result<String, String> {
    check_rate_limit(categories::DOMAIN)?;
    validate_domain(&domain)?;
    validate_record_type(&record_type)?;

    let output = Command::new("dig")
        .arg(&domain)
        .arg(&record_type)
        .arg("+noall")
        .arg("+answer")
        .output()
        .map_err(|e| format!("Failed to execute dig command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("DNS lookup failed: {}", stderr))
    }
}

/// Perform a DNS lookup using a specific DNS server
#[tauri::command]
pub async fn dns_lookup_server(
    domain: String,
    record_type: String,
    dns_server: String,
) -> Result<String, String> {
    check_rate_limit(categories::DOMAIN)?;
    validate_domain(&domain)?;
    validate_record_type(&record_type)?;
    validate_ip_or_hostname(&dns_server)?;

    let output = Command::new("dig")
        .arg(format!("@{}", dns_server))
        .arg(&domain)
        .arg(&record_type)
        .arg("+noall")
        .arg("+answer")
        .arg("+time=3")
        .arg("+tries=1")
        .output()
        .map_err(|e| format!("Failed to execute dig command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("DNS lookup failed: {}", stderr))
    }
}

/// Check SSL certificate for a domain using openssl
/// SECURITY: Rewrote to avoid shell interpolation (command injection vulnerability)
#[tauri::command]
pub async fn ssl_check(domain: String) -> Result<String, String> {
    check_rate_limit(categories::DOMAIN)?;
    validate_domain(&domain)?;

    // Step 1: Connect with openssl s_client and get the certificate
    let connect_arg = format!("{}:443", domain);
    let s_client = Command::new("openssl")
        .arg("s_client")
        .arg("-connect")
        .arg(&connect_arg)
        .arg("-servername")
        .arg(&domain)
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .output()
        .map_err(|e| format!("Failed to execute openssl s_client: {}", e))?;

    if !s_client.status.success() && s_client.stdout.is_empty() {
        return Err("Could not connect to server for SSL check".to_string());
    }

    // Step 2: Parse the certificate with openssl x509
    let mut x509 = Command::new("openssl")
        .arg("x509")
        .arg("-noout")
        .arg("-text")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn openssl x509: {}", e))?;

    // Write the certificate data to stdin
    if let Some(mut stdin) = x509.stdin.take() {
        use std::io::Write;
        let _ = stdin.write_all(&s_client.stdout);
    }

    let output = x509
        .wait_with_output()
        .map_err(|e| format!("Failed to get openssl x509 output: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        if result.trim().is_empty() {
            Err("Could not retrieve SSL certificate".to_string())
        } else {
            Ok(result)
        }
    } else {
        Err("SSL check failed: could not parse certificate".to_string())
    }
}

/// Perform an HTTP HEAD request to get headers
#[tauri::command]
pub async fn http_head_request(url: String) -> Result<String, String> {
    check_rate_limit(categories::HTTP)?;
    validate_url(&url)?;

    let output = Command::new("curl")
        .arg("-s")
        .arg("-I")
        .arg("-L")
        .arg("--max-time")
        .arg("10")
        .arg(&url)
        .output()
        .map_err(|e| format!("Failed to execute curl command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("HTTP request failed: {}", stderr))
    }
}

/// Fetch JSON from a URL
#[tauri::command]
pub async fn http_get_json(url: String) -> Result<String, String> {
    check_rate_limit(categories::HTTP)?;
    validate_url(&url)?;

    let output = Command::new("curl")
        .arg("-s")
        .arg("-L")
        .arg("--max-time")
        .arg("60") // Increased for slow APIs like PageSpeed Insights
        .arg("-H")
        .arg("Accept: application/json")
        .arg("-w")
        .arg("\n---HTTP_CODE---%{http_code}")
        .arg(&url)
        .output()
        .map_err(|e| format!("Failed to execute curl command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        // Check if we got an HTTP error code
        if let Some(pos) = stdout.rfind("---HTTP_CODE---") {
            let http_code = stdout[pos + 15..].trim();
            let body = stdout[..pos].to_string();

            if http_code.starts_with('4') || http_code.starts_with('5') {
                // Return the body anyway as it may contain error details
                return Ok(body);
            }
            return Ok(body);
        }
        Ok(stdout)
    } else {
        if stderr.is_empty() {
            Err("HTTP request failed: Connection timed out or refused".to_string())
        } else {
            Err(format!("HTTP request failed: {}", stderr))
        }
    }
}

/// Fetch HTML content from a URL
#[tauri::command]
pub async fn http_get_html(url: String) -> Result<String, String> {
    check_rate_limit(categories::HTTP)?;
    validate_url(&url)?;

    let output = Command::new("curl")
        .arg("-s")
        .arg("-L")
        .arg("--max-time")
        .arg("15")
        .arg("-H")
        .arg("User-Agent: Mozilla/5.0 (compatible; SEOTools/1.0)")
        .arg(&url)
        .output()
        .map_err(|e| format!("Failed to execute curl: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("HTTP request failed: {}", stderr))
    }
}

/// Follow redirects and return the chain
#[tauri::command]
pub async fn http_follow_redirects(url: String) -> Result<String, String> {
    check_rate_limit(categories::HTTP)?;
    validate_url(&url)?;

    // Use curl with -w to get redirect info in a parseable format
    let output = Command::new("curl")
        .arg("-s")
        .arg("-I")
        .arg("-L")
        .arg("--max-redirs")
        .arg("10")
        .arg("--max-time")
        .arg("15")
        .arg("-w")
        .arg("\n---REDIRECT_INFO---\n%{url_effective}\n%{http_code}\n%{redirect_url}\n")
        .arg(&url)
        .output()
        .map_err(|e| format!("Failed to execute curl command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("HTTP request failed: {}", stderr))
    }
}

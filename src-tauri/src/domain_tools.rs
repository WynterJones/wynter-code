use std::process::Command;

/// Perform a WHOIS lookup for a domain
#[tauri::command]
pub async fn whois_lookup(domain: String) -> Result<String, String> {
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
#[tauri::command]
pub async fn ssl_check(domain: String) -> Result<String, String> {
    // Use openssl s_client to connect and get certificate info
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!(
            "echo | openssl s_client -connect {}:443 -servername {} 2>/dev/null | openssl x509 -noout -text 2>/dev/null",
            domain, domain
        ))
        .output()
        .map_err(|e| format!("Failed to execute openssl command: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        if result.trim().is_empty() {
            Err("Could not retrieve SSL certificate".to_string())
        } else {
            Ok(result)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("SSL check failed: {}", stderr))
    }
}

/// Perform an HTTP HEAD request to get headers
#[tauri::command]
pub async fn http_head_request(url: String) -> Result<String, String> {
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
    let output = Command::new("curl")
        .arg("-s")
        .arg("-L")
        .arg("--max-time")
        .arg("10")
        .arg("-H")
        .arg("Accept: application/json")
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

/// Follow redirects and return the chain
#[tauri::command]
pub async fn http_follow_redirects(url: String) -> Result<String, String> {
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

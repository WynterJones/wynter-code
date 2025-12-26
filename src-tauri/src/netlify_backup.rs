use serde::{Deserialize, Serialize};
use std::time::Duration;

const NETLIFY_API_BASE: &str = "https://api.netlify.com/api/v1";

// ============================================================================
// Types
// ============================================================================

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlifySite {
    pub id: String,
    pub name: String,
    pub url: String,
    pub ssl_url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlifyUser {
    pub id: String,
    pub email: String,
    pub full_name: Option<String>,
}

// ============================================================================
// Commands
// ============================================================================

/// Test Netlify API connection
#[tauri::command]
pub async fn netlify_test_connection(token: String) -> Result<NetlifyUser, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(format!("{}/user", NETLIFY_API_BASE))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        let user: NetlifyUser = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        Ok(user)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Auth failed: {} - {}", status, error_text))
    }
}

/// Fetch all Netlify sites
#[tauri::command]
pub async fn netlify_fetch_sites(token: String) -> Result<Vec<NetlifySite>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(format!("{}/sites", NETLIFY_API_BASE))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        let sites: Vec<NetlifySite> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        Ok(sites)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to fetch sites: {} - {}", status, error_text))
    }
}

/// Create a new Netlify site
#[tauri::command]
pub async fn netlify_create_site(token: String, name: String) -> Result<NetlifySite, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = serde_json::json!({ "name": name });

    let response = client
        .post(format!("{}/sites", NETLIFY_API_BASE))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        let site: NetlifySite = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        Ok(site)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to create site: {} - {}", status, error_text))
    }
}

/// Deploy a ZIP file to a Netlify site
#[tauri::command]
pub async fn netlify_deploy_zip(
    token: String,
    site_id: String,
    zip_data: Vec<u8>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120)) // Longer timeout for uploads
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .post(format!("{}/sites/{}/deploys", NETLIFY_API_BASE, site_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/zip")
        .body(zip_data)
        .send()
        .await
        .map_err(|e| format!("Deploy request failed: {}", e))?;

    if response.status().is_success() {
        let deploy: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        // Return the deploy URL
        let deploy_url = deploy["ssl_url"]
            .as_str()
            .or_else(|| deploy["url"].as_str())
            .unwrap_or("")
            .to_string();

        Ok(deploy_url)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Deploy failed: {} - {}", status, error_text))
    }
}

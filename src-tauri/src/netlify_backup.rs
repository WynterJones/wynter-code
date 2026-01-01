use std::time::Duration;

const NETLIFY_API_BASE: &str = "https://api.netlify.com/api/v1";

// ============================================================================
// Commands
// ============================================================================

/// Test Netlify API connection
#[tauri::command]
pub async fn netlify_test_connection(token: String) -> Result<serde_json::Value, String> {
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
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Auth failed: {} - {}", status, error_text))
    }
}

/// Fetch all Netlify sites
#[tauri::command]
pub async fn netlify_fetch_sites(token: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(format!("{}/sites?per_page=100", NETLIFY_API_BASE))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to fetch sites: {} - {}", status, error_text))
    }
}

/// Fetch deploys for a site
#[tauri::command]
pub async fn netlify_fetch_deploys(token: String, site_id: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(format!("{}/sites/{}/deploys", NETLIFY_API_BASE, site_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to fetch deploys: {} - {}", status, error_text))
    }
}

/// Create a new Netlify site
#[tauri::command]
pub async fn netlify_create_site(token: String, name: String) -> Result<serde_json::Value, String> {
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
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to create site: {} - {}", status, error_text))
    }
}

/// Delete a Netlify site
#[tauri::command]
pub async fn netlify_delete_site(token: String, site_id: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .delete(format!("{}/sites/{}", NETLIFY_API_BASE, site_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to delete site: {} - {}", status, error_text))
    }
}

/// Update a Netlify site name
#[tauri::command]
pub async fn netlify_update_site(token: String, site_id: String, name: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = serde_json::json!({ "name": name });

    let response = client
        .patch(format!("{}/sites/{}", NETLIFY_API_BASE, site_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to update site: {} - {}", status, error_text))
    }
}

/// Deploy a ZIP file to a Netlify site
#[tauri::command]
pub async fn netlify_deploy_zip(
    token: String,
    site_id: String,
    zip_data: Vec<u8>,
) -> Result<serde_json::Value, String> {
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
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Deploy failed: {} - {}", status, error_text))
    }
}

/// Rollback to a previous deploy
#[tauri::command]
pub async fn netlify_rollback_deploy(
    token: String,
    site_id: String,
    deploy_id: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .post(format!("{}/sites/{}/deploys/{}/restore", NETLIFY_API_BASE, site_id, deploy_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if response.status().is_success() {
        response.json().await.map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Rollback failed: {} - {}", status, error_text))
    }
}

/// Fetch HTML content from a URL (bypasses CORS)
#[tauri::command]
pub async fn netlify_fetch_backup_html(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("Accept", "text/html")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch backup: {}", e))?;

    if response.status().is_success() {
        response.text().await.map_err(|e| format!("Failed to read response: {}", e))
    } else {
        let status = response.status();
        Err(format!("Failed to fetch backup: HTTP {}", status))
    }
}

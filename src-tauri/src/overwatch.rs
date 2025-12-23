use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Response types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

// Railway types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayMetrics {
    pub deployment_status: String,
    pub last_deployed_at: Option<i64>,
    pub service_count: i32,
    pub environment_name: Option<String>,
}

// Plausible types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlausibleMetrics {
    pub visitors: i64,
    pub pageviews: i64,
    pub bounce_rate: f64,
    pub visit_duration: f64,
    pub period: String,
}

// Netlify types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlifyMetrics {
    pub build_status: String,
    pub last_published_at: Option<i64>,
    pub deploy_time: Option<i64>,
    pub site_url: String,
    pub site_name: String,
}

// Sentry types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SentryMetrics {
    pub unresolved_issues: i64,
    pub issues_last_24h: i64,
    pub crash_free_rate: f64,
    pub events_last_24h: i64,
}

// Railway GraphQL response types
#[derive(Debug, Deserialize)]
struct RailwayGraphQLResponse {
    data: Option<RailwayData>,
    errors: Option<Vec<RailwayError>>,
}

#[derive(Debug, Deserialize)]
struct RailwayData {
    project: Option<RailwayProject>,
}

#[derive(Debug, Deserialize)]
struct RailwayProject {
    name: String,
    services: RailwayServices,
    environments: RailwayEnvironments,
}

#[derive(Debug, Deserialize)]
struct RailwayServices {
    edges: Vec<RailwayServiceEdge>,
}

#[derive(Debug, Deserialize)]
struct RailwayServiceEdge {
    node: RailwayService,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RailwayService {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct RailwayEnvironments {
    edges: Vec<RailwayEnvironmentEdge>,
}

#[derive(Debug, Deserialize)]
struct RailwayEnvironmentEdge {
    node: RailwayEnvironment,
}

#[derive(Debug, Deserialize)]
struct RailwayEnvironment {
    name: String,
    deployments: RailwayDeployments,
}

#[derive(Debug, Deserialize)]
struct RailwayDeployments {
    edges: Vec<RailwayDeploymentEdge>,
}

#[derive(Debug, Deserialize)]
struct RailwayDeploymentEdge {
    node: RailwayDeployment,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RailwayDeployment {
    status: String,
    created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RailwayError {
    message: String,
}

// Plausible API response
#[derive(Debug, Deserialize)]
struct PlausibleResponse {
    results: PlausibleResults,
}

#[derive(Debug, Deserialize)]
struct PlausibleResults {
    visitors: PlausibleValue,
    pageviews: PlausibleValue,
    bounce_rate: PlausibleValue,
    visit_duration: PlausibleValue,
}

#[derive(Debug, Deserialize)]
struct PlausibleValue {
    value: f64,
}

// Netlify API response
#[derive(Debug, Deserialize)]
struct NetlifySite {
    name: String,
    ssl_url: Option<String>,
    url: String,
    published_deploy: Option<NetlifyDeploy>,
}

#[derive(Debug, Deserialize)]
struct NetlifyDeploy {
    state: String,
    published_at: Option<String>,
    deploy_time: Option<i64>,
}

// Sentry API responses
#[derive(Debug, Deserialize)]
struct SentryIssue {
    id: String,
    #[serde(rename = "firstSeen")]
    first_seen: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SentryStats {
    #[serde(rename = "crashFreeRate")]
    crash_free_rate: Option<f64>,
}

#[tauri::command]
pub async fn overwatch_railway_status(
    api_key: String,
    project_id: String,
) -> ApiResponse<RailwayMetrics> {
    let client = Client::new();

    let query = r#"
        query project($id: String!) {
            project(id: $id) {
                name
                services {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
                environments {
                    edges {
                        node {
                            name
                            deployments(first: 1) {
                                edges {
                                    node {
                                        status
                                        createdAt
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    "#;

    let mut variables = HashMap::new();
    variables.insert("id", project_id);

    let body = serde_json::json!({
        "query": query,
        "variables": variables,
    });

    match client
        .post("https://backboard.railway.app/graphql/v2")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(response) => {
            if !response.status().is_success() {
                return ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Railway API error: {}", response.status())),
                };
            }

            match response.json::<RailwayGraphQLResponse>().await {
                Ok(gql_response) => {
                    if let Some(errors) = gql_response.errors {
                        return ApiResponse {
                            success: false,
                            data: None,
                            error: Some(errors.first().map(|e| e.message.clone()).unwrap_or_default()),
                        };
                    }

                    if let Some(data) = gql_response.data {
                        if let Some(project) = data.project {
                            let service_count = project.services.edges.len() as i32;

                            // Get the latest deployment status
                            let (deployment_status, last_deployed_at, environment_name) = project
                                .environments
                                .edges
                                .first()
                                .map(|env| {
                                    let deploy = env.node.deployments.edges.first();
                                    (
                                        deploy.map(|d| d.node.status.clone()).unwrap_or_else(|| "unknown".to_string()),
                                        deploy.and_then(|d| d.node.created_at.as_ref()).and_then(|s| {
                                            chrono::DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.timestamp_millis())
                                        }),
                                        Some(env.node.name.clone()),
                                    )
                                })
                                .unwrap_or(("unknown".to_string(), None, None));

                            return ApiResponse {
                                success: true,
                                data: Some(RailwayMetrics {
                                    deployment_status: deployment_status.to_lowercase(),
                                    last_deployed_at,
                                    service_count,
                                    environment_name,
                                }),
                                error: None,
                            };
                        }
                    }

                    ApiResponse {
                        success: false,
                        data: None,
                        error: Some("Project not found".to_string()),
                    }
                }
                Err(e) => ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to parse Railway response: {}", e)),
                },
            }
        }
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to connect to Railway: {}", e)),
        },
    }
}

#[tauri::command]
pub async fn overwatch_plausible_stats(
    api_key: String,
    site_id: String,
    period: String,
) -> ApiResponse<PlausibleMetrics> {
    let client = Client::new();

    let url = format!(
        "https://plausible.io/api/v1/stats/aggregate?site_id={}&period={}&metrics=visitors,pageviews,bounce_rate,visit_duration",
        urlencoding::encode(&site_id),
        period
    );

    match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Plausible API error ({}): {}", status, body)),
                };
            }

            match response.json::<PlausibleResponse>().await {
                Ok(stats) => ApiResponse {
                    success: true,
                    data: Some(PlausibleMetrics {
                        visitors: stats.results.visitors.value as i64,
                        pageviews: stats.results.pageviews.value as i64,
                        bounce_rate: stats.results.bounce_rate.value,
                        visit_duration: stats.results.visit_duration.value,
                        period,
                    }),
                    error: None,
                },
                Err(e) => ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to parse Plausible response: {}", e)),
                },
            }
        }
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to connect to Plausible: {}", e)),
        },
    }
}

#[tauri::command]
pub async fn overwatch_netlify_status(
    api_key: String,
    site_id: String,
) -> ApiResponse<NetlifyMetrics> {
    let client = Client::new();

    let url = format!("https://api.netlify.com/api/v1/sites/{}", site_id);

    match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Netlify API error ({}): {}", status, body)),
                };
            }

            match response.json::<NetlifySite>().await {
                Ok(site) => {
                    let (build_status, last_published_at, deploy_time) = site
                        .published_deploy
                        .map(|deploy| {
                            let published_at = deploy.published_at.and_then(|s| {
                                chrono::DateTime::parse_from_rfc3339(&s)
                                    .ok()
                                    .map(|dt| dt.timestamp_millis())
                            });
                            (deploy.state, published_at, deploy.deploy_time)
                        })
                        .unwrap_or(("unknown".to_string(), None, None));

                    ApiResponse {
                        success: true,
                        data: Some(NetlifyMetrics {
                            build_status,
                            last_published_at,
                            deploy_time,
                            site_url: site.ssl_url.unwrap_or(site.url),
                            site_name: site.name,
                        }),
                        error: None,
                    }
                }
                Err(e) => ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Failed to parse Netlify response: {}", e)),
                },
            }
        }
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to connect to Netlify: {}", e)),
        },
    }
}

#[tauri::command]
pub async fn overwatch_sentry_stats(
    api_key: String,
    organization_slug: String,
    project_slug: String,
) -> ApiResponse<SentryMetrics> {
    let client = Client::new();

    // Get unresolved issues
    let issues_url = format!(
        "https://sentry.io/api/0/projects/{}/{}/issues/?query=is:unresolved",
        organization_slug, project_slug
    );

    let unresolved_issues = match client
        .get(&issues_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                response
                    .json::<Vec<SentryIssue>>()
                    .await
                    .map(|issues| issues.len() as i64)
                    .unwrap_or(0)
            } else {
                0
            }
        }
        Err(_) => 0,
    };

    // Get issues from last 24h
    let now = chrono::Utc::now();
    let yesterday = now - chrono::Duration::hours(24);
    let issues_24h_url = format!(
        "https://sentry.io/api/0/projects/{}/{}/issues/?query=firstSeen:>{}",
        organization_slug,
        project_slug,
        yesterday.format("%Y-%m-%dT%H:%M:%S")
    );

    let issues_last_24h = match client
        .get(&issues_24h_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                response
                    .json::<Vec<SentryIssue>>()
                    .await
                    .map(|issues| issues.len() as i64)
                    .unwrap_or(0)
            } else {
                0
            }
        }
        Err(_) => 0,
    };

    // Get project stats for crash-free rate and events
    let stats_url = format!(
        "https://sentry.io/api/0/projects/{}/{}/stats/?stat=received&resolution=1d",
        organization_slug, project_slug
    );

    let events_last_24h = match client
        .get(&stats_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                response
                    .json::<Vec<(i64, i64)>>()
                    .await
                    .map(|stats| stats.last().map(|(_, count)| *count).unwrap_or(0))
                    .unwrap_or(0)
            } else {
                0
            }
        }
        Err(_) => 0,
    };

    // Calculate approximate crash-free rate (simplified)
    let crash_free_rate = if unresolved_issues == 0 {
        100.0
    } else if events_last_24h > 0 {
        let error_rate = (issues_last_24h as f64 / events_last_24h as f64) * 100.0;
        (100.0 - error_rate).max(0.0).min(100.0)
    } else {
        99.0
    };

    ApiResponse {
        success: true,
        data: Some(SentryMetrics {
            unresolved_issues,
            issues_last_24h,
            crash_free_rate,
            events_last_24h,
        }),
        error: None,
    }
}

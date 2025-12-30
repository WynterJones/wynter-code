use serde::{Deserialize, Serialize};
use sqlx::mysql::{MySqlPool, MySqlPoolOptions, MySqlRow};
use sqlx::postgres::{PgPool, PgPoolOptions, PgRow};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteRow};
use sqlx::{Column, Row, TypeInfo};
use std::collections::HashMap;
use std::process::Command;
use std::time::Instant;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub file_path: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: Option<bool>,
    pub is_supabase: Option<bool>,
    pub project_ref: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub schema: Option<String>,
    pub row_count: Option<i64>,
    #[serde(rename = "type")]
    pub table_type: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub primary_key: bool,
    pub default_value: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSchema {
    pub table_name: String,
    pub columns: Vec<ColumnInfo>,
    pub primary_keys: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<HashMap<String, serde_json::Value>>,
    pub rows_affected: u64,
    pub execution_time: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchResult {
    pub columns: Vec<String>,
    pub rows: Vec<HashMap<String, serde_json::Value>>,
    pub total_count: i64,
    pub execution_time: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Filter {
    pub column: String,
    pub operator: String,
    pub value: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortConfig {
    pub column: String,
    pub direction: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertResult {
    pub success: bool,
    pub last_insert_id: Option<i64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedService {
    pub service_type: String,
    pub host: String,
    pub port: u16,
    pub running: bool,
    pub pid: Option<u32>,
    pub databases: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub source_table: String,
    pub source_column: String,
    pub target_table: String,
    pub target_column: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableRelationships {
    pub table_name: String,
    pub schema: Option<String>,
    pub column_count: i64,
    pub foreign_keys_out: Vec<ForeignKeyInfo>,
    pub foreign_keys_in: Vec<ForeignKeyInfo>,
    pub complexity_score: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipEdge {
    pub from: String,
    pub to: String,
    pub columns: Vec<ColumnPair>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnPair {
    pub source: String,
    pub target: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipGraph {
    pub tables: Vec<TableRelationships>,
    pub edges: Vec<RelationshipEdge>,
}

// Enum to hold different database pool types
pub enum DbPool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
    MySql(MySqlPool),
}

// Store connection type alongside pool
pub struct ConnectionEntry {
    pub pool: DbPool,
    #[allow(dead_code)]
    pub db_type: String,
}

pub struct DatabaseManager {
    connections: RwLock<HashMap<String, ConnectionEntry>>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
        }
    }
}

impl Default for DatabaseManager {
    fn default() -> Self {
        Self::new()
    }
}

// SQLite row conversion
fn sqlite_row_to_hashmap(row: &SqliteRow) -> HashMap<String, serde_json::Value> {
    let mut map = HashMap::new();
    for column in row.columns() {
        let name = column.name().to_string();
        let value = get_sqlite_column_value(row, column);
        map.insert(name, value);
    }
    map
}

fn get_sqlite_column_value(row: &SqliteRow, column: &sqlx::sqlite::SqliteColumn) -> serde_json::Value {
    let type_name = column.type_info().name();
    let idx = column.ordinal();

    match type_name.to_uppercase().as_str() {
        "INTEGER" | "INT" | "INT4" | "INT8" | "BIGINT" | "SMALLINT" | "TINYINT" => {
            row.try_get::<i64, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "REAL" | "FLOAT" | "DOUBLE" | "NUMERIC" | "DECIMAL" => {
            row.try_get::<f64, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "BOOLEAN" | "BOOL" => {
            row.try_get::<bool, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        _ => {
            row.try_get::<String, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
    }
}

// PostgreSQL row conversion
fn pg_row_to_hashmap(row: &PgRow) -> HashMap<String, serde_json::Value> {
    let mut map = HashMap::new();
    for column in row.columns() {
        let name = column.name().to_string();
        let value = get_pg_column_value(row, column);
        map.insert(name, value);
    }
    map
}

fn get_pg_column_value(row: &PgRow, column: &sqlx::postgres::PgColumn) -> serde_json::Value {
    let type_name = column.type_info().name();
    let idx = column.ordinal();

    match type_name.to_uppercase().as_str() {
        "INT2" | "INT4" | "INT8" | "SERIAL" | "BIGSERIAL" | "SMALLSERIAL" => {
            // Try i64 first, then i32, then i16
            row.try_get::<i64, _>(idx)
                .map(serde_json::Value::from)
                .or_else(|_| row.try_get::<i32, _>(idx).map(|v| serde_json::Value::from(v as i64)))
                .or_else(|_| row.try_get::<i16, _>(idx).map(|v| serde_json::Value::from(v as i64)))
                .unwrap_or(serde_json::Value::Null)
        }
        "FLOAT4" | "FLOAT8" | "NUMERIC" | "DECIMAL" | "REAL" | "DOUBLE PRECISION" => {
            row.try_get::<f64, _>(idx)
                .or_else(|_| row.try_get::<f32, _>(idx).map(|v| v as f64))
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "BOOL" | "BOOLEAN" => {
            row.try_get::<bool, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "UUID" => {
            row.try_get::<uuid::Uuid, _>(idx)
                .map(|u| serde_json::Value::from(u.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "JSON" | "JSONB" => {
            row.try_get::<serde_json::Value, _>(idx)
                .unwrap_or(serde_json::Value::Null)
        }
        "TIMESTAMPTZ" | "TIMESTAMP" => {
            row.try_get::<chrono::DateTime<chrono::Utc>, _>(idx)
                .map(|dt| serde_json::Value::from(dt.to_rfc3339()))
                .or_else(|_| {
                    row.try_get::<chrono::NaiveDateTime, _>(idx)
                        .map(|dt| serde_json::Value::from(dt.to_string()))
                })
                .unwrap_or(serde_json::Value::Null)
        }
        "DATE" => {
            row.try_get::<chrono::NaiveDate, _>(idx)
                .map(|d| serde_json::Value::from(d.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "TIME" | "TIMETZ" => {
            row.try_get::<chrono::NaiveTime, _>(idx)
                .map(|t| serde_json::Value::from(t.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "BYTEA" => {
            row.try_get::<Vec<u8>, _>(idx)
                .map(|bytes| serde_json::Value::from(format!("\\x{}", hex::encode(bytes))))
                .unwrap_or(serde_json::Value::Null)
        }
        _ => {
            // Default to string for text, varchar, char, etc.
            row.try_get::<String, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
    }
}

// MySQL row conversion
fn mysql_row_to_hashmap(row: &MySqlRow) -> HashMap<String, serde_json::Value> {
    let mut map = HashMap::new();
    for column in row.columns() {
        let name = column.name().to_string();
        let value = get_mysql_column_value(row, column);
        map.insert(name, value);
    }
    map
}

fn get_mysql_column_value(row: &MySqlRow, column: &sqlx::mysql::MySqlColumn) -> serde_json::Value {
    let type_name = column.type_info().name();
    let idx = column.ordinal();

    match type_name.to_uppercase().as_str() {
        "TINYINT" | "SMALLINT" | "MEDIUMINT" | "INT" | "BIGINT" => {
            row.try_get::<i64, _>(idx)
                .map(serde_json::Value::from)
                .or_else(|_| row.try_get::<i32, _>(idx).map(|v| serde_json::Value::from(v as i64)))
                .unwrap_or(serde_json::Value::Null)
        }
        "FLOAT" | "DOUBLE" | "DECIMAL" => {
            row.try_get::<f64, _>(idx)
                .or_else(|_| row.try_get::<f32, _>(idx).map(|v| v as f64))
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "BOOLEAN" | "BOOL" => {
            row.try_get::<bool, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
        "JSON" => {
            row.try_get::<serde_json::Value, _>(idx)
                .unwrap_or(serde_json::Value::Null)
        }
        "DATETIME" | "TIMESTAMP" => {
            row.try_get::<chrono::NaiveDateTime, _>(idx)
                .map(|dt| serde_json::Value::from(dt.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "DATE" => {
            row.try_get::<chrono::NaiveDate, _>(idx)
                .map(|d| serde_json::Value::from(d.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "TIME" => {
            row.try_get::<chrono::NaiveTime, _>(idx)
                .map(|t| serde_json::Value::from(t.to_string()))
                .unwrap_or(serde_json::Value::Null)
        }
        "BLOB" | "BINARY" | "VARBINARY" => {
            row.try_get::<Vec<u8>, _>(idx)
                .map(|bytes| serde_json::Value::from(format!("0x{}", hex::encode(bytes))))
                .unwrap_or(serde_json::Value::Null)
        }
        _ => {
            // Default to string for text, varchar, char, enum, etc.
            row.try_get::<String, _>(idx)
                .map(serde_json::Value::from)
                .unwrap_or(serde_json::Value::Null)
        }
    }
}

#[tauri::command]
pub async fn db_test_connection(config: ConnectionConfig) -> Result<bool, String> {
    match config.db_type.as_str() {
        "sqlite" => {
            let path = config.file_path.as_ref().ok_or("SQLite requires a file path")?;
            let url = format!("sqlite:{}", path);
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            pool.close().await;
            Ok(true)
        }
        "postgres" => {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(5432);
            let database = config.database.as_deref().unwrap_or("postgres");
            let username = config.username.as_deref().unwrap_or("postgres");
            let password = config.password.as_deref().unwrap_or("");
            let ssl_mode = if config.ssl.unwrap_or(false) { "require" } else { "prefer" };

            let url = format!(
                "postgres://{}:{}@{}:{}/{}?sslmode={}",
                username, password, host, port, database, ssl_mode
            );

            let pool = PgPoolOptions::new()
                .max_connections(1)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            pool.close().await;
            Ok(true)
        }
        "mysql" => {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(3306);
            let database = config.database.as_deref().unwrap_or("mysql");
            let username = config.username.as_deref().unwrap_or("root");
            let password = config.password.as_deref().unwrap_or("");

            let url = format!(
                "mysql://{}:{}@{}:{}/{}",
                username, password, host, port, database
            );

            let pool = MySqlPoolOptions::new()
                .max_connections(1)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            pool.close().await;
            Ok(true)
        }
        _ => Err(format!("Unsupported database type: {}", config.db_type)),
    }
}

#[tauri::command]
pub async fn db_connect(
    connection_id: String,
    config: ConnectionConfig,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<(), String> {
    let entry = match config.db_type.as_str() {
        "sqlite" => {
            let path = config.file_path.as_ref().ok_or("SQLite requires a file path")?;
            let url = format!("sqlite:{}", path);
            let pool = SqlitePoolOptions::new()
                .max_connections(5)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            ConnectionEntry {
                pool: DbPool::Sqlite(pool),
                db_type: "sqlite".to_string(),
            }
        }
        "postgres" => {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(5432);
            let database = config.database.as_deref().unwrap_or("postgres");
            let username = config.username.as_deref().unwrap_or("postgres");
            let password = config.password.as_deref().unwrap_or("");
            let ssl_mode = if config.ssl.unwrap_or(false) { "require" } else { "prefer" };

            let url = format!(
                "postgres://{}:{}@{}:{}/{}?sslmode={}",
                username, password, host, port, database, ssl_mode
            );

            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            ConnectionEntry {
                pool: DbPool::Postgres(pool),
                db_type: "postgres".to_string(),
            }
        }
        "mysql" => {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(3306);
            let database = config.database.as_deref().unwrap_or("mysql");
            let username = config.username.as_deref().unwrap_or("root");
            let password = config.password.as_deref().unwrap_or("");

            let url = format!(
                "mysql://{}:{}@{}:{}/{}",
                username, password, host, port, database
            );

            let pool = MySqlPoolOptions::new()
                .max_connections(5)
                .connect(&url)
                .await
                .map_err(|e| format!("Connection failed: {}", e))?;
            ConnectionEntry {
                pool: DbPool::MySql(pool),
                db_type: "mysql".to_string(),
            }
        }
        _ => return Err(format!("Unsupported database type: {}", config.db_type)),
    };

    let mut connections = manager.connections.write().await;
    connections.insert(connection_id, entry);
    Ok(())
}

#[tauri::command]
pub async fn db_disconnect(
    connection_id: String,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<(), String> {
    let mut connections = manager.connections.write().await;
    if let Some(entry) = connections.remove(&connection_id) {
        match entry.pool {
            DbPool::Sqlite(pool) => pool.close().await,
            DbPool::Postgres(pool) => pool.close().await,
            DbPool::MySql(pool) => pool.close().await,
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn db_list_tables(
    connection_id: String,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<Vec<TableInfo>, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let query = "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name";
            let rows = sqlx::query(query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let tables: Vec<TableInfo> = rows
                .iter()
                .map(|row| {
                    let name: String = row.try_get("name").unwrap_or_default();
                    let table_type: String = row.try_get("type").unwrap_or_else(|_| "table".to_string());
                    TableInfo {
                        name,
                        schema: Some("main".to_string()),
                        row_count: None,
                        table_type: if table_type == "view" { "view".to_string() } else { "table".to_string() },
                    }
                })
                .collect();
            Ok(tables)
        }
        DbPool::Postgres(pool) => {
            let query = r#"
                SELECT
                    table_name as name,
                    table_schema as schema,
                    CASE table_type
                        WHEN 'VIEW' THEN 'view'
                        ELSE 'table'
                    END as table_type
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            "#;
            let rows: Vec<PgRow> = sqlx::query(query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let tables: Vec<TableInfo> = rows
                .iter()
                .map(|row| {
                    let name: String = row.try_get("name").unwrap_or_default();
                    let schema: Option<String> = row.try_get("schema").ok();
                    let table_type: String = row.try_get("table_type").unwrap_or_else(|_| "table".to_string());
                    TableInfo {
                        name,
                        schema,
                        row_count: None,
                        table_type,
                    }
                })
                .collect();
            Ok(tables)
        }
        DbPool::MySql(pool) => {
            let query = r#"
                SELECT
                    TABLE_NAME as name,
                    TABLE_SCHEMA as `schema`,
                    CASE TABLE_TYPE
                        WHEN 'VIEW' THEN 'view'
                        ELSE 'table'
                    END as table_type
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                ORDER BY TABLE_SCHEMA, TABLE_NAME
            "#;
            let rows: Vec<MySqlRow> = sqlx::query(query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let tables: Vec<TableInfo> = rows
                .iter()
                .map(|row| {
                    let name: String = row.try_get("name").unwrap_or_default();
                    let schema: Option<String> = row.try_get("schema").ok();
                    let table_type: String = row.try_get("table_type").unwrap_or_else(|_| "table".to_string());
                    TableInfo {
                        name,
                        schema,
                        row_count: None,
                        table_type,
                    }
                })
                .collect();
            Ok(tables)
        }
    }
}

#[tauri::command]
pub async fn db_get_table_schema(
    connection_id: String,
    table_name: String,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<TableSchema, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let query = format!("PRAGMA table_info('{}')", table_name);
            let rows = sqlx::query(&query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let mut columns: Vec<ColumnInfo> = Vec::new();
            let mut primary_keys: Vec<String> = Vec::new();

            for row in &rows {
                let name: String = row.try_get("name").unwrap_or_default();
                let data_type: String = row.try_get("type").unwrap_or_default();
                let notnull: i32 = row.try_get("notnull").unwrap_or(0);
                let pk: i32 = row.try_get("pk").unwrap_or(0);
                let dflt_value: Option<String> = row.try_get("dflt_value").ok();

                if pk > 0 {
                    primary_keys.push(name.clone());
                }

                columns.push(ColumnInfo {
                    name,
                    data_type,
                    nullable: notnull == 0,
                    primary_key: pk > 0,
                    default_value: dflt_value,
                });
            }

            Ok(TableSchema {
                table_name,
                columns,
                primary_keys,
            })
        }
        DbPool::Postgres(pool) => {
            // Parse schema.table format if provided
            let (schema_name, tbl_name) = if table_name.contains('.') {
                let parts: Vec<&str> = table_name.splitn(2, '.').collect();
                (parts[0].to_string(), parts[1].to_string())
            } else {
                ("public".to_string(), table_name.clone())
            };

            // Get columns
            let column_query = r#"
                SELECT
                    c.column_name as name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = $1
                    AND tc.table_name = $2
                ) pk ON c.column_name = pk.column_name
                WHERE c.table_schema = $1 AND c.table_name = $2
                ORDER BY c.ordinal_position
            "#;

            let rows: Vec<PgRow> = sqlx::query(column_query)
                .bind(&schema_name)
                .bind(&tbl_name)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let mut columns: Vec<ColumnInfo> = Vec::new();
            let mut primary_keys: Vec<String> = Vec::new();

            for row in &rows {
                let name: String = row.try_get("name").unwrap_or_default();
                let data_type: String = row.try_get("data_type").unwrap_or_default();
                let is_nullable: String = row.try_get("is_nullable").unwrap_or_else(|_| "YES".to_string());
                let is_pk: bool = row.try_get("is_primary_key").unwrap_or(false);
                let default_value: Option<String> = row.try_get("column_default").ok();

                if is_pk {
                    primary_keys.push(name.clone());
                }

                columns.push(ColumnInfo {
                    name,
                    data_type,
                    nullable: is_nullable == "YES",
                    primary_key: is_pk,
                    default_value,
                });
            }

            Ok(TableSchema {
                table_name: tbl_name,
                columns,
                primary_keys,
            })
        }
        DbPool::MySql(pool) => {
            // Parse schema.table format if provided
            let (schema_name, tbl_name) = if table_name.contains('.') {
                let parts: Vec<&str> = table_name.splitn(2, '.').collect();
                (parts[0].to_string(), parts[1].to_string())
            } else {
                // For MySQL, we need to get the current database
                let db_row: MySqlRow = sqlx::query("SELECT DATABASE() as db")
                    .fetch_one(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;
                let current_db: String = db_row.try_get("db").unwrap_or_else(|_| "mysql".to_string());
                (current_db, table_name.clone())
            };

            // Get columns with primary key info
            let column_query = r#"
                SELECT
                    c.COLUMN_NAME as name,
                    c.DATA_TYPE as data_type,
                    c.IS_NULLABLE as is_nullable,
                    c.COLUMN_DEFAULT as column_default,
                    CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as is_primary_key
                FROM information_schema.COLUMNS c
                WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
                ORDER BY c.ORDINAL_POSITION
            "#;

            let rows: Vec<MySqlRow> = sqlx::query(column_query)
                .bind(&schema_name)
                .bind(&tbl_name)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Query failed: {}", e))?;

            let mut columns: Vec<ColumnInfo> = Vec::new();
            let mut primary_keys: Vec<String> = Vec::new();

            for row in &rows {
                let name: String = row.try_get("name").unwrap_or_default();
                let data_type: String = row.try_get("data_type").unwrap_or_default();
                let is_nullable: String = row.try_get("is_nullable").unwrap_or_else(|_| "YES".to_string());
                let is_pk: i32 = row.try_get("is_primary_key").unwrap_or(0);
                let default_value: Option<String> = row.try_get("column_default").ok();

                if is_pk == 1 {
                    primary_keys.push(name.clone());
                }

                columns.push(ColumnInfo {
                    name,
                    data_type,
                    nullable: is_nullable == "YES",
                    primary_key: is_pk == 1,
                    default_value,
                });
            }

            Ok(TableSchema {
                table_name: tbl_name,
                columns,
                primary_keys,
            })
        }
    }
}

#[tauri::command]
pub async fn db_execute_query(
    connection_id: String,
    query: String,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<QueryResult, String> {
    let start = Instant::now();
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    let query_upper = query.trim().to_uppercase();
    let is_select = query_upper.starts_with("SELECT")
        || query_upper.starts_with("WITH")
        || query_upper.starts_with("PRAGMA")
        || query_upper.starts_with("SHOW")
        || query_upper.starts_with("EXPLAIN");

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            if is_select {
                let rows = sqlx::query(&query)
                    .fetch_all(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                let columns: Vec<String> = if !rows.is_empty() {
                    rows[0].columns().iter().map(|c| c.name().to_string()).collect()
                } else {
                    vec![]
                };

                let data: Vec<HashMap<String, serde_json::Value>> =
                    rows.iter().map(sqlite_row_to_hashmap).collect();

                Ok(QueryResult {
                    columns,
                    rows: data,
                    rows_affected: rows.len() as u64,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            } else {
                let result = sqlx::query(&query)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    rows_affected: result.rows_affected(),
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
        }
        DbPool::Postgres(pool) => {
            if is_select {
                let rows: Vec<PgRow> = sqlx::query(&query)
                    .fetch_all(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                let columns: Vec<String> = if !rows.is_empty() {
                    rows[0].columns().iter().map(|c| c.name().to_string()).collect()
                } else {
                    vec![]
                };

                let data: Vec<HashMap<String, serde_json::Value>> =
                    rows.iter().map(pg_row_to_hashmap).collect();

                Ok(QueryResult {
                    columns,
                    rows: data,
                    rows_affected: rows.len() as u64,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            } else {
                let result = sqlx::query(&query)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    rows_affected: result.rows_affected(),
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
        }
        DbPool::MySql(pool) => {
            if is_select {
                let rows: Vec<MySqlRow> = sqlx::query(&query)
                    .fetch_all(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                let columns: Vec<String> = if !rows.is_empty() {
                    rows[0].columns().iter().map(|c| c.name().to_string()).collect()
                } else {
                    vec![]
                };

                let data: Vec<HashMap<String, serde_json::Value>> =
                    rows.iter().map(mysql_row_to_hashmap).collect();

                Ok(QueryResult {
                    columns,
                    rows: data,
                    rows_affected: rows.len() as u64,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            } else {
                let result = sqlx::query(&query)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Query failed: {}", e))?;

                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    rows_affected: result.rows_affected(),
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
        }
    }
}

#[tauri::command]
pub async fn db_fetch_rows(
    connection_id: String,
    table_name: String,
    limit: u32,
    offset: u32,
    filters: Option<Vec<Filter>>,
    sort: Option<SortConfig>,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<FetchResult, String> {
    let start = Instant::now();
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    let mut where_clause = String::new();
    if let Some(ref f) = filters {
        if !f.is_empty() {
            let conditions: Vec<String> = f
                .iter()
                .map(|filter| {
                    let op = match filter.operator.as_str() {
                        "eq" => "=",
                        "neq" => "!=",
                        "gt" => ">",
                        "gte" => ">=",
                        "lt" => "<",
                        "lte" => "<=",
                        "like" => "LIKE",
                        "ilike" => "ILIKE",
                        _ => "=",
                    };
                    format!("\"{}\" {} '{}'", filter.column, op, filter.value.replace('\'', "''"))
                })
                .collect();
            where_clause = format!(" WHERE {}", conditions.join(" AND "));
        }
    }

    let order_clause = sort
        .map(|s| {
            let dir = if s.direction.to_uppercase() == "DESC" { "DESC" } else { "ASC" };
            format!(" ORDER BY \"{}\" {}", s.column, dir)
        })
        .unwrap_or_default();

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let count_query = format!("SELECT COUNT(*) as count FROM \"{}\"{}",  table_name, where_clause);
            let count_row = sqlx::query(&count_query)
                .fetch_one(pool)
                .await
                .map_err(|e| format!("Count query failed: {}", e))?;
            let total_count: i64 = count_row.try_get("count").unwrap_or(0);

            let data_query = format!(
                "SELECT * FROM \"{}\"{}{}  LIMIT {} OFFSET {}",
                table_name, where_clause, order_clause, limit, offset
            );
            let rows = sqlx::query(&data_query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Data query failed: {}", e))?;

            let columns: Vec<String> = if !rows.is_empty() {
                rows[0].columns().iter().map(|c| c.name().to_string()).collect()
            } else {
                vec![]
            };

            let data: Vec<HashMap<String, serde_json::Value>> =
                rows.iter().map(sqlite_row_to_hashmap).collect();

            Ok(FetchResult {
                columns,
                rows: data,
                total_count,
                execution_time: start.elapsed().as_millis() as u64,
            })
        }
        DbPool::Postgres(pool) => {
            // Handle schema.table format
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("\"{}\"", table_name)
            };

            let count_query = format!("SELECT COUNT(*) as count FROM {}{}", full_table_name, where_clause);
            let count_row: PgRow = sqlx::query(&count_query)
                .fetch_one(pool)
                .await
                .map_err(|e| format!("Count query failed: {}", e))?;
            let total_count: i64 = count_row.try_get("count").unwrap_or(0);

            let data_query = format!(
                "SELECT * FROM {}{}{} LIMIT {} OFFSET {}",
                full_table_name, where_clause, order_clause, limit, offset
            );
            let rows: Vec<PgRow> = sqlx::query(&data_query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Data query failed: {}", e))?;

            let columns: Vec<String> = if !rows.is_empty() {
                rows[0].columns().iter().map(|c| c.name().to_string()).collect()
            } else {
                vec![]
            };

            let data: Vec<HashMap<String, serde_json::Value>> =
                rows.iter().map(pg_row_to_hashmap).collect();

            Ok(FetchResult {
                columns,
                rows: data,
                total_count,
                execution_time: start.elapsed().as_millis() as u64,
            })
        }
        DbPool::MySql(pool) => {
            // Handle schema.table format - MySQL uses backticks
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("`{}`", table_name)
            };

            // MySQL uses backticks instead of double quotes for identifiers
            let mysql_where_clause = where_clause.replace('"', "`");
            let mysql_order_clause = order_clause.replace('"', "`");

            let count_query = format!("SELECT COUNT(*) as count FROM {}{}", full_table_name, mysql_where_clause);
            let count_row: MySqlRow = sqlx::query(&count_query)
                .fetch_one(pool)
                .await
                .map_err(|e| format!("Count query failed: {}", e))?;
            let total_count: i64 = count_row.try_get("count").unwrap_or(0);

            let data_query = format!(
                "SELECT * FROM {}{}{} LIMIT {} OFFSET {}",
                full_table_name, mysql_where_clause, mysql_order_clause, limit, offset
            );
            let rows: Vec<MySqlRow> = sqlx::query(&data_query)
                .fetch_all(pool)
                .await
                .map_err(|e| format!("Data query failed: {}", e))?;

            let columns: Vec<String> = if !rows.is_empty() {
                rows[0].columns().iter().map(|c| c.name().to_string()).collect()
            } else {
                vec![]
            };

            let data: Vec<HashMap<String, serde_json::Value>> =
                rows.iter().map(mysql_row_to_hashmap).collect();

            Ok(FetchResult {
                columns,
                rows: data,
                total_count,
                execution_time: start.elapsed().as_millis() as u64,
            })
        }
    }
}

#[tauri::command]
pub async fn db_insert_row(
    connection_id: String,
    table_name: String,
    data: HashMap<String, serde_json::Value>,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<InsertResult, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    let columns: Vec<String> = data.keys().map(|k| format!("\"{}\"", k)).collect();
    let values: Vec<String> = data
        .values()
        .map(|v| match v {
            serde_json::Value::Null => "NULL".to_string(),
            serde_json::Value::Bool(b) => if *b { "true".to_string() } else { "false".to_string() },
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
            _ => format!("'{}'", v.to_string().replace('\'', "''")),
        })
        .collect();

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let query = format!(
                "INSERT INTO \"{}\" ({}) VALUES ({})",
                table_name,
                columns.join(", "),
                values.join(", ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Insert failed: {}", e))?;

            Ok(InsertResult {
                success: true,
                last_insert_id: Some(result.last_insert_rowid()),
            })
        }
        DbPool::Postgres(pool) => {
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("\"{}\"", table_name)
            };

            let query = format!(
                "INSERT INTO {} ({}) VALUES ({})",
                full_table_name,
                columns.join(", "),
                values.join(", ")
            );
            sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Insert failed: {}", e))?;

            Ok(InsertResult {
                success: true,
                last_insert_id: None,
            })
        }
        DbPool::MySql(pool) => {
            // MySQL uses backticks for identifiers
            let mysql_columns: Vec<String> = data.keys().map(|k| format!("`{}`", k)).collect();
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("`{}`", table_name)
            };

            let query = format!(
                "INSERT INTO {} ({}) VALUES ({})",
                full_table_name,
                mysql_columns.join(", "),
                values.join(", ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Insert failed: {}", e))?;

            Ok(InsertResult {
                success: true,
                last_insert_id: Some(result.last_insert_id() as i64),
            })
        }
    }
}

#[tauri::command]
pub async fn db_update_row(
    connection_id: String,
    table_name: String,
    primary_key: HashMap<String, serde_json::Value>,
    data: HashMap<String, serde_json::Value>,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<u64, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    let set_clause: Vec<String> = data
        .iter()
        .map(|(k, v)| {
            let value = match v {
                serde_json::Value::Null => "NULL".to_string(),
                serde_json::Value::Bool(b) => if *b { "true".to_string() } else { "false".to_string() },
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                _ => format!("'{}'", v.to_string().replace('\'', "''")),
            };
            format!("\"{}\" = {}", k, value)
        })
        .collect();

    let where_clause: Vec<String> = primary_key
        .iter()
        .map(|(k, v)| {
            let value = match v {
                serde_json::Value::Null => "NULL".to_string(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                _ => format!("'{}'", v.to_string().replace('\'', "''")),
            };
            format!("\"{}\" = {}", k, value)
        })
        .collect();

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let query = format!(
                "UPDATE \"{}\" SET {} WHERE {}",
                table_name,
                set_clause.join(", "),
                where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Update failed: {}", e))?;
            Ok(result.rows_affected())
        }
        DbPool::Postgres(pool) => {
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("\"{}\"", table_name)
            };

            let query = format!(
                "UPDATE {} SET {} WHERE {}",
                full_table_name,
                set_clause.join(", "),
                where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Update failed: {}", e))?;
            Ok(result.rows_affected())
        }
        DbPool::MySql(pool) => {
            // MySQL uses backticks for identifiers
            let mysql_set_clause: Vec<String> = data
                .iter()
                .map(|(k, v)| {
                    let value = match v {
                        serde_json::Value::Null => "NULL".to_string(),
                        serde_json::Value::Bool(b) => if *b { "true".to_string() } else { "false".to_string() },
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                        _ => format!("'{}'", v.to_string().replace('\'', "''")),
                    };
                    format!("`{}` = {}", k, value)
                })
                .collect();

            let mysql_where_clause: Vec<String> = primary_key
                .iter()
                .map(|(k, v)| {
                    let value = match v {
                        serde_json::Value::Null => "NULL".to_string(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                        _ => format!("'{}'", v.to_string().replace('\'', "''")),
                    };
                    format!("`{}` = {}", k, value)
                })
                .collect();

            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("`{}`", table_name)
            };

            let query = format!(
                "UPDATE {} SET {} WHERE {}",
                full_table_name,
                mysql_set_clause.join(", "),
                mysql_where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Update failed: {}", e))?;
            Ok(result.rows_affected())
        }
    }
}

#[tauri::command]
pub async fn db_delete_row(
    connection_id: String,
    table_name: String,
    primary_key: HashMap<String, serde_json::Value>,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<u64, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    let where_clause: Vec<String> = primary_key
        .iter()
        .map(|(k, v)| {
            let value = match v {
                serde_json::Value::Null => "NULL".to_string(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                _ => format!("'{}'", v.to_string().replace('\'', "''")),
            };
            format!("\"{}\" = {}", k, value)
        })
        .collect();

    match &entry.pool {
        DbPool::Sqlite(pool) => {
            let query = format!(
                "DELETE FROM \"{}\" WHERE {}",
                table_name,
                where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Delete failed: {}", e))?;
            Ok(result.rows_affected())
        }
        DbPool::Postgres(pool) => {
            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("\"{}\"", table_name)
            };

            let query = format!(
                "DELETE FROM {} WHERE {}",
                full_table_name,
                where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Delete failed: {}", e))?;
            Ok(result.rows_affected())
        }
        DbPool::MySql(pool) => {
            // MySQL uses backticks for identifiers
            let mysql_where_clause: Vec<String> = primary_key
                .iter()
                .map(|(k, v)| {
                    let value = match v {
                        serde_json::Value::Null => "NULL".to_string(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                        _ => format!("'{}'", v.to_string().replace('\'', "''")),
                    };
                    format!("`{}` = {}", k, value)
                })
                .collect();

            let full_table_name = if table_name.contains('.') {
                table_name.clone()
            } else {
                format!("`{}`", table_name)
            };

            let query = format!(
                "DELETE FROM {} WHERE {}",
                full_table_name,
                mysql_where_clause.join(" AND ")
            );
            let result = sqlx::query(&query)
                .execute(pool)
                .await
                .map_err(|e| format!("Delete failed: {}", e))?;
            Ok(result.rows_affected())
        }
    }
}

#[tauri::command]
pub async fn db_detect_services() -> Result<Vec<DetectedService>, String> {
    let mut services = Vec::new();

    if let Some(pg_service) = detect_postgres().await {
        services.push(pg_service);
    }

    if let Some(mysql_service) = detect_mysql().await {
        services.push(mysql_service);
    }

    Ok(services)
}

async fn detect_postgres() -> Option<DetectedService> {
    let output = Command::new("pgrep")
        .args(["-f", "postgres"])
        .output()
        .ok()?;

    let pid = if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout);
        pid_str.lines().next()?.trim().parse::<u32>().ok()
    } else {
        None
    };

    let port_check = Command::new("lsof")
        .args(["-i", ":5432", "-sTCP:LISTEN"])
        .output()
        .ok()?;

    let running = port_check.status.success() && !port_check.stdout.is_empty();

    if !running && pid.is_none() {
        return None;
    }

    Some(DetectedService {
        service_type: "postgres".to_string(),
        host: "localhost".to_string(),
        port: 5432,
        running,
        pid,
        databases: vec![],
    })
}

async fn detect_mysql() -> Option<DetectedService> {
    let output = Command::new("pgrep")
        .args(["-f", "mysqld"])
        .output()
        .ok()?;

    let pid = if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout);
        pid_str.lines().next()?.trim().parse::<u32>().ok()
    } else {
        None
    };

    let port_check = Command::new("lsof")
        .args(["-i", ":3306", "-sTCP:LISTEN"])
        .output()
        .ok()?;

    let running = port_check.status.success() && !port_check.stdout.is_empty();

    if !running && pid.is_none() {
        return None;
    }

    Some(DetectedService {
        service_type: "mysql".to_string(),
        host: "localhost".to_string(),
        port: 3306,
        running,
        pid,
        databases: vec![],
    })
}

#[tauri::command]
pub async fn db_get_relationships(
    connection_id: String,
    manager: tauri::State<'_, std::sync::Arc<DatabaseManager>>,
) -> Result<RelationshipGraph, String> {
    let connections = manager.connections.read().await;
    let entry = connections.get(&connection_id).ok_or("Connection not found")?;

    match &entry.pool {
        DbPool::Sqlite(pool) => get_sqlite_relationships(pool).await,
        DbPool::Postgres(pool) => get_postgres_relationships(pool).await,
        DbPool::MySql(pool) => get_mysql_relationships(pool).await,
    }
}

async fn get_sqlite_relationships(pool: &SqlitePool) -> Result<RelationshipGraph, String> {
    // Get all tables first
    let tables_query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    let table_rows = sqlx::query(tables_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut all_fk_info: Vec<ForeignKeyInfo> = Vec::new();
    let mut table_relationships: Vec<TableRelationships> = Vec::new();

    for table_row in &table_rows {
        let table_name: String = table_row.try_get("name").unwrap_or_default();

        // Get column count
        let col_query = format!("PRAGMA table_info('{}')", table_name);
        let col_rows = sqlx::query(&col_query)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Column query failed: {}", e))?;
        let column_count = col_rows.len() as i64;

        // Get foreign keys for this table
        let fk_query = format!("PRAGMA foreign_key_list('{}')", table_name);
        let fk_rows = sqlx::query(&fk_query)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("FK query failed: {}", e))?;

        let mut foreign_keys_out: Vec<ForeignKeyInfo> = Vec::new();
        for fk_row in &fk_rows {
            let target_table: String = fk_row.try_get("table").unwrap_or_default();
            let source_column: String = fk_row.try_get("from").unwrap_or_default();
            let target_column: String = fk_row.try_get("to").unwrap_or_default();
            let id: i64 = fk_row.try_get("id").unwrap_or(0);

            let fk_info = ForeignKeyInfo {
                constraint_name: format!("fk_{}_{}", table_name, id),
                source_table: table_name.clone(),
                source_column,
                target_table,
                target_column,
            };
            foreign_keys_out.push(fk_info.clone());
            all_fk_info.push(fk_info);
        }

        table_relationships.push(TableRelationships {
            table_name,
            schema: Some("main".to_string()),
            column_count,
            foreign_keys_out,
            foreign_keys_in: Vec::new(),
            complexity_score: 0.0,
        });
    }

    // Calculate inbound foreign keys and complexity scores
    for table_rel in &mut table_relationships {
        table_rel.foreign_keys_in = all_fk_info
            .iter()
            .filter(|fk| fk.target_table == table_rel.table_name)
            .cloned()
            .collect();

        let in_count = table_rel.foreign_keys_in.len() as f64;
        let out_count = table_rel.foreign_keys_out.len() as f64;
        let col_factor = (table_rel.column_count as f64).ln_1p();
        table_rel.complexity_score = (in_count + out_count) * (1.0 + col_factor * 0.1);
    }

    // Build edges
    let mut edges: Vec<RelationshipEdge> = Vec::new();
    let mut edge_map: HashMap<(String, String), Vec<ColumnPair>> = HashMap::new();

    for fk in &all_fk_info {
        let key = (fk.source_table.clone(), fk.target_table.clone());
        edge_map.entry(key).or_default().push(ColumnPair {
            source: fk.source_column.clone(),
            target: fk.target_column.clone(),
        });
    }

    for ((from, to), columns) in edge_map {
        edges.push(RelationshipEdge { from, to, columns });
    }

    Ok(RelationshipGraph {
        tables: table_relationships,
        edges,
    })
}

async fn get_postgres_relationships(pool: &PgPool) -> Result<RelationshipGraph, String> {
    // Get all tables with column counts
    let tables_query = r#"
        SELECT
            t.table_name,
            t.table_schema,
            (SELECT COUNT(*) FROM information_schema.columns c
             WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) as column_count
        FROM information_schema.tables t
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name
    "#;

    let table_rows: Vec<PgRow> = sqlx::query(tables_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    // Get all foreign keys
    let fk_query = r#"
        SELECT
            tc.constraint_name,
            tc.table_schema as source_schema,
            tc.table_name as source_table,
            kcu.column_name as source_column,
            ccu.table_schema as target_schema,
            ccu.table_name as target_table,
            ccu.column_name as target_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    "#;

    let fk_rows: Vec<PgRow> = sqlx::query(fk_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("FK query failed: {}", e))?;

    let all_fk_info: Vec<ForeignKeyInfo> = fk_rows
        .iter()
        .map(|row| {
            let source_schema: String = row.try_get("source_schema").unwrap_or_default();
            let source_table: String = row.try_get("source_table").unwrap_or_default();
            let target_schema: String = row.try_get("target_schema").unwrap_or_default();
            let target_table: String = row.try_get("target_table").unwrap_or_default();

            ForeignKeyInfo {
                constraint_name: row.try_get("constraint_name").unwrap_or_default(),
                source_table: format!("{}.{}", source_schema, source_table),
                source_column: row.try_get("source_column").unwrap_or_default(),
                target_table: format!("{}.{}", target_schema, target_table),
                target_column: row.try_get("target_column").unwrap_or_default(),
            }
        })
        .collect();

    let table_relationships: Vec<TableRelationships> = table_rows
        .iter()
        .map(|row| {
            let table_name: String = row.try_get("table_name").unwrap_or_default();
            let schema: String = row.try_get("table_schema").unwrap_or_else(|_| "public".to_string());
            let column_count: i64 = row.try_get("column_count").unwrap_or(0);
            let full_name = format!("{}.{}", schema, table_name);

            let foreign_keys_out: Vec<ForeignKeyInfo> = all_fk_info
                .iter()
                .filter(|fk| fk.source_table == full_name)
                .cloned()
                .collect();

            let foreign_keys_in: Vec<ForeignKeyInfo> = all_fk_info
                .iter()
                .filter(|fk| fk.target_table == full_name)
                .cloned()
                .collect();

            let in_count = foreign_keys_in.len() as f64;
            let out_count = foreign_keys_out.len() as f64;
            let col_factor = (column_count as f64).ln_1p();
            let complexity_score = (in_count + out_count) * (1.0 + col_factor * 0.1);

            TableRelationships {
                table_name: full_name,
                schema: Some(schema),
                column_count,
                foreign_keys_out,
                foreign_keys_in,
                complexity_score,
            }
        })
        .collect();

    // Build edges
    let mut edge_map: HashMap<(String, String), Vec<ColumnPair>> = HashMap::new();
    for fk in &all_fk_info {
        let key = (fk.source_table.clone(), fk.target_table.clone());
        edge_map.entry(key).or_default().push(ColumnPair {
            source: fk.source_column.clone(),
            target: fk.target_column.clone(),
        });
    }

    let edges: Vec<RelationshipEdge> = edge_map
        .into_iter()
        .map(|((from, to), columns)| RelationshipEdge { from, to, columns })
        .collect();

    Ok(RelationshipGraph {
        tables: table_relationships,
        edges,
    })
}

async fn get_mysql_relationships(pool: &MySqlPool) -> Result<RelationshipGraph, String> {
    // Get current database
    let db_row: MySqlRow = sqlx::query("SELECT DATABASE() as db")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;
    let current_db: String = db_row.try_get("db").unwrap_or_else(|_| "mysql".to_string());

    // Get all tables with column counts
    let tables_query = r#"
        SELECT
            TABLE_NAME as table_name,
            TABLE_SCHEMA as table_schema,
            (SELECT COUNT(*) FROM information_schema.COLUMNS c
             WHERE c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA) as column_count
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = ?
        AND t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_NAME
    "#;

    let table_rows: Vec<MySqlRow> = sqlx::query(tables_query)
        .bind(&current_db)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Query failed: {}", e))?;

    // Get all foreign keys
    let fk_query = r#"
        SELECT
            CONSTRAINT_NAME as constraint_name,
            TABLE_SCHEMA as source_schema,
            TABLE_NAME as source_table,
            COLUMN_NAME as source_column,
            REFERENCED_TABLE_SCHEMA as target_schema,
            REFERENCED_TABLE_NAME as target_table,
            REFERENCED_COLUMN_NAME as target_column
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME IS NOT NULL
        AND TABLE_SCHEMA = ?
    "#;

    let fk_rows: Vec<MySqlRow> = sqlx::query(fk_query)
        .bind(&current_db)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("FK query failed: {}", e))?;

    let all_fk_info: Vec<ForeignKeyInfo> = fk_rows
        .iter()
        .map(|row| ForeignKeyInfo {
            constraint_name: row.try_get("constraint_name").unwrap_or_default(),
            source_table: row.try_get("source_table").unwrap_or_default(),
            source_column: row.try_get("source_column").unwrap_or_default(),
            target_table: row.try_get("target_table").unwrap_or_default(),
            target_column: row.try_get("target_column").unwrap_or_default(),
        })
        .collect();

    let table_relationships: Vec<TableRelationships> = table_rows
        .iter()
        .map(|row| {
            let table_name: String = row.try_get("table_name").unwrap_or_default();
            let schema: String = row.try_get("table_schema").unwrap_or_default();
            let column_count: i64 = row.try_get("column_count").unwrap_or(0);

            let foreign_keys_out: Vec<ForeignKeyInfo> = all_fk_info
                .iter()
                .filter(|fk| fk.source_table == table_name)
                .cloned()
                .collect();

            let foreign_keys_in: Vec<ForeignKeyInfo> = all_fk_info
                .iter()
                .filter(|fk| fk.target_table == table_name)
                .cloned()
                .collect();

            let in_count = foreign_keys_in.len() as f64;
            let out_count = foreign_keys_out.len() as f64;
            let col_factor = (column_count as f64).ln_1p();
            let complexity_score = (in_count + out_count) * (1.0 + col_factor * 0.1);

            TableRelationships {
                table_name,
                schema: Some(schema),
                column_count,
                foreign_keys_out,
                foreign_keys_in,
                complexity_score,
            }
        })
        .collect();

    // Build edges
    let mut edge_map: HashMap<(String, String), Vec<ColumnPair>> = HashMap::new();
    for fk in &all_fk_info {
        let key = (fk.source_table.clone(), fk.target_table.clone());
        edge_map.entry(key).or_default().push(ColumnPair {
            source: fk.source_column.clone(),
            target: fk.target_column.clone(),
        });
    }

    let edges: Vec<RelationshipEdge> = edge_map
        .into_iter()
        .map(|((from, to), columns)| RelationshipEdge { from, to, columns })
        .collect();

    Ok(RelationshipGraph {
        tables: table_relationships,
        edges,
    })
}

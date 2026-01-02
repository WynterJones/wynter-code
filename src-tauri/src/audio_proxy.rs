use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager};
use tiny_http::{Header, Response, Server};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioProxyInfo {
    pub port: u16,
    pub base_url: String,
}

pub struct AudioProxyManager {
    server_handle: Mutex<Option<thread::JoinHandle<()>>>,
    port: Mutex<Option<u16>>,
    running: Mutex<bool>,
}

impl AudioProxyManager {
    pub fn new() -> Self {
        Self {
            server_handle: Mutex::new(None),
            port: Mutex::new(None),
            running: Mutex::new(false),
        }
    }
}

fn find_available_port() -> Option<u16> {
    for port in 19000..19100 {
        if std::net::TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

#[tauri::command]
pub async fn start_audio_proxy(app: AppHandle) -> Result<AudioProxyInfo, String> {
    let manager = app.state::<Arc<AudioProxyManager>>();

    {
        let running = manager.running.lock().map_err(|e| e.to_string())?;
        if *running {
            let port = manager.port.lock().map_err(|e| e.to_string())?;
            if let Some(p) = *port {
                return Ok(AudioProxyInfo {
                    port: p,
                    base_url: format!("http://127.0.0.1:{}", p),
                });
            }
        }
    }

    let port = find_available_port().ok_or("No available port found")?;

    let server = Server::http(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("Failed to start audio proxy server: {}", e))?;

    {
        let mut running = manager.running.lock().map_err(|e| e.to_string())?;
        *running = true;
        let mut port_guard = manager.port.lock().map_err(|e| e.to_string())?;
        *port_guard = Some(port);
    }

    let manager_clone = Arc::clone(&manager);

    let handle = thread::spawn(move || {
        for request in server.incoming_requests() {
            {
                let running = manager_clone.running.lock().expect("AudioProxyManager running mutex poisoned");
                if !*running {
                    break;
                }
            }

            let url = request.url().to_string();

            if url.starts_with("/stream") {
                if let Some(query) = url.split('?').nth(1) {
                    let params: HashMap<_, _> = query
                        .split('&')
                        .filter_map(|p| {
                            let mut split = p.splitn(2, '=');
                            Some((split.next()?, split.next()?))
                        })
                        .collect();

                    if let Some(encoded_url) = params.get("url") {
                        if let Ok(stream_url) = urlencoding::decode(encoded_url) {
                            let stream_url = stream_url.to_string();

                            // Spawn a thread to handle streaming
                            let _ = thread::spawn(move || {
                                if let Err(e) = stream_audio_sync(&stream_url, request) {
                                    eprintln!("Audio proxy error: {}", e);
                                }
                            });
                            continue;
                        }
                    }
                }

                let response = Response::from_string("Missing or invalid 'url' parameter")
                    .with_status_code(400);
                let _ = request.respond(response);
            } else if url == "/health" {
                let response = Response::from_string("OK")
                    .with_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap());
                let _ = request.respond(response);
            } else {
                let response = Response::from_string("Not found").with_status_code(404);
                let _ = request.respond(response);
            }
        }
    });

    {
        let mut server_handle = manager.server_handle.lock().map_err(|e| e.to_string())?;
        *server_handle = Some(handle);
    }

    Ok(AudioProxyInfo {
        port,
        base_url: format!("http://127.0.0.1:{}", port),
    })
}

fn stream_audio_sync(url: &str, request: tiny_http::Request) -> Result<(), String> {
    // Parse URL to get host and path
    let url_parsed = url::Url::parse(url).map_err(|e| e.to_string())?;
    let host = url_parsed.host_str().ok_or("No host in URL")?;
    let port = url_parsed.port().unwrap_or(if url_parsed.scheme() == "https" { 443 } else { 80 });
    let path = if url_parsed.query().is_some() {
        format!("{}?{}", url_parsed.path(), url_parsed.query().unwrap())
    } else {
        url_parsed.path().to_string()
    };

    // For HTTPS, we need to use a TLS connection
    let is_https = url_parsed.scheme() == "https";

    // Build HTTP request
    let http_request = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nUser-Agent: WynterCode/1.0\r\nAccept: */*\r\nConnection: keep-alive\r\nIcy-MetaData: 0\r\n\r\n",
        path, host
    );

    // Connect and send request
    let addr = format!("{}:{}", host, port);

    if is_https {
        // Use native-tls for HTTPS
        let connector = native_tls::TlsConnector::new().map_err(|e| e.to_string())?;
        let stream = TcpStream::connect(&addr).map_err(|e| e.to_string())?;
        let mut tls_stream = connector.connect(host, stream).map_err(|e| e.to_string())?;

        tls_stream.write_all(http_request.as_bytes()).map_err(|e| e.to_string())?;

        // Read and skip HTTP headers
        let mut header_buf = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            tls_stream.read_exact(&mut byte).map_err(|e| e.to_string())?;
            header_buf.push(byte[0]);
            if header_buf.len() >= 4 && &header_buf[header_buf.len()-4..] == b"\r\n\r\n" {
                break;
            }
            if header_buf.len() > 8192 {
                return Err("Header too large".to_string());
            }
        }

        // Create streaming response with CORS headers
        let reader = StreamingReader::new_tls(tls_stream);
        let response = Response::new(
            tiny_http::StatusCode(200),
            vec![
                Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                Header::from_bytes("Content-Type", "audio/mpeg").unwrap(),
                Header::from_bytes("Cache-Control", "no-cache").unwrap(),
                Header::from_bytes("Connection", "keep-alive").unwrap(),
            ],
            reader,
            None,
            None,
        );

        request.respond(response).map_err(|e| e.to_string())?;
    } else {
        let mut stream = TcpStream::connect(&addr).map_err(|e| e.to_string())?;
        stream.write_all(http_request.as_bytes()).map_err(|e| e.to_string())?;

        // Read and skip HTTP headers
        let mut header_buf = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            stream.read_exact(&mut byte).map_err(|e| e.to_string())?;
            header_buf.push(byte[0]);
            if header_buf.len() >= 4 && &header_buf[header_buf.len()-4..] == b"\r\n\r\n" {
                break;
            }
            if header_buf.len() > 8192 {
                return Err("Header too large".to_string());
            }
        }

        let reader = StreamingReader::new_tcp(stream);
        let response = Response::new(
            tiny_http::StatusCode(200),
            vec![
                Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                Header::from_bytes("Content-Type", "audio/mpeg").unwrap(),
                Header::from_bytes("Cache-Control", "no-cache").unwrap(),
                Header::from_bytes("Connection", "keep-alive").unwrap(),
            ],
            reader,
            None,
            None,
        );

        request.respond(response).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Wrapper to implement Read for both TLS and TCP streams
enum StreamingReader {
    Tcp(TcpStream),
    Tls(native_tls::TlsStream<TcpStream>),
}

impl StreamingReader {
    fn new_tcp(stream: TcpStream) -> Self {
        StreamingReader::Tcp(stream)
    }

    fn new_tls(stream: native_tls::TlsStream<TcpStream>) -> Self {
        StreamingReader::Tls(stream)
    }
}

impl Read for StreamingReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match self {
            StreamingReader::Tcp(s) => s.read(buf),
            StreamingReader::Tls(s) => s.read(buf),
        }
    }
}

#[tauri::command]
pub async fn stop_audio_proxy(app: AppHandle) -> Result<(), String> {
    let manager = app.state::<Arc<AudioProxyManager>>();

    {
        let mut running = manager.running.lock().map_err(|e| e.to_string())?;
        *running = false;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_audio_proxy_url(app: AppHandle, stream_url: String) -> Result<String, String> {
    let _manager = app.state::<Arc<AudioProxyManager>>();

    // Start proxy if not running
    let info = start_audio_proxy(app.clone()).await?;

    // Return proxied URL
    let encoded = urlencoding::encode(&stream_url);
    Ok(format!("{}/stream?url={}", info.base_url, encoded))
}

#[tauri::command]
pub fn is_audio_proxy_running(app: AppHandle) -> bool {
    let manager = app.state::<Arc<AudioProxyManager>>();
    let result = manager.running.lock().map(|r| *r).unwrap_or(false);
    result
}

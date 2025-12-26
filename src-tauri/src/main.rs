#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api_tester;
mod audio_proxy;
mod auto_build;
mod beads;
mod claude_process;
mod color_picker;
mod commands;
mod cost_popup;
mod database_viewer;
mod domain_tools;
mod live_preview;
mod overwatch;
mod storybook;
mod terminal;
mod tunnel;
mod watcher;
mod webcam_window;
mod gif_capture;
mod netlify_backup;

use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

fn create_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "Wynter Code")
        .item(&PredefinedMenuItem::about(app, Some("About Wynter Code"), None)?)
        .separator()
        .item(&MenuItemBuilder::with_id("settings", "Settings...")
            .accelerator("CmdOrCtrl+,")
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Hide Wynter Code"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("Hide Others"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("Show All"))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Quit Wynter Code"))?)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("new_project", "New Project")
            .accelerator("CmdOrCtrl+N")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("open_project", "Open Project...")
            .accelerator("CmdOrCtrl+O")
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Close Window"))?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
            .accelerator("CmdOrCtrl+B")
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, Some("Toggle Full Screen"))?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, Some("Zoom"))?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("documentation", "Documentation")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("release_notes", "Release Notes")
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("report_issue", "Report Issue")
            .build(app)?)
        .build()?;

    Menu::with_items(app, &[
        &app_menu,
        &file_menu,
        &edit_menu,
        &view_menu,
        &window_menu,
        &help_menu,
    ])
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:wyntercode.db", commands::get_migrations())
                .build(),
        )
        .setup(|app| {
            let menu = create_menu(app.handle())?;
            app.set_menu(menu)?;

            // Setup system tray for color picker
            let tray_menu = MenuBuilder::new(app)
                .item(&MenuItemBuilder::with_id("pick_color", "Pick Color").build(app)?)
                .item(&MenuItemBuilder::with_id("show_picker", "Show Color Picker").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("tray_quit", "Quit").build(app)?)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(Image::from_path("icons/icon.png").unwrap_or_else(|_| {
                    app.default_window_icon().cloned().unwrap()
                }))
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "pick_color" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = color_picker::start_color_picking_mode(app_handle).await;
                            });
                        }
                        "show_picker" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = color_picker::open_color_picker_window(app_handle, None).await;
                            });
                        }
                        "tray_quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        // Left click on tray icon triggers color pick magnifier
                        let app_handle = tray.app_handle().clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = color_picker::start_color_picking_mode(app_handle).await;
                        });
                    }
                })
                .build(app)?;

            // Handle menu events
            app.on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "settings");
                        }
                    }
                    "new_project" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "new_project");
                        }
                    }
                    "open_project" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "open_project");
                        }
                    }
                    "toggle_sidebar" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("menu-event", "toggle_sidebar");
                        }
                    }
                    "documentation" => {
                        let _ = open::that("https://github.com/WynterJones/wynter-code");
                    }
                    "release_notes" => {
                        let _ = open::that("https://github.com/WynterJones/wynter-code/releases");
                    }
                    "report_issue" => {
                        let _ = open::that("https://github.com/WynterJones/wynter-code/issues");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .manage(Arc::new(terminal::PtyManager::new()))
        .manage(Arc::new(tunnel::TunnelManager::new()))
        .manage(Arc::new(watcher::FileWatcherManager::new()))
        .manage(Arc::new(live_preview::PreviewManager::new()))
        .manage(Arc::new(api_tester::WebhookManager::new()))
        .manage(Arc::new(storybook::StorybookManager::new()))
        .manage(Arc::new(database_viewer::DatabaseManager::new()))
        .manage(Arc::new(claude_process::ClaudeProcessManager::new()))
        .manage(Arc::new(audio_proxy::AudioProxyManager::new()))
        .invoke_handler(tauri::generate_handler![
            commands::get_file_tree,
            commands::read_file_content,
            commands::read_file_base64,
            commands::write_file_content,
            commands::find_markdown_files,
            commands::search::grep_project,
            commands::search::replace_in_files,
            commands::get_node_modules,
            commands::check_outdated_packages,
            commands::npm_search,
            commands::npm_install,
            commands::npm_uninstall,
            commands::run_claude,
            commands::run_claude_streaming,
            commands::run_git,
            commands::create_file,
            commands::create_folder,
            commands::rename_item,
            commands::delete_to_trash,
            commands::move_item,
            commands::get_home_dir,
            commands::scan_music_folder,
            commands::get_git_status,
            commands::check_node_modules_exists,
            commands::get_directory_stats,
            commands::check_system_requirements,
            commands::get_system_resources,
            commands::get_claude_files,
            commands::write_claude_file,
            commands::delete_claude_file,
            commands::get_claude_settings,
            commands::write_claude_settings,
            commands::get_claude_version,
            commands::check_claude_update,
            commands::create_claude_file,
            commands::list_listening_ports,
            commands::kill_process,
            commands::list_background_services,
            commands::scan_node_modules,
            commands::delete_node_modules,
            commands::list_env_files,
            commands::read_env_file,
            commands::write_env_file,
            commands::create_env_file,
            commands::check_env_gitignore,
            commands::get_system_env_vars,
            commands::create_zip_archive,
            commands::optimize_image,
            commands::optimize_pdf,
            commands::optimize_video,
            commands::check_ffmpeg_available,
            terminal::create_pty,
            terminal::write_pty,
            terminal::resize_pty,
            terminal::close_pty,
            terminal::is_pty_active,
            watcher::start_file_watcher,
            watcher::stop_file_watcher,
            tunnel::check_cloudflared_installed,
            tunnel::start_tunnel,
            tunnel::stop_tunnel,
            tunnel::list_tunnels,
            color_picker::pick_screen_color,
            color_picker::open_color_picker_window,
            color_picker::close_color_picker_window,
            color_picker::get_cursor_position,
            color_picker::pick_color_and_show,
            color_picker::check_screen_recording_permission,
            color_picker::request_screen_recording_permission,
            color_picker::save_color_picker_position,
            color_picker::capture_magnifier_region,
            color_picker::start_color_picking_mode,
            color_picker::stop_color_picking_mode,
            color_picker::update_magnifier_position,
            live_preview::detect_project_type,
            live_preview::get_local_ip,
            live_preview::start_preview_server,
            live_preview::stop_preview_server,
            live_preview::list_preview_servers,
            api_tester::send_http_request,
            api_tester::start_webhook_server,
            api_tester::stop_webhook_server,
            api_tester::list_webhook_servers,
            storybook::start_storybook_server,
            storybook::stop_storybook_server,
            database_viewer::db_test_connection,
            database_viewer::db_connect,
            database_viewer::db_disconnect,
            database_viewer::db_list_tables,
            database_viewer::db_get_table_schema,
            database_viewer::db_execute_query,
            database_viewer::db_fetch_rows,
            database_viewer::db_insert_row,
            database_viewer::db_update_row,
            database_viewer::db_delete_row,
            database_viewer::db_detect_services,
            overwatch::overwatch_railway_status,
            overwatch::overwatch_plausible_stats,
            overwatch::overwatch_netlify_status,
            overwatch::overwatch_sentry_stats,
            beads::beads_has_init,
            beads::beads_list,
            beads::beads_stats,
            beads::beads_create,
            beads::beads_update,
            beads::beads_close,
            beads::beads_reopen,
            beads::beads_show,
            // Auto Build
            auto_build::auto_build_save_session,
            auto_build::auto_build_load_session,
            auto_build::auto_build_clear_session,
            auto_build::auto_build_run_claude,
            auto_build::auto_build_run_verification,
            auto_build::auto_build_commit,
            // MCP Server Management
            commands::get_mcp_servers,
            commands::save_mcp_server,
            commands::delete_mcp_server,
            commands::toggle_mcp_server,
            commands::validate_mcp_command,
            // Claude Code Stats
            commands::read_claude_stats,
            // Claude Process Management
            claude_process::start_claude_session,
            claude_process::stop_claude_session,
            claude_process::start_claude_streaming,
            claude_process::send_claude_input,
            claude_process::send_claude_raw_input,
            claude_process::terminate_claude_session,
            claude_process::is_claude_session_active,
            claude_process::list_active_claude_sessions,
            // Webcam Window Management
            webcam_window::create_floating_webcam_window,
            webcam_window::close_floating_webcam_window,
            webcam_window::update_floating_webcam_position,
            webcam_window::update_floating_webcam_size,
            webcam_window::get_floating_webcam_state,
            webcam_window::is_floating_webcam_open,
            // Cost Popup (Screen Recording Invisible)
            cost_popup::create_cost_popup,
            cost_popup::close_cost_popup,
            cost_popup::update_cost_popup_position,
            cost_popup::is_cost_popup_open,
            // GIF Capture
            gif_capture::capture_screen_frame,
            gif_capture::check_gif_recording_permission,
            gif_capture::request_gif_recording_permission,
            // Domain Tools
            domain_tools::whois_lookup,
            domain_tools::dns_lookup,
            domain_tools::dns_lookup_server,
            domain_tools::ssl_check,
            domain_tools::http_head_request,
            domain_tools::http_get_json,
            domain_tools::http_follow_redirects,
            // Audio Proxy (for radio streams)
            audio_proxy::start_audio_proxy,
            audio_proxy::stop_audio_proxy,
            audio_proxy::get_audio_proxy_url,
            audio_proxy::is_audio_proxy_running,
            // Netlify Backup (CORS proxy)
            netlify_backup::netlify_test_connection,
            netlify_backup::netlify_fetch_sites,
            netlify_backup::netlify_create_site,
            netlify_backup::netlify_deploy_zip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

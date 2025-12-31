#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api_tester;
mod audio_proxy;
mod auto_build;
mod beads;
mod claude_process;
mod codex_process;
mod gemini_process;
mod github;
mod commands;
mod mobile_api;
mod cost_popup;
mod database_viewer;
mod domain_tools;
mod file_coordinator;
mod homebrew;
mod launcher;
mod limits_monitor;
mod live_preview;
mod mcp_permission_server;
mod netlify_backup;
mod overwatch;
mod path_utils;
mod storybook;
mod system_cleaner;
mod terminal;
mod tunnel;
mod vibrancy;
mod watcher;
mod webcam_window;
mod camera_permission;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let menu = create_menu(app.handle())?;
            app.set_menu(menu)?;

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

            // Initialize launcher state
            launcher::init_launcher();

            // Register global shortcut for launcher (Cmd+Space on macOS, Ctrl+Space on others)
            // Note: Cmd+Space may conflict with Spotlight - using Option+Space as alternative
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);

            if let Err(e) = app.global_shortcut().on_shortcut(shortcut, |app_handle, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let app = app_handle.clone();
                    let app_inner = app.clone();
                    // Must run on main thread for window operations
                    let _ = app.run_on_main_thread(move || {
                        let _ = launcher::toggle_launcher_window_sync(app_inner);
                    });
                }
            }) {
                eprintln!("Failed to register global shortcut: {}", e);
            }

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
        .manage(Arc::new(codex_process::CodexProcessManager::new()))
        .manage(Arc::new(gemini_process::GeminiProcessManager::new()))
        .manage(Arc::new(mcp_permission_server::McpPermissionManager::new()))
        .manage(Arc::new(file_coordinator::FileCoordinatorManager::new()))
        .manage(Arc::new(audio_proxy::AudioProxyManager::new()))
        .manage(Arc::new(mobile_api::MobileApiManager::new()))
        .invoke_handler(tauri::generate_handler![
            commands::get_file_tree,
            commands::read_file_content,
            commands::read_file_base64,
            commands::write_file_content,
            commands::is_directory,
            commands::find_markdown_files,
            commands::list_project_files,
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
            commands::get_downloads_dir,
            commands::write_binary_file,
            commands::scan_music_folder,
            commands::get_git_status,
            commands::check_node_modules_exists,
            commands::get_directory_stats,
            commands::get_node_modules_size,
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
            commands::set_system_env_var,
            commands::remove_system_env_var,
            commands::create_zip_archive,
            commands::zip_folder_to_base64,
            commands::zip_folder_for_deploy,
            commands::estimate_image_optimization,
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
            live_preview::detect_project_type,
            live_preview::get_local_ip,
            live_preview::start_preview_server,
            live_preview::stop_preview_server,
            live_preview::list_preview_servers,
            live_preview::check_port_status,
            live_preview::kill_process_on_port,
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
            database_viewer::db_get_relationships,
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
            beads::beads_update_phase,
            // Auto Build
            auto_build::auto_build_save_session,
            auto_build::auto_build_load_session,
            auto_build::auto_build_clear_session,
            auto_build::auto_build_run_claude,
            auto_build::auto_build_run_verification,
            auto_build::auto_build_commit,
            auto_build::auto_build_read_silo,
            auto_build::auto_build_write_silo,
            auto_build::auto_build_read_audit_files,
            // MCP Server Management
            commands::get_mcp_servers,
            commands::save_mcp_server,
            commands::delete_mcp_server,
            commands::toggle_mcp_server,
            commands::validate_mcp_command,
            // Claude Code Stats
            commands::read_claude_stats,
            // Slash Commands (custom command scanning)
            commands::list_directory_files,
            commands::read_file_head,
            // Codex image support
            commands::save_temp_image,
            // Claude Code Limits Monitor
            limits_monitor::calculate_usage_summary,
            // Netlify API
            netlify_backup::netlify_test_connection,
            netlify_backup::netlify_fetch_sites,
            netlify_backup::netlify_fetch_deploys,
            netlify_backup::netlify_create_site,
            netlify_backup::netlify_delete_site,
            netlify_backup::netlify_update_site,
            netlify_backup::netlify_deploy_zip,
            netlify_backup::netlify_rollback_deploy,
            netlify_backup::netlify_fetch_backup_html,
            // Claude Process Management
            claude_process::start_claude_session,
            claude_process::stop_claude_session,
            claude_process::start_claude_streaming,
            claude_process::send_claude_input,
            claude_process::send_claude_structured_input,
            claude_process::send_claude_raw_input,
            claude_process::terminate_claude_session,
            claude_process::is_claude_session_active,
            claude_process::list_active_claude_sessions,
            // Codex Process Management
            codex_process::start_codex_session,
            codex_process::stop_codex_session,
            codex_process::send_codex_input,
            codex_process::is_codex_session_active,
            codex_process::list_active_codex_sessions,
            // Gemini Process Management
            gemini_process::start_gemini_session,
            gemini_process::stop_gemini_session,
            gemini_process::send_gemini_input,
            gemini_process::is_gemini_session_active,
            gemini_process::list_active_gemini_sessions,
            // MCP Permission Server
            mcp_permission_server::start_mcp_permission_server,
            mcp_permission_server::stop_mcp_permission_server,
            mcp_permission_server::respond_to_mcp_permission,
            mcp_permission_server::get_mcp_permission_port,
            // File Coordinator (for concurrent auto-build)
            file_coordinator::start_file_coordinator_server,
            file_coordinator::stop_file_coordinator_server,
            file_coordinator::get_file_coordinator_port,
            file_coordinator::get_all_file_locks,
            file_coordinator::release_issue_locks,
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
            // Domain Tools
            domain_tools::whois_lookup,
            domain_tools::dns_lookup,
            domain_tools::dns_lookup_server,
            domain_tools::ssl_check,
            domain_tools::http_head_request,
            domain_tools::http_get_json,
            domain_tools::http_get_html,
            domain_tools::http_follow_redirects,
            // Homebrew Manager
            homebrew::brew_check_installed,
            homebrew::brew_version,
            homebrew::brew_list_installed,
            homebrew::brew_list_outdated,
            homebrew::brew_search,
            homebrew::brew_info,
            homebrew::brew_install,
            homebrew::brew_uninstall,
            homebrew::brew_update,
            homebrew::brew_upgrade,
            homebrew::brew_list_taps,
            homebrew::brew_tap,
            homebrew::brew_untap,
            homebrew::brew_doctor,
            homebrew::brew_cleanup,
            homebrew::brew_pin,
            homebrew::brew_unpin,
            // System Cleaner
            system_cleaner::scan_large_files,
            system_cleaner::get_cache_locations,
            system_cleaner::scan_app_caches,
            system_cleaner::scan_installed_apps,
            system_cleaner::cleaner_delete_to_trash,
            system_cleaner::uninstall_app,
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
            // Launcher
            launcher::toggle_launcher_window,
            launcher::hide_launcher_window,
            launcher::is_launcher_visible,
            launcher::search_macos_apps,
            launcher::get_recent_files,
            launcher::search_files,
            launcher::open_application,
            launcher::reveal_in_finder,
            launcher::open_file,
            launcher::get_app_icon_base64,
            launcher::update_lightcast_hotkey,
            launcher::enable_lightcast,
            launcher::disable_lightcast,
            launcher::enable_autostart,
            launcher::disable_autostart,
            launcher::is_autostart_enabled,
            launcher::open_tool_in_main_window,
            // Window Vibrancy
            vibrancy::get_vibrancy_support,
            vibrancy::apply_window_vibrancy,
            vibrancy::clear_window_vibrancy,
            vibrancy::apply_vibrancy_to_all_windows,
            // Camera Permission
            camera_permission::check_camera_permission,
            camera_permission::request_camera_permission,
            camera_permission::open_camera_privacy_settings,
            // GitHub Manager
            github::gh_check_auth,
            github::gh_list_my_repos,
            github::gh_list_starred_repos,
            github::gh_list_orgs,
            github::gh_list_org_repos,
            github::gh_search_repos,
            github::gh_create_repo,
            github::gh_clone_repo,
            github::gh_open_auth,
            github::gh_view_repo,
            github::gh_get_repo_contents,
            github::gh_get_file_content,
            github::gh_edit_repo,
            github::gh_delete_repo,
            // Mobile API
            mobile_api::mobile_api_start,
            mobile_api::mobile_api_stop,
            mobile_api::mobile_api_info,
            mobile_api::mobile_api_generate_pairing_code,
            mobile_api::mobile_api_verify_pairing,
            mobile_api::mobile_api_revoke_device,
            mobile_api::mobile_api_list_devices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

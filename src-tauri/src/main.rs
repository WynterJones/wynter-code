#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod terminal;
mod watcher;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
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
        .manage(Arc::new(watcher::FileWatcherManager::new()))
        .invoke_handler(tauri::generate_handler![
            commands::get_file_tree,
            commands::read_file_content,
            commands::read_file_base64,
            commands::write_file_content,
            commands::find_markdown_files,
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
            terminal::create_pty,
            terminal::write_pty,
            terminal::resize_pty,
            terminal::close_pty,
            terminal::is_pty_active,
            watcher::start_file_watcher,
            watcher::stop_file_watcher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

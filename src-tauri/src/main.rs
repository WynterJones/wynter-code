#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:wyntercode.db", commands::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::get_file_tree,
            commands::read_file_content,
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
            commands::check_node_modules_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

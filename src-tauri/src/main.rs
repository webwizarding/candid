#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod canvas;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![canvas::fetch_canvas_feed])
        .run(tauri::generate_context!())
        .expect("Could not start Candid");
}

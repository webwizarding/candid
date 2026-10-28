#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod canvas;
mod tor;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(tor::TorState::default())
        .on_page_load(|webview, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Started) {
                tor::stop_all(webview.app_handle());
            }
        })
        .on_window_event(|window, event| {
            if matches!(
                event,
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
            ) {
                tor::stop_all(window.app_handle());
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            canvas::fetch_canvas_feed,
            tor::tor_host,
            tor::tor_join,
            tor::tor_send,
            tor::tor_stop
        ])
        .run(tauri::generate_context!())
        .expect("Could not start Candid");
}

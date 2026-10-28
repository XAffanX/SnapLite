pub mod capture;
pub mod clipboard;
pub mod commands;
pub mod image;
pub mod settings;
pub mod shortcuts;
pub mod tray;

use commands::*;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Ensure Per-Monitor V2 DPI awareness on Windows
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::UI::HiDpi::{
            SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
        };
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }

    tauri::Builder::default()
        .manage(ActiveCaptureState(Mutex::new(None)))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle();
            let _ = tray::setup_system_tray(&app_handle);
            let _ = shortcuts::register_global_shortcuts(&app_handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            start_region_selection,
            get_current_desktop_snapshot,
            confirm_region_crop,
            cancel_region_selection,
            copy_image_to_clipboard,
            save_screenshot,
            get_monitors,
            get_windows,
            get_app_settings,
            save_app_settings,
            minimize_to_tray,
            restore_main_window
        ])
        .run(tauri::generate_context!())
        .expect("Error while running SnapLite desktop application");
}

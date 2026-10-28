use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager, State, WebviewWindow};

use crate::capture::monitor::{list_monitors, MonitorMeta};
use crate::capture::region::{capture_native_rect, capture_virtual_desktop, RectBounds};
use crate::capture::window::{capture_window_by_id, list_windows, WindowMeta};
use crate::image::export::{image_to_data_url, save_image_to_path};
use crate::settings::{load_config, save_config, AppConfig};

/// Global in-memory state holding the frozen desktop capture during region selection
pub struct ActiveCaptureState(pub Mutex<Option<(image::RgbaImage, RectBounds)>>);

#[derive(serde::Serialize, Clone, Debug)]
pub struct SnapshotPayload {
    pub data_url: String,
    pub bounds: RectBounds,
}

#[command]
pub async fn capture_screen(
    mode: String,
    bounds: Option<RectBounds>,
    window_id: Option<String>,
) -> Result<String, String> {
    let image = match mode.as_str() {
        "region" => {
            if let Some(b) = bounds {
                capture_native_rect(b)?
            } else {
                let (img, _) = capture_virtual_desktop()?;
                img
            }
        }
        "window" => {
            let wid = window_id.ok_or_else(|| "Window ID required for active-window capture".to_string())?;
            capture_window_by_id(&wid)?
        }
        _ => {
            let (img, _) = capture_virtual_desktop()?;
            img
        }
    };

    image_to_data_url(&image)
}

#[command]
pub async fn start_region_selection(
    app: AppHandle,
    state: State<'_, ActiveCaptureState>,
) -> Result<SnapshotPayload, String> {
    // 1. Hide main application window so it does not appear in the screenshot
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }

    // Delay 150ms to allow Windows DWM compositor to flush
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    // 2. Capture entire virtual desktop spanning all monitors
    let (desktop_image, bounds) = capture_virtual_desktop()
        .map_err(|e| format!("Failed to capture virtual desktop: {}", e))?;

    let data_url = image_to_data_url(&desktop_image)?;
    let payload = SnapshotPayload {
        data_url: data_url.clone(),
        bounds,
    };

    // Store in shared memory for cropping
    {
        let mut lock = state.0.lock().map_err(|e| format!("Lock error: {:?}", e))?;
        *lock = Some((desktop_image, bounds));
    }

    // 3. Show overlay window positioned over the virtual screen
    if let Some(overlay_win) = app.get_webview_window("overlay") {
        let _ = overlay_win.emit("load-desktop-snapshot", &payload);
        let _ = overlay_win.show();
        let _ = overlay_win.set_focus();
    }

    Ok(payload)
}

#[command]
pub fn get_current_desktop_snapshot(
    state: State<'_, ActiveCaptureState>,
) -> Result<Option<SnapshotPayload>, String> {
    let lock = state.0.lock().map_err(|e| format!("Lock error: {:?}", e))?;
    if let Some((ref img, bounds)) = *lock {
        let data_url = image_to_data_url(img)?;
        Ok(Some(SnapshotPayload { data_url, bounds }))
    } else {
        Ok(None)
    }
}

#[command]
pub async fn confirm_region_crop(
    app: AppHandle,
    state: State<'_, ActiveCaptureState>,
    bounds: RectBounds,
    quick_copy: bool,
) -> Result<String, String> {
    let cropped_data_url = {
        let mut lock = state.0.lock().map_err(|e| format!("Lock error: {:?}", e))?;
        let (desktop_img, desktop_bounds) = lock
            .take()
            .ok_or_else(|| "No active desktop capture found in memory".to_string())?;

        // Calculate relative coordinates inside the captured virtual screen
        let rel_x = (bounds.x - desktop_bounds.x).max(0) as u32;
        let rel_y = (bounds.y - desktop_bounds.y).max(0) as u32;
        let crop_w = bounds.width.min(desktop_img.width().saturating_sub(rel_x)).max(1);
        let crop_h = bounds.height.min(desktop_img.height().saturating_sub(rel_y)).max(1);

        let cropped_img = image::imageops::crop_imm(&desktop_img, rel_x, rel_y, crop_w, crop_h).to_image();

        // If quick copy requested, write to native clipboard immediately
        if quick_copy {
            let rgba = cropped_img.as_raw();
            let _ = crate::clipboard::copy_image_to_clipboard(rgba, crop_w as usize, crop_h as usize);
        }

        image_to_data_url(&cropped_img)?
    };

    // 1. Hide overlay window
    if let Some(overlay_win) = app.get_webview_window("overlay") {
        let _ = overlay_win.hide();
    }

    // 2. Restore and focus main window with cropped screenshot payload
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();

        let _ = main_win.emit(
            "region-capture-complete",
            serde_json::json!({
                "dataUrl": cropped_data_url,
                "width": bounds.width,
                "height": bounds.height,
                "quickCopy": quick_copy
            }),
        );
    }

    Ok(cropped_data_url)
}

#[command]
pub async fn cancel_region_selection(
    app: AppHandle,
    state: State<'_, ActiveCaptureState>,
) -> Result<(), String> {
    // Clear in-memory capture
    if let Ok(mut lock) = state.0.lock() {
        *lock = None;
    }

    // Hide overlay window
    if let Some(overlay_win) = app.get_webview_window("overlay") {
        let _ = overlay_win.hide();
    }

    // Restore and focus main window
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }

    Ok(())
}

#[command]
pub async fn copy_image_to_clipboard(image_bytes: Vec<u8>) -> Result<(), String> {
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to parse image for clipboard: {:?}", e))?;
    let rgba = img.to_rgba8();
    crate::clipboard::copy_image_to_clipboard(&rgba, rgba.width() as usize, rgba.height() as usize)
}

#[command]
pub async fn save_screenshot(
    image_bytes: Vec<u8>,
    target_path: String,
    format: String,
    quality: u8,
) -> Result<String, String> {
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to parse image for saving: {:?}", e))?;
    let rgba = img.to_rgba8();
    let path = PathBuf::from(&target_path);

    save_image_to_path(&rgba, &path, &format, quality)?;
    Ok(target_path)
}

#[command]
pub fn get_monitors() -> Vec<MonitorMeta> {
    list_monitors()
}

#[command]
pub fn get_windows() -> Vec<WindowMeta> {
    list_windows()
}

#[command]
pub fn get_app_settings() -> AppConfig {
    load_config()
}

#[command]
pub fn save_app_settings(config: AppConfig) -> Result<(), String> {
    save_config(&config)
}

#[command]
pub fn minimize_to_tray(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[command]
pub fn restore_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
    Ok(())
}

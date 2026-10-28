
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn setup_system_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let capture_region_item = MenuItem::with_id(
        app, "capture_region", "Capture Region (Ctrl+Shift+S)", true, None::<&str>
    )?;

    let capture_fullscreen_item = MenuItem::with_id(
        app, "capture_fullscreen", "Capture Fullscreen (Ctrl+Shift+F)", true, None::<&str>
    )?;

    let capture_window_item = MenuItem::with_id(
        app, "capture_window", "Capture Window (Ctrl+Shift+W)", true, None::<&str>
    )?;

    let open_item = MenuItem::with_id(
        app, "open_dashboard", "Open SnapLite Dashboard", true, None::<&str>
    )?;

    let settings_item = MenuItem::with_id(
        app, "open_settings", "Settings", true, None::<&str>
    )?;

    let quit_item = MenuItem::with_id(
        app, "quit", "Quit SnapLite", true, None::<&str>
    )?;

    let menu = Menu::with_items(
        app,
        &[
            &capture_region_item,
            &capture_fullscreen_item,
            &capture_window_item,
            &open_item,
            &settings_item,
            &quit_item,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture_region" => {
                let _ = app.emit("trigger-global-capture", "region");
            }
            "capture_fullscreen" => {
                let _ = app.emit("tray-trigger-capture", "fullscreen");
            }
            "capture_window" => {
                let _ = app.emit("tray-trigger-capture", "window");
            }
            "open_dashboard" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "open_settings" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                    let _ = app.emit("open-settings", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();

                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(serde::Serialize, Clone, Debug)]
pub struct ShortcutConflictInfo {
    pub shortcut: String,
    pub action: String,
    pub error: String,
}

/// Register global Windows-compatible shortcuts:
/// - Ctrl + Shift + S: Region Capture
/// - Ctrl + Shift + F: Fullscreen Capture
/// - Ctrl + Shift + W: Window Capture
///
/// If a shortcut is already claimed by another system application (e.g. Windows Snipping Tool),
/// report the conflict and emit a notification event to the frontend without crashing the application.
pub fn register_global_shortcuts(app: &AppHandle) -> Result<Vec<ShortcutConflictInfo>, String> {
    let app_handle = app.clone();
    let gs = app.global_shortcut();
    let mut conflicts: Vec<ShortcutConflictInfo> = Vec::new();

    let shortcuts_to_register = [
        ("Ctrl+Shift+S", "region"),
        ("Ctrl+Shift+F", "fullscreen"),
        ("Ctrl+Shift+W", "window"),
    ];

    for (combo, action) in shortcuts_to_register {
        match combo.parse::<Shortcut>() {
            Ok(shortcut) => {
                let app_ref = app_handle.clone();
                let act_str = action.to_string();
                if let Err(err) = gs.on_shortcut(shortcut, move |_app, _sc, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app_ref.emit("trigger-global-capture", &act_str);
                    }
                }) {
                    eprintln!("Warning: Global shortcut conflict for {} ({:?})", combo, err);
                    conflicts.push(ShortcutConflictInfo {
                        shortcut: combo.to_string(),
                        action: action.to_string(),
                        error: format!("{:?}", err),
                    });
                }
            }
            Err(e) => {
                conflicts.push(ShortcutConflictInfo {
                    shortcut: combo.to_string(),
                    action: action.to_string(),
                    error: format!("Parse error: {:?}", e),
                });
            }
        }
    }

    if !conflicts.is_empty() {
        let _ = app.emit("shortcut-conflicts-detected", &conflicts);
    }

    Ok(conflicts)
}

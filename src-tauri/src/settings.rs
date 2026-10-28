use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub default_format: String,
    pub default_quality: u8,
    pub default_save_dir: String,
    pub copy_after_capture: bool,
    pub open_editor: bool,
    pub capture_delay: u32,
    pub minimize_to_tray: bool,
    pub launch_at_startup: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_format: "png".to_string(),
            default_quality: 95,
            default_save_dir: String::new(),
            copy_after_capture: false,
            open_editor: true,
            capture_delay: 0,
            minimize_to_tray: true,
            launch_at_startup: false,
        }
    }
}

pub fn get_config_path() -> Option<PathBuf> {
    dirs_next_or_custom()
}

fn dirs_next_or_custom() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let mut path = PathBuf::from(appdata);
        path.push("SnapLite");
        let _ = fs::create_dir_all(&path);
        path.push("config.json");
        Some(path)
    } else {
        None
    }
}

pub fn load_config() -> AppConfig {
    if let Some(path) = get_config_path() {
        if let Ok(contents) = fs::read_to_string(path) {
            if let Ok(config) = serde_json::from_str(&contents) {
                return config;
            }
        }
    }
    AppConfig::default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    if let Some(path) = get_config_path() {
        let serialized = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Serialization error: {:?}", e))?;
        fs::write(path, serialized).map_err(|e| format!("Write error: {:?}", e))?;
    }
    Ok(())
}

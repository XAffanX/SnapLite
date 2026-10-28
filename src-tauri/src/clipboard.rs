use arboard::{Clipboard, ImageData};
use std::borrow::Cow;

/// Writes native image bytes (RGBA) to system clipboard
pub fn copy_image_to_clipboard(rgba_pixels: &[u8], width: usize, height: usize) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard access error: {:?}", e))?;
    
    let img_data = ImageData {
        width,
        height,
        bytes: Cow::Borrowed(rgba_pixels),
    };

    clipboard
        .set_image(img_data)
        .map_err(|e| format!("Failed to copy image to clipboard: {:?}", e))?;

    Ok(())
}

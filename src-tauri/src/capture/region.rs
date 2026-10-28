use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct RectBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Capture entire virtual desktop spanning all connected monitors (accounting for negative coordinates and mixed DPI)
#[cfg(target_os = "windows")]
pub fn capture_virtual_desktop() -> Result<(image::RgbaImage, RectBounds), String> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN,
    };

    unsafe {
        let x = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let y = GetSystemMetrics(SM_YVIRTUALSCREEN);
        let width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        let height = GetSystemMetrics(SM_CYVIRTUALSCREEN);

        if width <= 0 || height <= 0 {
            return Err("Failed to query virtual screen metrics on Windows".to_string());
        }

        let bounds = RectBounds {
            x,
            y,
            width: width as u32,
            height: height as u32,
        };

        let img = capture_native_rect(bounds)?;
        Ok((img, bounds))
    }
}

#[cfg(not(target_os = "windows"))]
pub fn capture_virtual_desktop() -> Result<(image::RgbaImage, RectBounds), String> {
    let bounds = RectBounds {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };
    let img = capture_native_rect(bounds)?;
    Ok((img, bounds))
}

/// Native Windows GDI screen region capture
#[cfg(target_os = "windows")]
pub fn capture_native_rect(bounds: RectBounds) -> Result<image::RgbaImage, String> {
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    };

    if bounds.width == 0 || bounds.height == 0 {
        return Err(format!(
            "Invalid capture dimensions: {}x{}. Width and height must be > 0",
            bounds.width, bounds.height
        ));
    }

    unsafe {
        // Desktop window DC (passing HWND(0) / None gets the virtual desktop)
        let hdc_screen = GetDC(None);
        if hdc_screen.is_invalid() {
            return Err("Failed to get Windows desktop device context (GetDC failed)".to_string());
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            ReleaseDC(None, hdc_screen);
            return Err("Failed to create compatible memory device context".to_string());
        }

        let hbitmap = CreateCompatibleBitmap(hdc_screen, bounds.width as i32, bounds.height as i32);
        if hbitmap.is_invalid() {
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc_screen);
            return Err(format!(
                "Failed to allocate compatible bitmap of size {}x{}",
                bounds.width, bounds.height
            ));
        }

        let old_obj = SelectObject(hdc_mem, hbitmap);

        // Blit the specified region from desktop DC to our memory DC
        let blit_res = BitBlt(
            hdc_mem,
            0,
            0,
            bounds.width as i32,
            bounds.height as i32,
            hdc_screen,
            bounds.x,
            bounds.y,
            SRCCOPY,
        );

        if blit_res.is_err() {
            SelectObject(hdc_mem, old_obj);
            DeleteObject(hbitmap);
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc_screen);
            return Err(format!(
                "Windows BitBlt screen transfer failed for region [x={}, y={}, w={}, h={}]",
                bounds.x, bounds.y, bounds.width, bounds.height
            ));
        }

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: bounds.width as i32,
                biHeight: -(bounds.height as i32), // Top-down DIB
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD {
                rgbBlue: 0,
                rgbGreen: 0,
                rgbRed: 0,
                rgbReserved: 0,
            }; 1],
        };

let mut raw_pixels = vec![0u8; (bounds.width * bounds.height * 4) as usize];

// Restore the original object before reading bitmap pixels.
SelectObject(hdc_mem, old_obj);

let dib_res = GetDIBits(
    hdc_mem,
    hbitmap,
    0,
    bounds.height,
    Some(raw_pixels.as_mut_ptr() as *mut _),
    &mut bmi,
    DIB_RGB_COLORS,
);

// Clean up Windows GDI handles
DeleteObject(hbitmap);
DeleteDC(hdc_mem);
ReleaseDC(None, hdc_screen);

        if dib_res == 0 {
            return Err("GetDIBits failed to extract pixel data from screen bitmap".to_string());
        }

        // Convert BGRA to RGBA in-place with zero-copy
        for chunk in raw_pixels.chunks_exact_mut(4) {
            let b = chunk[0];
            let r = chunk[2];
            chunk[0] = r;
            chunk[2] = b;
            chunk[3] = 255;
        }

        image::RgbaImage::from_raw(bounds.width, bounds.height, raw_pixels)
            .ok_or_else(|| "Failed to construct RgbaImage buffer from raw screen bytes".to_string())
    }
}

/// Fallback when compiling on non-Windows host (returns error on capture attempt rather than fake image)
#[cfg(not(target_os = "windows"))]
pub fn capture_native_rect(bounds: RectBounds) -> Result<image::RgbaImage, String> {
    Err(format!(
        "Native Windows screen capture is only supported on Windows host (requested {}x{}). Please run SnapLite on Windows.",
        bounds.width, bounds.height
    ))
}

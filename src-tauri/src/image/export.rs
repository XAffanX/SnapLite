use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::{ImageFormat, RgbaImage};
use std::io::Cursor;
use std::path::Path;

pub fn image_to_png_bytes(img: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut bytes = Cursor::new(Vec::new());
    img.write_to(&mut bytes, ImageFormat::Png)
        .map_err(|e| format!("PNG encoding failed: {:?}", e))?;
    Ok(bytes.into_inner())
}

pub fn image_to_data_url(img: &RgbaImage) -> Result<String, String> {
    let png_bytes = image_to_png_bytes(img)?;
    let b64 = STANDARD.encode(png_bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

pub fn save_image_to_path(
    img: &RgbaImage,
    target_path: &Path,
    format: &str,
    quality: u8,
) -> Result<(), String> {
    let fmt = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        _ => ImageFormat::Png,
    };

    if fmt == ImageFormat::Jpeg {
        let rgb = image::DynamicImage::ImageRgba8(img.clone()).to_rgb8();
        let mut file = std::fs::File::create(target_path)
            .map_err(|e| format!("Failed to create file: {:?}", e))?;
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut file, quality);
        encoder
            .encode(
                &rgb,
                rgb.width(),
                rgb.height(),
                image::ExtendedColorType::Rgb8,
            )
            .map_err(|e| format!("JPEG write error: {:?}", e))?;
    } else {
        img.save_with_format(target_path, fmt)
            .map_err(|e| format!("Failed to save image: {:?}", e))?;
    }

    Ok(())
}

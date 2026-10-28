use image::{GenericImageView, Rgba, RgbaImage};

/// Apply mosaic pixelation to a bounding box in an image
pub fn pixelate_region(
    img: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    block_size: u32,
) {
    let block_size = block_size.max(2);
    let max_x = (x + width).min(img.width());
    let max_y = (y + height).min(img.height());

    for by in (y..max_y).step_by(block_size as usize) {
        for bx in (x..max_x).step_by(block_size as usize) {
            let bw = block_size.min(max_x - bx);
            let bh = block_size.min(max_y - by);

            let mut r_sum: u64 = 0;
            let mut g_sum: u64 = 0;
            let mut b_sum: u64 = 0;
            let mut a_sum: u64 = 0;
            let count = (bw * bh) as u64;

            for dy in 0..bh {
                for dx in 0..bw {
                    let pixel = img.get_pixel(bx + dx, by + dy);
                    r_sum += pixel[0] as u64;
                    g_sum += pixel[1] as u64;
                    b_sum += pixel[2] as u64;
                    a_sum += pixel[3] as u64;
                }
            }

            let avg_pixel = Rgba([
                (r_sum / count) as u8,
                (g_sum / count) as u8,
                (b_sum / count) as u8,
                (a_sum / count) as u8,
            ]);

            for dy in 0..bh {
                for dx in 0..bw {
                    img.put_pixel(bx + dx, by + dy, avg_pixel);
                }
            }
        }
    }
}

/// Apply simple box blur to a region
pub fn blur_region(
    img: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    radius: u32,
) {
    let radius = radius.clamp(1, 40) as i32;
    let max_x = (x + width).min(img.width());
    let max_y = (y + height).min(img.height());

    let mut temp = img.clone();

    // Horizontal pass
    for py in y..max_y {
        for px in x..max_x {
            let mut r: u64 = 0;
            let mut g: u64 = 0;
            let mut b: u64 = 0;
            let mut a: u64 = 0;
            let mut count = 0;

            for kx in -radius..=radius {
                let nx = px as i32 + kx;
                if nx >= x as i32 && nx < max_x as i32 {
                    let pixel = img.get_pixel(nx as u32, py);
                    r += pixel[0] as u64;
                    g += pixel[1] as u64;
                    b += pixel[2] as u64;
                    a += pixel[3] as u64;
                    count += 1;
                }
            }

            if count > 0 {
                temp.put_pixel(
                    px,
                    py,
                    Rgba([
                        (r / count) as u8,
                        (g / count) as u8,
                        (b / count) as u8,
                        (a / count) as u8,
                    ]),
                );
            }
        }
    }

    // Vertical pass
    for px in x..max_x {
        for py in y..max_y {
            let mut r: u64 = 0;
            let mut g: u64 = 0;
            let mut b: u64 = 0;
            let mut a: u64 = 0;
            let mut count = 0;

            for ky in -radius..=radius {
                let ny = py as i32 + ky;
                if ny >= y as i32 && ny < max_y as i32 {
                    let pixel = temp.get_pixel(px, ny as u32);
                    r += pixel[0] as u64;
                    g += pixel[1] as u64;
                    b += pixel[2] as u64;
                    a += pixel[3] as u64;
                    count += 1;
                }
            }

            if count > 0 {
                img.put_pixel(
                    px,
                    py,
                    Rgba([
                        (r / count) as u8,
                        (g / count) as u8,
                        (b / count) as u8,
                        (a / count) as u8,
                    ]),
                );
            }
        }
    }
}

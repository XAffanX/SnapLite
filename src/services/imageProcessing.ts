import { AnnotationItem, ArrowAnnotation, MarkerAnnotation, PenAnnotation, ShapeAnnotation, TextAnnotation } from '../types/annotations';

/**
 * True pixel-level mosaic pixelation on canvas ImageData
 */
export function applyPixelation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  blockSize: number
): void {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.min(ctx.canvas.width - sx, Math.floor(width));
  const sh = Math.min(ctx.canvas.height - sy, Math.floor(height));

  if (sw <= 0 || sh <= 0) return;

  const bSize = Math.max(2, Math.floor(blockSize));
  const imgData = ctx.getImageData(sx, sy, sw, sh);
  const data = imgData.data;

  for (let py = 0; py < sh; py += bSize) {
    for (let px = 0; px < sw; px += bSize) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      // Sample average color of this block
      for (let dy = 0; dy < bSize && py + dy < sh; dy++) {
        for (let dx = 0; dx < bSize && px + dx < sw; dx++) {
          const idx = ((py + dy) * sw + (px + dx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }

      if (count === 0) continue;
      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);
      const avgA = Math.round(a / count);

      // Write average color across the block
      for (let dy = 0; dy < bSize && py + dy < sh; dy++) {
        for (let dx = 0; dx < bSize && px + dx < sw; dx++) {
          const idx = ((py + dy) * sw + (px + dx)) * 4;
          data[idx] = avgR;
          data[idx + 1] = avgG;
          data[idx + 2] = avgB;
          data[idx + 3] = avgA;
        }
      }
    }
  }

  ctx.putImageData(imgData, sx, sy);
}

/**
 * True pixel-level fast blur on canvas ImageData using 3-pass box blur
 */
export function applyFastBlur(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.min(ctx.canvas.width - sx, Math.floor(width));
  const sh = Math.min(ctx.canvas.height - sy, Math.floor(height));

  if (sw <= 0 || sh <= 0) return;

  const r = Math.max(1, Math.min(50, Math.floor(radius)));
  const imgData = ctx.getImageData(sx, sy, sw, sh);
  const src = imgData.data;
  const target = new Uint8ClampedArray(src.length);

  // Simple box blur horizontal pass
  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      let tr = 0, tg = 0, tb = 0, ta = 0;
      let count = 0;

      for (let kx = -r; kx <= r; kx += 2) {
        const nx = px + kx;
        if (nx >= 0 && nx < sw) {
          const idx = (py * sw + nx) * 4;
          tr += src[idx];
          tg += src[idx + 1];
          tb += src[idx + 2];
          ta += src[idx + 3];
          count++;
        }
      }

      const outIdx = (py * sw + px) * 4;
      target[outIdx] = tr / count;
      target[outIdx + 1] = tg / count;
      target[outIdx + 2] = tb / count;
      target[outIdx + 3] = ta / count;
    }
  }

  // Vertical pass
  for (let px = 0; px < sw; px++) {
    for (let py = 0; py < sh; py++) {
      let tr = 0, tg = 0, tb = 0, ta = 0;
      let count = 0;

      for (let ky = -r; ky <= r; ky += 2) {
        const ny = py + ky;
        if (ny >= 0 && ny < sh) {
          const idx = (ny * sw + px) * 4;
          tr += target[idx];
          tg += target[idx + 1];
          tb += target[idx + 2];
          ta += target[idx + 3];
          count++;
        }
      }

      const outIdx = (py * sw + px) * 4;
      src[outIdx] = tr / count;
      src[outIdx + 1] = tg / count;
      src[outIdx + 2] = tb / count;
      src[outIdx + 3] = ta / count;
    }
  }

  ctx.putImageData(imgData, sx, sy);
}

/**
 * Render vector arrow with arrowhead
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  width: number
) {
  const headlen = Math.max(12, width * 3.5);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Render complete composite canvas including base image and annotations
 */
export async function renderCompositeCanvas(
  baseImage: HTMLImageElement,
  annotations: AnnotationItem[],
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');

  // Draw base image
  ctx.drawImage(baseImage, 0, 0, width, height);

  // Draw raster effects first if any
  for (const ann of annotations) {
    if (ann.tool === 'blur') {
      applyFastBlur(ctx, ann.x, ann.y, ann.width, ann.height, ann.strength || 16);
    } else if (ann.tool === 'pixelate') {
      applyPixelation(ctx, ann.x, ann.y, ann.width, ann.height, ann.strength || 12);
    }
  }

  // Draw vector annotations
  for (const ann of annotations) {
    ctx.save();

    if (ann.tool === 'pen') {
      const pen = ann as PenAnnotation;
      if (pen.points && pen.points.length >= 4) {
        ctx.strokeStyle = pen.color;
        ctx.lineWidth = pen.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pen.points[0], pen.points[1]);
        for (let i = 2; i < pen.points.length; i += 2) {
          ctx.lineTo(pen.points[i], pen.points[i + 1]);
        }
        ctx.stroke();
      }
    } else if (ann.tool === 'highlighter') {
      const high = ann as PenAnnotation;
      if (high.points && high.points.length >= 4) {
        ctx.strokeStyle = high.color;
        ctx.lineWidth = high.strokeWidth * 3.5;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(high.points[0], high.points[1]);
        for (let i = 2; i < high.points.length; i += 2) {
          ctx.lineTo(high.points[i], high.points[i + 1]);
        }
        ctx.stroke();
      }
    } else if (ann.tool === 'arrow') {
      const arrow = ann as ArrowAnnotation;
      drawArrow(
        ctx,
        arrow.points[0],
        arrow.points[1],
        arrow.points[2],
        arrow.points[3],
        arrow.color,
        arrow.strokeWidth
      );
    } else if (ann.tool === 'rectangle') {
      const shape = ann as ShapeAnnotation;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      if (shape.isFilled) {
        ctx.fillStyle = shape.color + '40'; // 25% opacity fill
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      }
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (ann.tool === 'circle') {
      const shape = ann as ShapeAnnotation;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      const rx = Math.abs(shape.width / 2);
      const ry = Math.abs(shape.height / 2);
      const cx = shape.x + rx;
      const cy = shape.y + ry;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (shape.isFilled) {
        ctx.fillStyle = shape.color + '40';
        ctx.fill();
      }
      ctx.stroke();
    } else if (ann.tool === 'text') {
      const text = ann as TextAnnotation;
      const weight = text.isBold ? 'bold' : 'normal';
      ctx.font = `${weight} ${text.fontSize}px "Segoe UI", sans-serif`;
      ctx.fillStyle = text.color;
      ctx.textBaseline = 'top';

      // Draw subtle shadow for legibility over any background
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(text.text, text.x, text.y);
    } else if (ann.tool === 'marker') {
      const marker = ann as MarkerAnnotation;
      const radius = marker.radius || 18;

      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Circle badge
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = marker.color;
      ctx.fill();

      // Border ring
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Number text
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(radius * 1.1)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.number.toString(), marker.x, marker.y + 1);
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Generate formatted filename
 */
export function generateScreenshotFilename(ext = 'png'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `SnapLite_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${ext}`;
}

/**
 * Download a blob directly in browser
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert canvas to Blob with mime and quality
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality = 0.95
): Promise<Blob> {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      mimeType,
      quality
    );
  });
}

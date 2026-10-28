import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Copy, X, Edit3, ZoomIn } from 'lucide-react';
import { RectBounds } from '../types/screenshot';
import { useSettingsStore } from '../stores/settingsStore';

interface CaptureOverlayProps {
  desktopImage: string; // The frozen background screenshot
  onConfirm: (cropBounds: RectBounds, quickCopy?: boolean) => void;
  onCancel: () => void;
}

type DragHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | 'create' | null;

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  desktopImage,
  onConfirm,
  onCancel,
}) => {
  const { showMagnifierLoupe } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pixelColor, setPixelColor] = useState<string>('#000000');
  const [selection, setSelection] = useState<RectBounds | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState<RectBounds | null>(null);

  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Load frozen background image
  useEffect(() => {
    const img = new Image();
    img.src = desktopImage;
    img.onload = () => {
      bgImageRef.current = img;
      renderOverlay();
    };
  }, [desktopImage]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        renderOverlay();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard controls: Enter to confirm, Esc to cancel, Ctrl+C to copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selection && selection.width > 5 && selection.height > 5) {
          onConfirm(selection, false);
        }
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selection && selection.width > 5 && selection.height > 5) {
          onConfirm(selection, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, onConfirm, onCancel]);

  // Render canvas overlay with darkened mask and transparent cutout
  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw base desktop image
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, w, h);
    }

    // 2. Draw semi-transparent dark dimming layer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, w, h);

    // 3. Clear cutout for selected region
    if (selection && selection.width > 0 && selection.height > 0) {
      const { x, y, width, height } = selection;
      ctx.clearRect(x, y, width, height);

      // Redraw original background inside cutout
      if (bgImageRef.current) {
        ctx.drawImage(
          bgImageRef.current,
          (x / w) * bgImageRef.current.width,
          (y / h) * bgImageRef.current.height,
          (width / w) * bgImageRef.current.width,
          (height / h) * bgImageRef.current.height,
          x,
          y,
          width,
          height
        );
      }

      // Border around selection
      ctx.strokeStyle = '#0078D4';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Subtle dashed inner ring
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
      ctx.restore();
    }

    // 4. Draw precision crosshairs across the cursor when not dragging handles
    if (!isDragging || dragHandle === 'create') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;

      // Full horizontal and vertical crosshair lines
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(w, mousePos.y);
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, h);
      ctx.stroke();

      // Precision center circle
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#0078D4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }, [selection, mousePos, isDragging, dragHandle]);

  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  // Read pixel color under cursor
  const updatePixelColor = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const p = ctx.getImageData(x, y, 1, 1).data;
      const hex = `#${((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1).toUpperCase()}`;
      setPixelColor(hex);
    } catch {}
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    setDragStart({ x, y });
    setIsDragging(true);

    if (selection) {
      const handle = getHandleAtPosition(x, y, selection);
      if (handle) {
        setDragHandle(handle);
        setInitialBox({ ...selection });
        return;
      }
    }

    // Start fresh selection
    setDragHandle('create');
    setSelection({ x, y, width: 0, height: 0 });
    setInitialBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    setMousePos({ x, y });
    updatePixelColor(x, y);

    if (!isDragging) return;

    if (dragHandle === 'create') {
      const left = Math.min(dragStart.x, x);
      const top = Math.min(dragStart.y, y);
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);
      setSelection({ x: left, y: top, width, height });
    } else if (dragHandle === 'move' && initialBox) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setSelection({
        x: Math.max(0, initialBox.x + dx),
        y: Math.max(0, initialBox.y + dy),
        width: initialBox.width,
        height: initialBox.height,
      });
    } else if (initialBox) {
      // Handle resizing from 8 handles
      let { x: nx, y: ny, width: nw, height: nh } = initialBox;
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (dragHandle?.includes('e')) nw = Math.max(10, initialBox.width + dx);
      if (dragHandle?.includes('s')) nh = Math.max(10, initialBox.height + dy);
      if (dragHandle?.includes('w')) {
        const nextW = Math.max(10, initialBox.width - dx);
        nx = initialBox.x + (initialBox.width - nextW);
        nw = nextW;
      }
      if (dragHandle?.includes('n')) {
        const nextH = Math.max(10, initialBox.height - dy);
        ny = initialBox.y + (initialBox.height - nextH);
        nh = nextH;
      }

      setSelection({ x: nx, y: ny, width: nw, height: nh });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
    setInitialBox(null);
  };

  const getHandleAtPosition = (x: number, y: number, box: RectBounds): DragHandle => {
    const threshold = 10;
    const { x: bx, y: by, width: bw, height: bh } = box;

    // Corner checks
    if (Math.abs(x - bx) < threshold && Math.abs(y - by) < threshold) return 'nw';
    if (Math.abs(x - (bx + bw)) < threshold && Math.abs(y - by) < threshold) return 'ne';
    if (Math.abs(x - (bx + bw)) < threshold && Math.abs(y - (by + bh)) < threshold) return 'se';
    if (Math.abs(x - bx) < threshold && Math.abs(y - (by + bh)) < threshold) return 'sw';

    // Edge checks
    if (Math.abs(y - by) < threshold && x > bx && x < bx + bw) return 'n';
    if (Math.abs(y - (by + bh)) < threshold && x > bx && x < bx + bw) return 's';
    if (Math.abs(x - bx) < threshold && y > by && y < by + bh) return 'w';
    if (Math.abs(x - (bx + bw)) < threshold && y > by && y < by + bh) return 'e';

    // Inside box
    if (x > bx && x < bx + bw && y > by && y < by + bh) return 'move';

    return null;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-50 cursor-crosshair select-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top instruction banner */}
      {!selection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-900/85 backdrop-blur-md text-white text-xs py-2 px-5 rounded-full shadow-lg border border-white/10 flex items-center gap-3 pointer-events-none">
          <span>Click and drag to select region</span>
          <span className="text-white/40">·</span>
          <span className="text-neutral-300">Esc to cancel</span>
        </div>
      )}

      {/* Magnifier Loupe (Window 11 style) */}
      {showMagnifierLoupe && (!selection || isDragging) && (
        <div
          style={{
            left: `${mousePos.x + 24}px`,
            top: `${mousePos.y + 24}px`,
          }}
          className="absolute pointer-events-none z-50 bg-neutral-900/90 text-white rounded-lg p-2 shadow-2xl border border-white/20 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
            <span className="text-neutral-400">
              X: {mousePos.x} Y: {mousePos.y}
            </span>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full border border-white/30"
                style={{ backgroundColor: pixelColor }}
              />
              <span className="text-neutral-200">{pixelColor}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dimension Badge & Quick Action Toolbar when region is selected */}
      {selection && selection.width > 20 && selection.height > 20 && (
        <>
          {/* Dimension Tag */}
          <div
            style={{
              left: `${selection.x}px`,
              top: `${Math.max(8, selection.y - 28)}px`,
            }}
            className="absolute bg-neutral-900/90 text-white text-[11px] font-mono py-0.5 px-2 rounded shadow-md pointer-events-none flex items-center gap-1 border border-white/10"
          >
            <span>{Math.round(selection.width)}</span>
            <span className="text-neutral-400">×</span>
            <span>{Math.round(selection.height)} px</span>
          </div>

          {/* Floating Action Pill */}
          <div
            style={{
              left: `${Math.min(window.innerWidth - 280, Math.max(10, selection.x + selection.width - 240))}px`,
              top: `${Math.min(window.innerHeight - 56, selection.y + selection.height + 10)}px`,
            }}
            className="absolute bg-white dark:bg-[#202020] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-1.5 flex items-center gap-1.5 z-50 animate-fadeIn"
          >
            <button
              onClick={() => onConfirm(selection, false)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium shadow-sm transition-colors"
              title="Open in Editor (Enter)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onConfirm(selection, true)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors"
              title="Copy to Clipboard (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

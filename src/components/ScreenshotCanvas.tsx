import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  AnnotationItem,
  ArrowAnnotation,
  MarkerAnnotation,
  PenAnnotation,
  RasterEffectAnnotation,
  RectBounds,
  ShapeAnnotation,
  TextAnnotation,
} from '../types/annotations';
import { useEditorStore } from '../stores/editorStore';
import { applyFastBlur, applyPixelation } from '../services/imageProcessing';
import { Check, X, Trash2 } from 'lucide-react';

export const ScreenshotCanvas: React.FC = () => {
  const {
    currentScreenshot,
    baseImage,
    canvasWidth,
    canvasHeight,
    zoom,
    activeTool,
    activeColor,
    strokeWidth,
    isFilled,
    fontSize,
    isBold,
    blurStrength,
    pixelateBlockSize,
    markerCounter,
    incrementMarkerCounter,
    annotations,
    addAnnotation,
    selectedAnnotationId,
    selectAnnotation,
    deleteAnnotation,
    updateAnnotation,
    isCropping,
    cropBox,
    setCropBox,
    commitCrop,
    cancelCrop,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentPenPoints, setCurrentPenPoints] = useState<number[]>([]);
  const [currentShapePreview, setCurrentShapePreview] = useState<RectBounds | null>(null);
  const [currentArrowPreview, setCurrentArrowPreview] = useState<[number, number, number, number] | null>(null);

  // Moving selected annotations
  const [isMovingSelected, setIsMovingSelected] = useState(false);
  const [moveStartPos, setMoveStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialAnnState, setInitialAnnState] = useState<AnnotationItem | null>(null);

  // Text input dialog state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [inputTextValue, setInputTextValue] = useState('');

  // Delete key listener for selected annotations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && !textInputPos) {
        e.preventDefault();
        deleteAnnotation(selectedAnnotationId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, textInputPos, deleteAnnotation]);

  // Main canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw base screenshot
    if (baseImage && baseImage.complete) {
      ctx.drawImage(baseImage, 0, 0, canvasWidth, canvasHeight);
    }

    // 2. Apply raster effects first (blur & pixelate) directly to canvas pixel data
    for (const ann of annotations) {
      if (ann.tool === 'blur') {
        const r = ann as RasterEffectAnnotation;
        applyFastBlur(ctx, r.x, r.y, r.width, r.height, r.strength || 16);
      } else if (ann.tool === 'pixelate') {
        const r = ann as RasterEffectAnnotation;
        applyPixelation(ctx, r.x, r.y, r.width, r.height, r.strength || 12);
      }
    }

    // 3. Draw vector annotations
    for (const ann of annotations) {
      ctx.save();
      const isSelected = ann.id === selectedAnnotationId;

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
          ctx.fillStyle = shape.color + '40';
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
        ctx.font = `${weight} ${text.fontSize}px "Segoe UI Variable", "Segoe UI", sans-serif`;
        ctx.fillStyle = text.color;
        ctx.textBaseline = 'top';
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

        ctx.beginPath();
        ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(radius * 1.1)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.number.toString(), marker.x, marker.y + 1);
      }

      // Visual outline for selected object
      if (isSelected) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#0078D4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const bounds = getAnnotationBoundingBox(ann);
        if (bounds) {
          ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
          // Corner control handles
          ctx.setLineDash([]);
          ctx.fillStyle = '#FFFFFF';
          const corners = [
            [bounds.x - 4, bounds.y - 4],
            [bounds.x + bounds.width + 4, bounds.y - 4],
            [bounds.x + bounds.width + 4, bounds.y + bounds.height + 4],
            [bounds.x - 4, bounds.y + bounds.height + 4],
          ];
          corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx - 3, cy - 3, 6, 6);
            ctx.strokeRect(cx - 3, cy - 3, 6, 6);
          });
        }
      }

      ctx.restore();
    }

    // 4. In-progress drawing preview
    if (isDrawing) {
      ctx.save();
      if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPenPoints.length >= 4) {
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = activeTool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth;
        if (activeTool === 'highlighter') ctx.globalAlpha = 0.45;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPenPoints[0], currentPenPoints[1]);
        for (let i = 2; i < currentPenPoints.length; i += 2) {
          ctx.lineTo(currentPenPoints[i], currentPenPoints[i + 1]);
        }
        ctx.stroke();
      } else if (activeTool === 'arrow' && currentArrowPreview) {
        drawArrow(
          ctx,
          currentArrowPreview[0],
          currentArrowPreview[1],
          currentArrowPreview[2],
          currentArrowPreview[3],
          activeColor,
          strokeWidth
        );
      } else if (activeTool === 'blur' || activeTool === 'pixelate') {
        if (currentShapePreview) {
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.fillStyle = 'rgba(96, 165, 250, 0.2)';
          ctx.fillRect(
            currentShapePreview.x,
            currentShapePreview.y,
            currentShapePreview.width,
            currentShapePreview.height
          );
          ctx.strokeRect(
            currentShapePreview.x,
            currentShapePreview.y,
            currentShapePreview.width,
            currentShapePreview.height
          );
        }
      } else if (activeTool === 'rectangle' && currentShapePreview) {
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = strokeWidth;
        if (isFilled) {
          ctx.fillStyle = activeColor + '40';
          ctx.fillRect(
            currentShapePreview.x,
            currentShapePreview.y,
            currentShapePreview.width,
            currentShapePreview.height
          );
        }
        ctx.strokeRect(
          currentShapePreview.x,
          currentShapePreview.y,
          currentShapePreview.width,
          currentShapePreview.height
        );
      } else if (activeTool === 'circle' && currentShapePreview) {
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = strokeWidth;
        const rx = Math.abs(currentShapePreview.width / 2);
        const ry = Math.abs(currentShapePreview.height / 2);
        const cx = currentShapePreview.x + rx;
        const cy = currentShapePreview.y + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (isFilled) {
          ctx.fillStyle = activeColor + '40';
          ctx.fill();
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Crop overlay
    if (isCropping && cropBox) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvasWidth, cropBox.y);
      ctx.fillRect(0, cropBox.y + cropBox.height, canvasWidth, canvasHeight - (cropBox.y + cropBox.height));
      ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.height);
      ctx.fillRect(cropBox.x + cropBox.width, cropBox.y, canvasWidth - (cropBox.x + cropBox.width), cropBox.height);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      const stepX = cropBox.width / 3;
      const stepY = cropBox.height / 3;
      ctx.beginPath();
      ctx.moveTo(cropBox.x + stepX, cropBox.y);
      ctx.lineTo(cropBox.x + stepX, cropBox.y + cropBox.height);
      ctx.moveTo(cropBox.x + stepX * 2, cropBox.y);
      ctx.lineTo(cropBox.x + stepX * 2, cropBox.y + cropBox.height);
      ctx.moveTo(cropBox.x, cropBox.y + stepY);
      ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + stepY);
      ctx.moveTo(cropBox.x, cropBox.y + stepY * 2);
      ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + stepY * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    baseImage,
    canvasWidth,
    canvasHeight,
    annotations,
    selectedAnnotationId,
    isDrawing,
    currentPenPoints,
    currentShapePreview,
    currentArrowPreview,
    activeTool,
    activeColor,
    strokeWidth,
    isFilled,
    isCropping,
    cropBox,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Calculate bounding box for any annotation
  const getAnnotationBoundingBox = (ann: AnnotationItem): RectBounds | null => {
    if (ann.tool === 'rectangle' || ann.tool === 'circle' || ann.tool === 'blur' || ann.tool === 'pixelate') {
      const s = ann as ShapeAnnotation;
      return { x: s.x, y: s.y, width: s.width, height: s.height };
    }
    if (ann.tool === 'marker') {
      const m = ann as MarkerAnnotation;
      const r = m.radius || 18;
      return { x: m.x - r, y: m.y - r, width: r * 2, height: r * 2 };
    }
    if (ann.tool === 'text') {
      const t = ann as TextAnnotation;
      const estWidth = t.text.length * (t.fontSize * 0.6);
      return { x: t.x, y: t.y, width: Math.max(40, estWidth), height: t.fontSize * 1.3 };
    }
    if (ann.tool === 'arrow') {
      const a = ann as ArrowAnnotation;
      const minX = Math.min(a.points[0], a.points[2]);
      const minY = Math.min(a.points[1], a.points[3]);
      const w = Math.abs(a.points[2] - a.points[0]);
      const h = Math.abs(a.points[3] - a.points[1]);
      return { x: minX, y: minY, width: Math.max(16, w), height: Math.max(16, h) };
    }
    if (ann.tool === 'pen' || ann.tool === 'highlighter') {
      const p = ann as PenAnnotation;
      if (!p.points || p.points.length < 2) return null;
      let minX = p.points[0], maxX = p.points[0];
      let minY = p.points[1], maxY = p.points[1];
      for (let i = 0; i < p.points.length; i += 2) {
        minX = Math.min(minX, p.points[i]);
        maxX = Math.max(maxX, p.points[i]);
        minY = Math.min(minY, p.points[i + 1]);
        maxY = Math.max(maxY, p.points[i + 1]);
      }
      return { x: minX, y: minY, width: Math.max(16, maxX - minX), height: Math.max(16, maxY - minY) };
    }
    return null;
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    width: number
  ) => {
    const headlen = Math.max(12, width * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setStartPoint(coords);

    if (activeTool === 'select') {
      // Check if clicking on an annotation
      const hit = annotations.slice().reverse().find((ann) => {
        const b = getAnnotationBoundingBox(ann);
        if (!b) return false;
        return (
          coords.x >= b.x - 6 &&
          coords.x <= b.x + b.width + 6 &&
          coords.y >= b.y - 6 &&
          coords.y <= b.y + b.height + 6
        );
      });

      if (hit) {
        selectAnnotation(hit.id);
        setIsMovingSelected(true);
        setMoveStartPos(coords);
        setInitialAnnState(JSON.parse(JSON.stringify(hit)));
      } else {
        selectAnnotation(null);
        setIsMovingSelected(false);
      }
      return;
    }

    setIsDrawing(true);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPenPoints([coords.x, coords.y]);
    } else if (activeTool === 'arrow') {
      setCurrentArrowPreview([coords.x, coords.y, coords.x, coords.y]);
    } else if (
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'blur' ||
      activeTool === 'pixelate'
    ) {
      setCurrentShapePreview({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else if (activeTool === 'marker') {
      const newMarker: MarkerAnnotation = {
        id: `marker_${Date.now()}`,
        tool: 'marker',
        x: coords.x,
        y: coords.y,
        number: markerCounter,
        color: activeColor,
        strokeWidth: 2,
        radius: 18,
      };
      addAnnotation(newMarker);
      incrementMarkerCounter();
      setIsDrawing(false);
    } else if (activeTool === 'text') {
      setTextInputPos(coords);
      setInputTextValue('');
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // Moving selected annotation
    if (isMovingSelected && selectedAnnotationId && initialAnnState) {
      const dx = coords.x - moveStartPos.x;
      const dy = coords.y - moveStartPos.y;

      if (initialAnnState.tool === 'pen' || initialAnnState.tool === 'highlighter') {
        const pen = initialAnnState as PenAnnotation;
        const newPts = pen.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy));
        updateAnnotation(selectedAnnotationId, { points: newPts });
      } else if (initialAnnState.tool === 'arrow') {
        const arrow = initialAnnState as ArrowAnnotation;
        updateAnnotation(selectedAnnotationId, {
          points: [
            arrow.points[0] + dx,
            arrow.points[1] + dy,
            arrow.points[2] + dx,
            arrow.points[3] + dy,
          ],
        });
      } else if ('x' in initialAnnState && 'y' in initialAnnState) {
        updateAnnotation(selectedAnnotationId, {
          x: initialAnnState.x + dx,
          y: initialAnnState.y + dy,
        });
      }
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPenPoints((prev) => [...prev, coords.x, coords.y]);
    } else if (activeTool === 'arrow') {
      setCurrentArrowPreview([startPoint.x, startPoint.y, coords.x, coords.y]);
    } else if (
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'blur' ||
      activeTool === 'pixelate'
    ) {
      const left = Math.min(startPoint.x, coords.x);
      const top = Math.min(startPoint.y, coords.y);
      const width = Math.abs(coords.x - startPoint.x);
      const height = Math.abs(coords.y - startPoint.y);
      setCurrentShapePreview({ x: left, y: top, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isMovingSelected) {
      setIsMovingSelected(false);
      setInitialAnnState(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      if (currentPenPoints.length >= 4) {
        const item: PenAnnotation = {
          id: `pen_${Date.now()}`,
          tool: activeTool,
          color: activeColor,
          strokeWidth,
          points: currentPenPoints,
        };
        addAnnotation(item);
      }
      setCurrentPenPoints([]);
    } else if (activeTool === 'arrow' && currentArrowPreview) {
      if (
        Math.hypot(
          currentArrowPreview[2] - currentArrowPreview[0],
          currentArrowPreview[3] - currentArrowPreview[1]
        ) > 5
      ) {
        const item: ArrowAnnotation = {
          id: `arrow_${Date.now()}`,
          tool: 'arrow',
          color: activeColor,
          strokeWidth,
          points: currentArrowPreview,
        };
        addAnnotation(item);
      }
      setCurrentArrowPreview(null);
    } else if ((activeTool === 'rectangle' || activeTool === 'circle') && currentShapePreview) {
      if (currentShapePreview.width > 5 && currentShapePreview.height > 5) {
        const item: ShapeAnnotation = {
          id: `${activeTool}_${Date.now()}`,
          tool: activeTool,
          color: activeColor,
          strokeWidth,
          x: currentShapePreview.x,
          y: currentShapePreview.y,
          width: currentShapePreview.width,
          height: currentShapePreview.height,
          isFilled,
        };
        addAnnotation(item);
      }
      setCurrentShapePreview(null);
    } else if ((activeTool === 'blur' || activeTool === 'pixelate') && currentShapePreview) {
      if (currentShapePreview.width > 5 && currentShapePreview.height > 5) {
        // Create first-class RasterEffectAnnotation
        const item: RasterEffectAnnotation = {
          id: `${activeTool}_${Date.now()}`,
          tool: activeTool,
          color: activeColor,
          strokeWidth: 1,
          x: currentShapePreview.x,
          y: currentShapePreview.y,
          width: currentShapePreview.width,
          height: currentShapePreview.height,
          strength: activeTool === 'blur' ? blurStrength : pixelateBlockSize,
        };
        addAnnotation(item);
      }
      setCurrentShapePreview(null);
    }
  };

  const handleApplyCrop = () => {
    if (!cropBox || !baseImage || !canvasRef.current) return;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropBox.width;
    cropCanvas.height = cropBox.height;
    const ctx = cropCanvas.getContext('2d')!;

    ctx.drawImage(
      canvasRef.current,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
      0,
      0,
      cropBox.width,
      cropBox.height
    );

    const newUrl = cropCanvas.toDataURL('image/png');
    commitCrop(newUrl, cropBox.width, cropBox.height);
  };

  const handleCommitText = () => {
    if (textInputPos && inputTextValue.trim()) {
      const newText: TextAnnotation = {
        id: `text_${Date.now()}`,
        tool: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        text: inputTextValue.trim(),
        color: activeColor,
        strokeWidth: 1,
        fontSize,
        isBold,
      };
      addAnnotation(newText);
    }
    setTextInputPos(null);
    setInputTextValue('');
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full flex items-center justify-center overflow-auto p-4 bg-transparency-grid select-none"
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative shadow-2xl rounded-sm overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`block ${
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
        />

        {/* Selected Annotation Actions (Delete button) */}
        {selectedAnnotationId && !isMovingSelected && (
          <div className="absolute top-2 right-2 z-40 bg-white dark:bg-[#252526] rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 flex items-center gap-1 animate-fadeIn">
            <button
              onClick={() => deleteAnnotation(selectedAnnotationId)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-500 hover:text-red-500 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Delete Selected Object (Delete/Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Text Input Floating Popup */}
        {textInputPos && (
          <div
            style={{
              left: `${textInputPos.x}px`,
              top: `${textInputPos.y}px`,
            }}
            className="absolute z-50 bg-white dark:bg-[#252526] p-2 rounded-xl shadow-2xl border border-neutral-300 dark:border-neutral-700 flex flex-col gap-2 min-w-[240px]"
          >
            <input
              type="text"
              autoFocus
              placeholder="Type annotation text..."
              value={inputTextValue}
              onChange={(e) => setInputTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText();
                if (e.key === 'Escape') setTextInputPos(null);
              }}
              className="py-1 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 outline-none focus:border-[#0078D4]"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setTextInputPos(null)}
                className="py-1 px-2 text-[11px] text-neutral-500 hover:text-neutral-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitText}
                className="py-1 px-3 text-[11px] font-medium bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE]"
              >
                Add Text
              </button>
            </div>
          </div>
        )}

        {/* Crop Action Controls */}
        {isCropping && cropBox && (
          <div
            style={{
              left: `${cropBox.x + cropBox.width / 2 - 80}px`,
              top: `${cropBox.y + cropBox.height + 12}px`,
            }}
            className="absolute z-50 bg-white dark:bg-[#202020] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-1.5 flex items-center gap-1.5"
          >
            <button
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-semibold shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Crop</span>
            </button>
            <button
              onClick={cancelCrop}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

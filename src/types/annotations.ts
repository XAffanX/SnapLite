export type { RectBounds } from './screenshot';

export type ToolType =
  | 'select'
  | 'pen'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'highlighter'
  | 'text'
  | 'blur'
  | 'pixelate'
  | 'marker'
  | 'crop';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity?: number;
}

export interface PenAnnotation extends BaseAnnotation {
  tool: 'pen' | 'highlighter';
  points: number[]; // [x1, y1, x2, y2, ...]
}

export interface ArrowAnnotation extends BaseAnnotation {
  tool: 'arrow';
  points: [number, number, number, number]; // [startX, startY, endX, endY]
}

export interface ShapeAnnotation extends BaseAnnotation {
  tool: 'rectangle' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  isFilled: boolean;
}

export interface TextAnnotation extends BaseAnnotation {
  tool: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  isBold?: boolean;
  width?: number;
}

export interface RasterEffectAnnotation extends BaseAnnotation {
  tool: 'blur' | 'pixelate';
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number; // blur radius or pixelate block size
}

export interface MarkerAnnotation extends BaseAnnotation {
  tool: 'marker';
  x: number;
  y: number;
  number: number;
  radius: number;
}

export type AnnotationItem =
  | PenAnnotation
  | ArrowAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | RasterEffectAnnotation
  | MarkerAnnotation;

export interface HistoryState {
  annotations: AnnotationItem[];
  rasterImageDataUrl?: string; // in case a raster crop or baked effect occurred
  canvasWidth: number;
  canvasHeight: number;
}

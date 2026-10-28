import { create } from 'zustand';
import { AnnotationItem, HistoryState, RectBounds, ToolType } from '../types/annotations';
import { ScreenshotItem } from '../types/screenshot';

interface EditorState {
  currentScreenshot: ScreenshotItem | null;
  baseImage: HTMLImageElement | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };

  activeTool: ToolType;
  activeColor: string;
  strokeWidth: number;
  isFilled: boolean;
  fontSize: number;
  isBold: boolean;
  blurStrength: number;
  pixelateBlockSize: number;
  markerCounter: number;

  annotations: AnnotationItem[];
  selectedAnnotationId: string | null;

  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Crop mode
  isCropping: boolean;
  cropBox: RectBounds | null;

  // Actions
  setScreenshot: (item: ScreenshotItem, imgElement?: HTMLImageElement) => void;
  setBaseImage: (img: HTMLImageElement) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setIsFilled: (filled: boolean) => void;
  setFontSize: (size: number) => void;
  setIsBold: (bold: boolean) => void;
  setBlurStrength: (val: number) => void;
  setPixelateBlockSize: (val: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  resetZoom: () => void;

  addAnnotation: (item: AnnotationItem) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationItem>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  incrementMarkerCounter: () => void;
  resetMarkerCounter: () => void;

  startCrop: () => void;
  setCropBox: (box: RectBounds | null) => void;
  cancelCrop: () => void;
  commitCrop: (newImageDataUrl: string, newWidth: number, newHeight: number) => void;

  commitRasterEffect: (newImageDataUrl: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetEditor: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentScreenshot: null,
  baseImage: null,
  canvasWidth: 800,
  canvasHeight: 600,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  activeTool: 'arrow',
  activeColor: '#0078D4', // Windows 11 Accent Blue
  strokeWidth: 4,
  isFilled: false,
  fontSize: 22,
  isBold: true,
  blurStrength: 16,
  pixelateBlockSize: 12,
  markerCounter: 1,

  annotations: [],
  selectedAnnotationId: null,

  history: [],
  historyIndex: -1,

  isCropping: false,
  cropBox: null,

  setScreenshot: (item, imgElement) => {
    const img = imgElement || (typeof Image !== 'undefined' ? new Image() : null);
    if (img && !imgElement) {
      img.src = item.dataUrl;
    }

    const initialState: HistoryState = {
      annotations: [],
      rasterImageDataUrl: item.dataUrl,
      canvasWidth: item.width,
      canvasHeight: item.height,
    };

    set({
      currentScreenshot: item,
      baseImage: img,
      canvasWidth: item.width,
      canvasHeight: item.height,
      annotations: [],
      selectedAnnotationId: null,
      history: [initialState],
      historyIndex: 0,
      markerCounter: 1,
      isCropping: false,
      cropBox: null,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    });
  },

  setBaseImage: (img) => set({ baseImage: img }),
  setTool: (tool) => {
    set({
      activeTool: tool,
      isCropping: tool === 'crop',
      cropBox: tool === 'crop' && get().currentScreenshot
        ? {
            x: Math.round(get().canvasWidth * 0.1),
            y: Math.round(get().canvasHeight * 0.1),
            width: Math.round(get().canvasWidth * 0.8),
            height: Math.round(get().canvasHeight * 0.8),
          }
        : null,
      selectedAnnotationId: tool === 'select' ? get().selectedAnnotationId : null,
    });
  },
  setColor: (color) => set({ activeColor: color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setIsFilled: (isFilled) => set({ isFilled }),
  setFontSize: (fontSize) => set({ fontSize }),
  setIsBold: (isBold) => set({ isBold }),
  setBlurStrength: (blurStrength) => set({ blurStrength }),
  setPixelateBlockSize: (pixelateBlockSize) => set({ pixelateBlockSize }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 4)) }),
  setPanOffset: (panOffset) => set({ panOffset }),
  resetZoom: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),

  addAnnotation: (item) => {
    const { annotations, history, historyIndex, currentScreenshot, canvasWidth, canvasHeight } = get();
    const newAnnotations = [...annotations, item];

    const newHistoryState: HistoryState = {
      annotations: newAnnotations,
      rasterImageDataUrl: currentScreenshot?.dataUrl,
      canvasWidth,
      canvasHeight,
    };

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newHistoryState);

    set({
      annotations: newAnnotations,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      selectedAnnotationId: item.id,
    });
  },

  updateAnnotation: (id, updates) => {
    const { annotations, history, historyIndex, currentScreenshot, canvasWidth, canvasHeight } = get();
    const newAnnotations = annotations.map((item) =>
      item.id === id ? ({ ...item, ...updates } as AnnotationItem) : item
    );

    const newHistoryState: HistoryState = {
      annotations: newAnnotations,
      rasterImageDataUrl: currentScreenshot?.dataUrl,
      canvasWidth,
      canvasHeight,
    };

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newHistoryState);

    set({
      annotations: newAnnotations,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  deleteAnnotation: (id) => {
    const { annotations, history, historyIndex, currentScreenshot, canvasWidth, canvasHeight } = get();
    const newAnnotations = annotations.filter((item) => item.id !== id);

    const newHistoryState: HistoryState = {
      annotations: newAnnotations,
      rasterImageDataUrl: currentScreenshot?.dataUrl,
      canvasWidth,
      canvasHeight,
    };

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newHistoryState);

    set({
      annotations: newAnnotations,
      selectedAnnotationId: null,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),
  incrementMarkerCounter: () => set((state) => ({ markerCounter: state.markerCounter + 1 })),
  resetMarkerCounter: () => set({ markerCounter: 1 }),

  startCrop: () => {
    const { canvasWidth, canvasHeight } = get();
    set({
      isCropping: true,
      activeTool: 'crop',
      cropBox: {
        x: Math.round(canvasWidth * 0.1),
        y: Math.round(canvasHeight * 0.1),
        width: Math.round(canvasWidth * 0.8),
        height: Math.round(canvasHeight * 0.8),
      },
    });
  },

  setCropBox: (cropBox) => set({ cropBox }),
  cancelCrop: () => set({ isCropping: false, cropBox: null, activeTool: 'select' }),

  commitCrop: (newImageDataUrl, newWidth, newHeight) => {
    const { currentScreenshot, history, historyIndex, annotations } = get();
    if (!currentScreenshot) return;

    const img = new Image();
    img.src = newImageDataUrl;

    const updatedScreenshot: ScreenshotItem = {
      ...currentScreenshot,
      dataUrl: newImageDataUrl,
      width: newWidth,
      height: newHeight,
    };

    const newHistoryState: HistoryState = {
      annotations: [], // Annotations are baked or cleared on crop
      rasterImageDataUrl: newImageDataUrl,
      canvasWidth: newWidth,
      canvasHeight: newHeight,
    };

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newHistoryState);

    set({
      currentScreenshot: updatedScreenshot,
      baseImage: img,
      canvasWidth: newWidth,
      canvasHeight: newHeight,
      annotations: [],
      isCropping: false,
      cropBox: null,
      activeTool: 'select',
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  commitRasterEffect: (newImageDataUrl) => {
    const { currentScreenshot, history, historyIndex, annotations, canvasWidth, canvasHeight } = get();
    if (!currentScreenshot) return;

    const img = new Image();
    img.src = newImageDataUrl;

    const updatedScreenshot: ScreenshotItem = {
      ...currentScreenshot,
      dataUrl: newImageDataUrl,
    };

    const newHistoryState: HistoryState = {
      annotations,
      rasterImageDataUrl: newImageDataUrl,
      canvasWidth,
      canvasHeight,
    };

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newHistoryState);

    set({
      currentScreenshot: updatedScreenshot,
      baseImage: img,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, currentScreenshot } = get();
    if (historyIndex <= 0) return;

    const targetIndex = historyIndex - 1;
    const targetState = history[targetIndex];

    if (targetState.rasterImageDataUrl && currentScreenshot && targetState.rasterImageDataUrl !== currentScreenshot.dataUrl) {
      const img = new Image();
      img.src = targetState.rasterImageDataUrl;
      set({
        baseImage: img,
        currentScreenshot: {
          ...currentScreenshot,
          dataUrl: targetState.rasterImageDataUrl,
          width: targetState.canvasWidth,
          height: targetState.canvasHeight,
        },
      });
    }

    set({
      annotations: targetState.annotations,
      canvasWidth: targetState.canvasWidth,
      canvasHeight: targetState.canvasHeight,
      historyIndex: targetIndex,
      selectedAnnotationId: null,
    });
  },

  redo: () => {
    const { history, historyIndex, currentScreenshot } = get();
    if (historyIndex >= history.length - 1) return;

    const targetIndex = historyIndex + 1;
    const targetState = history[targetIndex];

    if (targetState.rasterImageDataUrl && currentScreenshot && targetState.rasterImageDataUrl !== currentScreenshot.dataUrl) {
      const img = new Image();
      img.src = targetState.rasterImageDataUrl;
      set({
        baseImage: img,
        currentScreenshot: {
          ...currentScreenshot,
          dataUrl: targetState.rasterImageDataUrl,
          width: targetState.canvasWidth,
          height: targetState.canvasHeight,
        },
      });
    }

    set({
      annotations: targetState.annotations,
      canvasWidth: targetState.canvasWidth,
      canvasHeight: targetState.canvasHeight,
      historyIndex: targetIndex,
      selectedAnnotationId: null,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  resetEditor: () => {
    set({
      currentScreenshot: null,
      baseImage: null,
      annotations: [],
      selectedAnnotationId: null,
      history: [],
      historyIndex: -1,
      isCropping: false,
      cropBox: null,
      markerCounter: 1,
    });
  },
}));

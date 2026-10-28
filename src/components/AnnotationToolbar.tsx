import React, { useState } from 'react';
import {
  MousePointer,
  Pen,
  ArrowRight,
  Square,
  Circle,
  Highlighter,
  Type,
  EyeOff,
  Grid,
  Hash,
  Crop,
  Undo2,
  Redo2,
  Copy,
  Download,
  Palette,
  Minus,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ToolType } from '../types/annotations';
import { useEditorStore } from '../stores/editorStore';

interface AnnotationToolbarProps {
  onCopy: () => void;
  onSave: (format: 'png' | 'jpeg' | 'webp') => void;
  isCopied?: boolean;
}

const PRESET_COLORS = [
  { name: 'Windows Blue', hex: '#0078D4' },
  { name: 'Crimson Red', hex: '#E81123' },
  { name: 'Emerald Green', hex: '#107C41' },
  { name: 'Amber Gold', hex: '#FFB900' },
  { name: 'Purple', hex: '#881798' },
  { name: 'Dark Slate', hex: '#1E293B' },
  { name: 'Pure White', hex: '#FFFFFF' },
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  onCopy,
  onSave,
  isCopied = false,
}) => {
  const {
    activeTool,
    setTool,
    activeColor,
    setColor,
    strokeWidth,
    setStrokeWidth,
    isFilled,
    setIsFilled,
    fontSize,
    setFontSize,
    isBold,
    setIsBold,
    blurStrength,
    setBlurStrength,
    pixelateBlockSize,
    setPixelateBlockSize,
    undo,
    redo,
    canUndo,
    canRedo,
    startCrop,
    cancelCrop,
    isCropping,
    zoom,
    setZoom,
    resetZoom,
  } = useEditorStore();

  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showStrokePopover, setShowStrokePopover] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select & Move', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
    { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-4 h-4" />, shortcut: 'A' },
    { id: 'pen', label: 'Freehand Pen', icon: <Pen className="w-4 h-4" />, shortcut: 'P' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle & Ellipse', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
    { id: 'highlighter', label: 'Highlighter', icon: <Highlighter className="w-4 h-4" />, shortcut: 'H' },
    { id: 'text', label: 'Text Box', icon: <Type className="w-4 h-4" />, shortcut: 'T' },
    { id: 'blur', label: 'Pixel Blur', icon: <EyeOff className="w-4 h-4" />, shortcut: 'B' },
    { id: 'pixelate', label: 'Mosaic Pixelate', icon: <Grid className="w-4 h-4" />, shortcut: 'X' },
    { id: 'marker', label: 'Numbered Step', icon: <Hash className="w-4 h-4" />, shortcut: 'N' },
    { id: 'crop', label: 'Crop Image', icon: <Crop className="w-4 h-4" />, shortcut: 'C' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl select-none z-30 transition-all">
      {/* Primary Tool Group */}
      <div className="flex items-center gap-1">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'crop') {
                  startCrop();
                } else {
                  setTool(t.id);
                }
              }}
              title={`${t.label} (${t.shortcut})`}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#0078D4] text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

      {/* Style & Color Modifiers */}
      <div className="flex items-center gap-1.5 relative">
        {/* Color Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColorPopover(!showColorPopover)}
            title="Stroke & Shape Color"
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 transition-colors"
          >
            <span
              className="w-5 h-5 rounded-lg border border-black/10 shadow-sm"
              style={{ backgroundColor: activeColor }}
            />
            <Palette className="w-3.5 h-3.5 text-neutral-500" />
          </button>

          {/* Color Popover */}
          {showColorPopover && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-[#242424] p-3 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-3 z-50 min-w-[200px] animate-fadeIn">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                Preset Colors
              </span>
              <div className="grid grid-cols-7 gap-1.5">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    onClick={() => {
                      setColor(col.hex);
                      setShowColorPopover(false);
                    }}
                    title={col.name}
                    className="w-6 h-6 rounded-lg border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: col.hex }}
                  >
                    {activeColor === col.hex && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          col.hex === '#FFFFFF' ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">Custom</span>
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[11px] font-mono text-neutral-500 uppercase">
                  {activeColor}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stroke / Size Settings */}
        <div className="relative">
          <button
            onClick={() => setShowStrokePopover(!showStrokePopover)}
            title="Stroke Width & Effects"
            className="px-2 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            <div
              className="rounded-full bg-neutral-800 dark:bg-neutral-200"
              style={{ width: `${Math.min(16, strokeWidth + 2)}px`, height: `${Math.min(16, strokeWidth + 2)}px` }}
            />
            <span className="font-mono text-[11px]">{strokeWidth}px</span>
          </button>

          {showStrokePopover && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-[#242424] p-3 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-3 z-50 min-w-[220px] animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span>Stroke Width</span>
                <span className="font-mono">{strokeWidth} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full accent-[#0078D4]"
              />

              {/* Tool-specific sliders */}
              {activeTool === 'text' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                    <span>Font Size</span>
                    <span className="font-mono">{fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="64"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-[#0078D4]"
                  />
                  <button
                    onClick={() => setIsBold(!isBold)}
                    className={`py-1 px-2 rounded text-xs font-bold border ${
                      isBold
                        ? 'bg-[#0078D4] text-white border-[#0078D4]'
                        : 'text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    Bold (B)
                  </button>
                </div>
              )}

              {(activeTool === 'rectangle' || activeTool === 'circle') && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Fill Shape</span>
                  <input
                    type="checkbox"
                    checked={isFilled}
                    onChange={(e) => setIsFilled(e.target.checked)}
                    className="rounded accent-[#0078D4]"
                  />
                </div>
              )}

              {activeTool === 'blur' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                    <span>Blur Strength</span>
                    <span className="font-mono">{blurStrength} px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="40"
                    value={blurStrength}
                    onChange={(e) => setBlurStrength(Number(e.target.value))}
                    className="w-full accent-[#0078D4]"
                  />
                </div>
              )}

              {activeTool === 'pixelate' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                    <span>Pixel Block Size</span>
                    <span className="font-mono">{pixelateBlockSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={pixelateBlockSize}
                    onChange={(e) => setPixelateBlockSize(Number(e.target.value))}
                    className="w-full accent-[#0078D4]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

      {/* Undo / Redo & Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Y)"
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="flex items-center text-xs text-neutral-500 ml-1">
          <button
            onClick={() => setZoom(zoom - 0.15)}
            title="Zoom Out"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            title="Fit to Screen"
            className="px-1.5 py-1 font-mono text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(zoom + 0.15)}
            title="Zoom In"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

      {/* Primary Export Actions: Copy & Save */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            isCopied
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0078D4] hover:bg-[#106EBE] text-white'
          }`}
          title="Copy Image to Clipboard (Ctrl+C)"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="whitespace-nowrap">{isCopied ? 'Copied!' : 'Copy'}</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors"
            title="Save Screenshot (Ctrl+S)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {showSaveMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#242424] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-1.5 min-w-[150px] z-50 flex flex-col gap-0.5 animate-fadeIn">
              <button
                onClick={() => {
                  onSave('png');
                  setShowSaveMenu(false);
                }}
                className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              >
                Save as PNG (Lossless)
              </button>
              <button
                onClick={() => {
                  onSave('jpeg');
                  setShowSaveMenu(false);
                }}
                className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              >
                Save as JPEG (Compressed)
              </button>
              <button
                onClick={() => {
                  onSave('webp');
                  setShowSaveMenu(false);
                }}
                className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              >
                Save as WebP (Modern)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

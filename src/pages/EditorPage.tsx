import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, Copy, Download, Sparkles } from 'lucide-react';
import { AnnotationToolbar } from '../components/AnnotationToolbar';
import { ScreenshotCanvas } from '../components/ScreenshotCanvas';
import { useEditorStore } from '../stores/editorStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  canvasToBlob,
  generateScreenshotFilename,
  renderCompositeCanvas,
  triggerFileDownload,
} from '../services/imageProcessing';
import { copyToClipboard } from '../services/tauriBridge';

interface EditorPageProps {
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({ onBack, onToast }) => {
  const {
    currentScreenshot,
    baseImage,
    annotations,
    canvasWidth,
    canvasHeight,
    undo,
    redo,
    setTool,
  } = useEditorStore();

  const { defaultFormat, defaultQuality } = useSettingsStore();

  const [isCopied, setIsCopied] = useState(false);

  // Global hotkeys inside editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input element is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 'c') {
          e.preventDefault();
          handleCopy();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave(defaultFormat);
        }
      } else {
        // Single key shortcuts
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 'a':
            setTool('arrow');
            break;
          case 'p':
            setTool('pen');
            break;
          case 'r':
            setTool('rectangle');
            break;
          case 'o':
            setTool('circle');
            break;
          case 'h':
            setTool('highlighter');
            break;
          case 't':
            setTool('text');
            break;
          case 'b':
            setTool('blur');
            break;
          case 'x':
            setTool('pixelate');
            break;
          case 'n':
            setTool('marker');
            break;
          case 'c':
            setTool('crop');
            break;
          case 'escape':
            onBack();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setTool, defaultFormat, onBack]);

  // Handle Copy to Clipboard: renders full composite canvas at 1:1 original pixel fidelity
  const handleCopy = useCallback(async () => {
    if (!baseImage) return;

    try {
      const compCanvas = await renderCompositeCanvas(
        baseImage,
        annotations,
        canvasWidth,
        canvasHeight
      );
      const blob = await canvasToBlob(compCanvas, 'png', 1.0);
      const success = await copyToClipboard(blob);

      if (success) {
        setIsCopied(true);
        onToast('Copied screenshot to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        onToast('Failed to copy to clipboard');
      }
    } catch (err) {
      console.error('Copy error', err);
      onToast('Error copying image');
    }
  }, [baseImage, annotations, canvasWidth, canvasHeight, onToast]);

  // Handle Save File
  const handleSave = useCallback(
    async (format: 'png' | 'jpeg' | 'webp' = 'png') => {
      if (!baseImage) return;

      try {
        const compCanvas = await renderCompositeCanvas(
          baseImage,
          annotations,
          canvasWidth,
          canvasHeight
        );
        const quality = defaultQuality / 100;
        const blob = await canvasToBlob(compCanvas, format, quality);
        const filename = generateScreenshotFilename(format);
        triggerFileDownload(blob, filename);
        onToast(`Saved as ${filename}`);
      } catch (err) {
        console.error('Save error', err);
        onToast('Error saving file');
      }
    },
    [baseImage, annotations, canvasWidth, canvasHeight, defaultQuality, onToast]
  );

  return (
    <div className="flex-1 w-full flex flex-col bg-neutral-100 dark:bg-[#1A1A1A] overflow-hidden select-none relative">
      {/* Top Navigation Bar */}
      <div className="h-12 w-full bg-white dark:bg-[#202020] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate max-w-[200px] sm:max-w-xs">
              {currentScreenshot?.title || 'Screenshot Editor'}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
              {canvasWidth} × {canvasHeight} px
            </span>
          </div>
        </div>

        <div className="text-xs text-neutral-400 hidden sm:block">
          Press <span className="font-mono text-neutral-600 dark:text-neutral-200">Ctrl + C</span> to Copy · <span className="font-mono text-neutral-600 dark:text-neutral-200">Ctrl + S</span> to Save
        </div>
      </div>

      {/* Floating Toolbar Container */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-4xl w-[95%] sm:w-auto">
        <AnnotationToolbar
          onCopy={handleCopy}
          onSave={handleSave}
          isCopied={isCopied}
        />
      </div>

      {/* Main Annotation Canvas Workspace */}
      <ScreenshotCanvas />
    </div>
  );
};

import React from 'react';
import { Copy, Edit3, Trash2, Download, Image as ImageIcon, Check } from 'lucide-react';
import { ScreenshotItem } from '../types/screenshot';
import { useRecentStore } from '../stores/recentStore';
import { copyToClipboard } from '../services/tauriBridge';
import { triggerFileDownload } from '../services/imageProcessing';

interface RecentScreenshotsProps {
  onOpenInEditor: (item: ScreenshotItem) => void;
  onToast: (msg: string) => void;
}

export const RecentScreenshots: React.FC<RecentScreenshotsProps> = ({
  onOpenInEditor,
  onToast,
}) => {
  const { screenshots, removeScreenshot, clearAll } = useRecentStore();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = async (item: ScreenshotItem) => {
    try {
      const response = await fetch(item.dataUrl);
      const blob = await response.blob();
      const success = await copyToClipboard(blob);
      if (success) {
        setCopiedId(item.id);
        onToast('Copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.error(e);
      onToast('Failed to copy to clipboard');
    }
  };

  const handleDownload = async (item: ScreenshotItem) => {
    try {
      const response = await fetch(item.dataUrl);
      const blob = await response.blob();
      triggerFileDownload(blob, item.title || `SnapLite_${item.timestamp}.png`);
      onToast('Saved to downloads');
    } catch (e) {
      console.error(e);
    }
  };

  if (screenshots.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center bg-white/40 dark:bg-neutral-900/20">
        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-3">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          No Recent Screenshots
        </p>
        <p className="text-[11px] text-neutral-400 max-w-xs">
          Press <span className="font-mono text-neutral-600 dark:text-neutral-200">Ctrl + Shift + S</span> to capture a region or select an option above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Recent Captures
          </span>
          <span className="text-[11px] font-mono text-neutral-400">
            ({screenshots.length})
          </span>
        </div>
        <button
          onClick={clearAll}
          className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {screenshots.map((s) => {
          const isCopied = copiedId === s.id;
          const dateStr = new Date(s.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={s.id}
              className="group relative bg-white dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              {/* Image Preview Container */}
              <div
                onClick={() => onOpenInEditor(s)}
                className="relative h-32 w-full bg-transparency-grid cursor-pointer overflow-hidden flex items-center justify-center"
              >
                <img
                  src={s.dataUrl}
                  alt={s.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                />

                {/* Hover overlay with Reopen Icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="py-1 px-3 rounded-lg bg-white/90 text-neutral-900 text-xs font-semibold flex items-center gap-1.5 shadow-md">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </div>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-2.5 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-[#202020]">
                <div className="truncate">
                  <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {s.width} × {s.height} px · {dateStr}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(s)}
                    title="Copy to Clipboard"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDownload(s)}
                    title="Save File"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => removeScreenshot(s.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

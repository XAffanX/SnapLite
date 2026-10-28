import React from 'react';
import { Minus, Square, X, Camera, ShieldCheck } from 'lucide-react';
import { isTauri } from '../services/tauriBridge';

interface TitleBarProps {
  title?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isMaximized?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  title = 'SnapLite',
  onMinimize,
  onMaximize,
  onClose,
  isMaximized = false,
}) => {
  const handleClose = async () => {
    if (onClose) {
      onClose();
    } else if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = getCurrentWebviewWindow();
        await win.hide(); // Minimize to tray on close
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
    } else if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = getCurrentWebviewWindow();
        await win.minimize();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMaximize = async () => {
    if (onMaximize) {
      onMaximize();
    } else if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = getCurrentWebviewWindow();
        await win.toggleMaximize();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-10 w-full bg-white dark:bg-[#202020] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3 select-none z-50 shrink-0"
    >
      {/* Brand Zone: 1-line wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-[#0078D4] text-white flex items-center justify-center shadow-sm">
          <Camera className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
          {title}
        </span>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
          v0.1.0
        </span>
      </div>

      {/* Middle Status / Mode info */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
        <ShieldCheck className="w-3 h-3 text-neutral-400" />
        <span>100% Offline · Private</span>
      </div>

      {/* Windows 11 Native Window Controls */}
      <div className="flex items-center -mr-3 h-10">
        <button
          onClick={handleMinimize}
          title="Minimize to Tray"
          className="h-10 w-11 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="h-10 w-11 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          title="Close (Minimizes to Tray)"
          className="h-10 w-11 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#E81123] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

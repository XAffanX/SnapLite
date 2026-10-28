import React, { useState, useRef, useEffect } from 'react';
import { Camera, Settings, AppWindow, Monitor, X, Power, ChevronUp } from 'lucide-react';

interface SystemTraySimulatorProps {
  onCaptureRegion: () => void;
  onCaptureFullscreen: () => void;
  onCaptureWindow: () => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  isMinimized: boolean;
  onRestore: () => void;
}

export const SystemTraySimulator: React.FC<SystemTraySimulatorProps> = ({
  onCaptureRegion,
  onCaptureFullscreen,
  onCaptureWindow,
  onOpenDashboard,
  onOpenSettings,
  isMinimized,
  onRestore,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleLeftClick = () => {
    if (isMinimized) {
      onRestore();
    } else {
      setShowMenu(!showMenu);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end select-none">
      {/* Fluent Windows 11 Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="mb-2 bg-white/95 dark:bg-[#252526]/95 backdrop-blur-md rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-1 min-w-[210px] flex flex-col gap-0.5 animate-fadeIn z-50 text-neutral-800 dark:text-neutral-100 text-xs"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span>SnapLite Tray Menu</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>

          <button
            onClick={() => {
              setShowMenu(false);
              onCaptureRegion();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Capture Region</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Ctrl+Shift+S</span>
          </button>

          <button
            onClick={() => {
              setShowMenu(false);
              onCaptureFullscreen();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-neutral-500" />
              <span>Capture Fullscreen</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Ctrl+Shift+F</span>
          </button>

          <button
            onClick={() => {
              setShowMenu(false);
              onCaptureWindow();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <AppWindow className="w-3.5 h-3.5 text-neutral-500" />
              <span>Capture Window</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Ctrl+Shift+W</span>
          </button>

          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />

          <button
            onClick={() => {
              setShowMenu(false);
              onOpenDashboard();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors font-medium"
          >
            <span>Open SnapLite</span>
          </button>

          <button
            onClick={() => {
              setShowMenu(false);
              onOpenSettings();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-500" />
            <span>Settings</span>
          </button>

          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />

          <button
            onClick={() => {
              setShowMenu(false);
              window.location.reload();
            }}
            className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Quit SnapLite</span>
          </button>
        </div>
      )}

      {/* Tray Widget Pod */}
      <div className="flex items-center gap-2 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={handleLeftClick}
          onContextMenu={handleContextMenu}
          title="SnapLite Tray Icon (Left click to open, Right click for context menu)"
          className="relative p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-[#0078D4]"
        >
          <Camera className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </button>

        {isMinimized && (
          <button
            onClick={onRestore}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-[#0078D4] text-white text-xs font-semibold shadow-sm hover:bg-[#106EBE] transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Restore</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AppWindow, X, Search, Check, AlertCircle } from 'lucide-react';
import { WindowInfo } from '../types/screenshot';
import { queryWindowsNative } from '../services/tauriBridge';

interface WindowSelectorModalProps {
  onSelectWindow: (windowId: string) => void;
  onClose: () => void;
}

export const WindowSelectorModal: React.FC<WindowSelectorModalProps> = ({
  onSelectWindow,
  onClose,
}) => {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWindows = async () => {
      setIsLoading(true);
      try {
        const list = await queryWindowsNative();
        setWindows(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      } catch (e) {
        console.warn('Failed to query native windows:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWindows();
  }, []);

  const filtered = windows.filter(
    (w) =>
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.appName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-[#202020] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0078D4] flex items-center justify-center">
              <AppWindow className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Capture Application Window
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Select an active desktop window to capture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search active windows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 outline-none focus:border-[#0078D4]"
            />
          </div>
        </div>

        {/* Window List */}
        <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Querying active Windows applications...
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((win) => {
              const isSelected = win.id === selectedId;
              return (
                <div
                  key={win.id}
                  onClick={() => setSelectedId(win.id)}
                  onDoubleClick={() => onSelectWindow(win.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#0078D4] shadow-sm'
                      : 'bg-white dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg shrink-0">
                      {win.icon || '🪟'}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                        {win.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {win.appName} · {win.width} × {win.height} px
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#0078D4] text-white flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6 text-neutral-400" />
              <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                No active Windows applications enumerated
              </p>
              <p className="text-[11px] text-neutral-400 max-w-sm">
                In the standalone Windows app, SnapLite lists all running desktop windows via the Win32 API. You can also proceed directly to window capture.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelectWindow(selectedId || 'active')}
            className="py-1.5 px-5 rounded-lg text-xs font-semibold bg-[#0078D4] hover:bg-[#106EBE] text-white shadow-sm transition-colors"
          >
            Capture Window
          </button>
        </div>
      </div>
    </div>
  );
};

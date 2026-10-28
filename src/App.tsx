import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Dashboard } from './pages/Dashboard';
import { EditorPage } from './pages/EditorPage';
import { SettingsPanel } from './components/SettingsPanel';
import { CaptureOverlay } from './components/CaptureOverlay';
import { CaptureCountdown } from './components/CaptureCountdown';
import { WindowSelectorModal } from './components/WindowSelectorModal';
import { SystemTraySimulator } from './components/SystemTraySimulator';
import { CaptureMode, RectBounds, ScreenshotItem } from './types/screenshot';
import { useEditorStore } from './stores/editorStore';
import { useRecentStore } from './stores/recentStore';
import { useSettingsStore } from './stores/settingsStore';
import {
  captureScreenNative,
  copyToClipboard,
  playShutterSound,
  isTauri,
} from './services/tauriBridge';
import { generateScreenshotFilename } from './services/imageProcessing';

interface RegionCropEventPayload {
  dataUrl: string;
  width: number;
  height: number;
  quickCopy: boolean;
}

export default function App() {
  const { setScreenshot, resetEditor } = useEditorStore();
  const { addScreenshot } = useRecentStore();
  const {
    shortcuts,
    theme,
    minimizeToTrayOnClose,
    soundEffects,
    copyAfterCapture,
    quickCaptureMode,
  } = useSettingsStore();

  const [currentView, setCurrentView] = useState<'dashboard' | 'editor' | 'settings'>('dashboard');
  const [isMinimized, setIsMinimized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overlay & modal states (browser fallback & delayed capture)
  const [overlayActive, setOverlayActive] = useState(false);
  const [frozenDesktopImage, setFrozenDesktopImage] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [pendingCaptureMode, setPendingCaptureMode] = useState<CaptureMode | null>(null);
  const [windowSelectorActive, setWindowSelectorActive] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Theme synchronization with document class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Execute screen capture grab (fullscreen or specific window)
  const executeCapture = useCallback(
    async (mode: CaptureMode, bounds?: RectBounds, windowId?: string, isQuickCopy = false) => {
      try {
        if (soundEffects) {
          playShutterSound();
        }

        const dataUrl = await captureScreenNative(mode, bounds, windowId);
        const img = new Image();
        img.src = dataUrl;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load captured screenshot image'));
        });

        const newItem: ScreenshotItem = {
          id: `snap_${Date.now()}`,
          dataUrl,
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080,
          timestamp: Date.now(),
          title: generateScreenshotFilename('png'),
          mode,
        };

        addScreenshot(newItem);

        // Quick copy if requested or enabled in preferences
        if (isQuickCopy || quickCaptureMode || copyAfterCapture) {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          const copied = await copyToClipboard(blob);
          if (copied) {
            showToast('Screenshot copied to clipboard!');
          }
        }

        // Open in editor if not in pure quick copy mode
        if (!isQuickCopy && !quickCaptureMode) {
          setScreenshot(newItem, img);
          setCurrentView('editor');
          setIsMinimized(false);
        } else {
          showToast('Screenshot saved to history');
        }
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || 'Capture failed';
        console.error('Capture execution error:', err);
        showToast(errorMsg);
      }
    },
    [soundEffects, quickCaptureMode, copyAfterCapture, addScreenshot, setScreenshot, showToast]
  );

  // Trigger capture workflow with optional countdown delay
  const handleTriggerCapture = useCallback(
    async (mode: CaptureMode, delaySec = 0) => {
      if (mode === 'window') {
        setWindowSelectorActive(true);
        return;
      }

      if (delaySec > 0) {
        setPendingCaptureMode(mode);
        setCountdownSeconds(delaySec);
        return;
      }

      if (mode === 'region') {
        try {
          if (isTauri()) {
            // In Tauri: call start_region_selection which hides main window, captures
            // virtual desktop, and opens the visible overlay window running OverlayWindow.tsx
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('start_region_selection');
          } else {
            // Web environment: snapshot screen and open in-page overlay component
            const desktopImage = await captureScreenNative('fullscreen');
            setFrozenDesktopImage(desktopImage);
            setOverlayActive(true);
          }
        } catch (err: unknown) {
          const errorMsg = (err as Error)?.message || 'Region capture initialization failed';
          console.error('Region capture start error:', err);
          showToast(errorMsg);
        }
      } else {
        await executeCapture(mode);
      }
    },
    [executeCapture, showToast]
  );

  // Priority 3: Delayed capture countdown completion uses the EXACT same capture path
  const handleCountdownComplete = useCallback(() => {
    const mode = pendingCaptureMode || 'fullscreen';
    setCountdownSeconds(null);
    setPendingCaptureMode(null);

    if (mode === 'region') {
      handleTriggerCapture('region', 0);
    } else {
      executeCapture(mode);
    }
  }, [pendingCaptureMode, handleTriggerCapture, executeCapture]);

  // Handle region completion for browser fallback
  const handleBrowserRegionConfirmed = useCallback(
    async (bounds: RectBounds, quickCopy = false) => {
      setOverlayActive(false);
      if (!frozenDesktopImage) return;

      try {
        const img = new Image();
        img.src = frozenDesktopImage;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to parse frozen desktop image'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;

        ctx.drawImage(
          img,
          bounds.x * scaleX,
          bounds.y * scaleY,
          bounds.width * scaleX,
          bounds.height * scaleY,
          0,
          0,
          bounds.width,
          bounds.height
        );

        const croppedDataUrl = canvas.toDataURL('image/png');

        const newItem: ScreenshotItem = {
          id: `snap_${Date.now()}`,
          dataUrl: croppedDataUrl,
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          timestamp: Date.now(),
          title: generateScreenshotFilename('png'),
          mode: 'region',
        };

        if (soundEffects) {
          playShutterSound();
        }

        addScreenshot(newItem);

        if (quickCopy || quickCaptureMode || copyAfterCapture) {
          const resp = await fetch(croppedDataUrl);
          const blob = await resp.blob();
          const copied = await copyToClipboard(blob);
          if (copied) {
            showToast('Selected region copied to clipboard!');
          }
        }

        if (!quickCopy && !quickCaptureMode) {
          const cropImg = new Image();
          cropImg.src = croppedDataUrl;
          setScreenshot(newItem, cropImg);
          setCurrentView('editor');
          setIsMinimized(false);
        }
      } catch (err: unknown) {
        showToast((err as Error)?.message || 'Failed to crop selected region');
      }
    },
    [frozenDesktopImage, soundEffects, addScreenshot, quickCaptureMode, copyAfterCapture, setScreenshot, showToast]
  );

  // Listen to Tauri backend events (region capture complete, tray clicks, global shortcuts, conflict reporting)
  useEffect(() => {
    if (isTauri()) {
      let isSubscribed = true;
      let cleanups: (() => void)[] = [];

      (async () => {
        try {
          const { listen } = await import('@tauri-apps/api/event');

          // Priority 1: When overlay window confirms region crop, Rust emits region-capture-complete to main window
          const unlistenComplete = await listen<RegionCropEventPayload>('region-capture-complete', (event) => {
            if (!isSubscribed || !event.payload) return;
            const { dataUrl, width, height, quickCopy } = event.payload;

            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
              const newItem: ScreenshotItem = {
                id: `snap_${Date.now()}`,
                dataUrl,
                width,
                height,
                timestamp: Date.now(),
                title: generateScreenshotFilename('png'),
                mode: 'region',
              };

              addScreenshot(newItem);

              if (quickCopy || quickCaptureMode || copyAfterCapture) {
                showToast('Region copied to clipboard!');
              }

              if (!quickCopy && !quickCaptureMode) {
                setScreenshot(newItem, img);
                setCurrentView('editor');
                setIsMinimized(false);
              }
            };
          });
          cleanups.push(unlistenComplete);

          // Priority 2: Tray capture and global shortcut capture
          const unlistenGlobal = await listen<string>('trigger-global-capture', (event) => {
            if (isSubscribed) {
              handleTriggerCapture(event.payload as CaptureMode);
            }
          });
          cleanups.push(unlistenGlobal);

          const unlistenTray = await listen<string>('tray-trigger-capture', (event) => {
            if (isSubscribed) {
              handleTriggerCapture(event.payload as CaptureMode);
            }
          });
          cleanups.push(unlistenTray);

          // Priority 4: Shortcut conflict warning
          const unlistenConflict = await listen<Array<{ shortcut: string; error: string }>>(
            'shortcut-conflicts-detected',
            (event) => {
              if (isSubscribed && event.payload && event.payload.length > 0) {
                const names = event.payload.map((c) => c.shortcut).join(', ');
                showToast(`Shortcut conflict: ${names} is used by another app. Use dashboard buttons or rebind.`);
              }
            }
          );
          cleanups.push(unlistenConflict);

          const unlistenSettings = await listen('open-settings', () => {
            if (isSubscribed) {
              setIsMinimized(false);
              setCurrentView('settings');
            }
          });
          cleanups.push(unlistenSettings);
        } catch (e) {
          console.warn('Tauri event listeners initialization notice:', e);
        }
      })();

      return () => {
        isSubscribed = false;
        cleanups.forEach((cleanup) => cleanup());
      };
    }
  }, [handleTriggerCapture, addScreenshot, setScreenshot, quickCaptureMode, copyAfterCapture, showToast]);

  // Global browser keyboard shortcut listeners
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Region Capture: Ctrl + Shift + S
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        handleTriggerCapture('region');
      }
      // Fullscreen Capture: Ctrl + Shift + F
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        handleTriggerCapture('fullscreen');
      }
      // Window Capture: Ctrl + Shift + W
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
        e.preventDefault();
        handleTriggerCapture('window');
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleTriggerCapture]);

  const handleOpenInEditor = (item: ScreenshotItem) => {
    const img = new Image();
    img.src = item.dataUrl;
    img.onload = () => {
      setScreenshot(item, img);
      setCurrentView('editor');
    };
  };

  const handleCloseWindow = () => {
    if (minimizeToTrayOnClose) {
      setIsMinimized(true);
      showToast('SnapLite minimized to system tray');
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F3F4F6] dark:bg-[#1E1E1E] text-neutral-800 dark:text-neutral-100 overflow-hidden relative font-sans">
      {/* Windows 11 TitleBar */}
      {!isMinimized && (
        <TitleBar
          title={
            currentView === 'editor'
              ? 'SnapLite — Screenshot Editor'
              : currentView === 'settings'
              ? 'SnapLite — Settings'
              : 'SnapLite'
          }
          onMinimize={() => setIsMinimized(true)}
          onClose={handleCloseWindow}
        />
      )}

      {/* Main View Router */}
      {!isMinimized ? (
        <main className="flex-1 w-full flex flex-col overflow-hidden relative">
          {currentView === 'dashboard' && (
            <Dashboard
              onTriggerCapture={handleTriggerCapture}
              onOpenSettings={() => setCurrentView('settings')}
              onOpenInEditor={handleOpenInEditor}
              onToast={showToast}
            />
          )}

          {currentView === 'editor' && (
            <EditorPage
              onBack={() => {
                resetEditor();
                setCurrentView('dashboard');
              }}
              onToast={showToast}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPanel
              onBack={() => setCurrentView('dashboard')}
              onToast={showToast}
            />
          )}
        </main>
      ) : (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center bg-[#F3F4F6]/50 dark:bg-[#1E1E1E]/50">
          <div className="max-w-sm bg-white dark:bg-[#252526] p-6 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0078D4] flex items-center justify-center mb-3">
              <span className="text-xl">🪟</span>
            </div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
              SnapLite Running in Background
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Use global shortcuts anytime:
              <br />
              <span className="font-mono text-[#0078D4]">{shortcuts.region}</span> for Region Capture
            </p>
            <button
              onClick={() => setIsMinimized(false)}
              className="py-1.5 px-4 rounded-lg bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Restore Window
            </button>
          </div>
        </div>
      )}

      {/* Region Selection Overlay (Browser fallback when not running in Tauri multi-window mode) */}
      {overlayActive && frozenDesktopImage && (
        <CaptureOverlay
          desktopImage={frozenDesktopImage}
          onConfirm={handleBrowserRegionConfirmed}
          onCancel={() => setOverlayActive(false)}
        />
      )}

      {/* Delay Countdown Overlay */}
      {countdownSeconds !== null && (
        <CaptureCountdown
          seconds={countdownSeconds}
          onComplete={handleCountdownComplete}
          onCancel={() => {
            setCountdownSeconds(null);
            setPendingCaptureMode(null);
          }}
        />
      )}

      {/* Window Selector Modal */}
      {windowSelectorActive && (
        <WindowSelectorModal
          onSelectWindow={(wid) => {
            setWindowSelectorActive(false);
            executeCapture('window', undefined, wid);
          }}
          onClose={() => setWindowSelectorActive(false)}
        />
      )}

      {/* System Tray Simulator (bottom right taskbar corner) */}
      <SystemTraySimulator
        onCaptureRegion={() => handleTriggerCapture('region')}
        onCaptureFullscreen={() => handleTriggerCapture('fullscreen')}
        onCaptureWindow={() => handleTriggerCapture('window')}
        onOpenDashboard={() => {
          setIsMinimized(false);
          setCurrentView('dashboard');
        }}
        onOpenSettings={() => {
          setIsMinimized(false);
          setCurrentView('settings');
        }}
        isMinimized={isMinimized}
        onRestore={() => setIsMinimized(false)}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 dark:bg-white/95 text-white dark:text-neutral-900 py-2 px-4 rounded-xl shadow-2xl text-xs font-medium border border-white/10 dark:border-black/10 flex items-center gap-2 animate-fadeIn pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

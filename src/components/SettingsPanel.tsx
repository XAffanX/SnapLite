import React, { useState } from 'react';
import {
  Keyboard,
  HardDrive,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Volume2,
  FolderOpen,
  ArrowLeft,
  RotateCcw,
  Check,
  Package,
  Terminal,
} from 'lucide-react';
import { useSettingsStore, ShortcutConfig } from '../stores/settingsStore';

interface SettingsPanelProps {
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack, onToast }) => {
  const {
    shortcuts,
    updateShortcut,
    defaultFormat,
    defaultQuality,
    defaultSaveDir,
    copyAfterCapture,
    openEditorAfterCapture,
    autoSaveToDisk,
    captureDelay,
    showMagnifierLoupe,
    theme,
    minimizeToTrayOnClose,
    launchAtStartup,
    soundEffects,
    quickCaptureMode,
    updateSettings,
    resetToDefaults,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts' | 'packaging'>('general');
  const [editingShortcut, setEditingShortcut] = useState<keyof ShortcutConfig | null>(null);

  const handleShortcutKeyDown = (e: React.KeyboardEvent, action: keyof ShortcutConfig) => {
    e.preventDefault();
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Win');

    const key = e.key.toUpperCase();
    if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) {
      keys.push(key);
      const combo = keys.join('+');
      updateShortcut(action, combo);
      setEditingShortcut(null);
      onToast(`Updated shortcut for ${action}: ${combo}`);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-white dark:bg-[#1E1E1E] text-neutral-800 dark:text-neutral-100 overflow-hidden select-none">
      {/* Settings Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              SnapLite Settings
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Preferences, shortcuts, and native Windows integration
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetToDefaults();
            onToast('Settings reset to defaults');
          }}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'general'
              ? 'text-[#0078D4] border-[#0078D4] bg-white dark:bg-[#1E1E1E]'
              : 'text-neutral-500 border-transparent hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          General & Capture
        </button>
        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'shortcuts'
              ? 'text-[#0078D4] border-[#0078D4] bg-white dark:bg-[#1E1E1E]'
              : 'text-neutral-500 border-transparent hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Keyboard Shortcuts
        </button>
        <button
          onClick={() => setActiveTab('packaging')}
          className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'packaging'
              ? 'text-[#0078D4] border-[#0078D4] bg-white dark:bg-[#1E1E1E]'
              : 'text-neutral-500 border-transparent hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Packaging & Build
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full flex flex-col gap-6">
        {activeTab === 'general' && (
          <>
            {/* Capture Workflow */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Capture Behavior
              </h3>

              <div className="bg-white dark:bg-[#252526] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Quick Capture Mode
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Copy immediately to clipboard upon region selection without opening editor
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={quickCaptureMode}
                    onChange={(e) => updateSettings({ quickCaptureMode: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Copy Image to Clipboard Automatically
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Place newly captured screenshots on Windows clipboard ready for pasting
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={copyAfterCapture}
                    onChange={(e) => updateSettings({ copyAfterCapture: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Magnifier Loupe
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Display precision pixel zoom and coordinates during region capture
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showMagnifierLoupe}
                    onChange={(e) => updateSettings({ showMagnifierLoupe: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Camera Shutter Sound
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Play subtle audio feedback when capturing screen
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEffects}
                    onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Storage & Format */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Export & Saving
              </h3>

              <div className="bg-white dark:bg-[#252526] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Default Image Format
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      File format used when saving screenshots
                    </p>
                  </div>
                  <select
                    value={defaultFormat}
                    onChange={(e) =>
                      updateSettings({ defaultFormat: e.target.value as 'png' | 'jpeg' | 'webp' })
                    }
                    className="py-1 px-2.5 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Compressed)</option>
                    <option value="webp">WebP (Optimized)</option>
                  </select>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      JPEG / WebP Quality
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Compression balance ({defaultQuality}%)
                    </p>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={defaultQuality}
                    onChange={(e) => updateSettings({ defaultQuality: Number(e.target.value) })}
                    className="w-32 accent-[#0078D4]"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Save Directory
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400">
                      {defaultSaveDir}
                    </p>
                  </div>
                  <button
                    onClick={() => onToast('Location configured: Pictures/Screenshots')}
                    className="py-1 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Browse</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop & Appearance */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                System & Tray Integration
              </h3>

              <div className="bg-white dark:bg-[#252526] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Minimize to System Tray on Close
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Keep SnapLite running in background taskbar notification area
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={minimizeToTrayOnClose}
                    onChange={(e) => updateSettings({ minimizeToTrayOnClose: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Start with Windows
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Launch minimized in tray when signing into Windows
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={launchAtStartup}
                    onChange={(e) => updateSettings({ launchAtStartup: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      Application Theme
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Match Windows system theme or force mode
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                    <button
                      onClick={() => updateSettings({ theme: 'light' })}
                      className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                        theme === 'light' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: 'dark' })}
                      className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'bg-[#2D2D2D] text-white shadow-sm' : 'text-neutral-500'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: 'system' })}
                      className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                        theme === 'system' ? 'bg-white dark:bg-[#2D2D2D] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>System</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'shortcuts' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Click on any shortcut badge and press your preferred key combination to rebind it.
              </p>
            </div>

            <div className="bg-white dark:bg-[#252526] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              {Object.entries(shortcuts).map(([action, combo]) => {
                const isEditing = editingShortcut === action;
                return (
                  <div key={action} className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 capitalize">
                        Capture {action}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {action === 'region'
                          ? 'Open crosshair selection overlay'
                          : action === 'fullscreen'
                          ? 'Capture active display immediately'
                          : action === 'window'
                          ? 'Capture specific application window'
                          : `Action for ${action}`}
                      </p>
                    </div>

                    {isEditing ? (
                      <div
                        onKeyDown={(e) => handleShortcutKeyDown(e, action as keyof ShortcutConfig)}
                        tabIndex={0}
                        className="py-1 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-[#0078D4] text-xs font-mono text-[#0078D4] animate-pulse outline-none"
                      >
                        Press shortcut keys...
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingShortcut(action as keyof ShortcutConfig)}
                        className="py-1 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-mono text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors"
                      >
                        {combo}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'packaging' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
              <Package className="w-5 h-5 text-[#0078D4] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                  Windows Native Installer & Executable Packaging
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  SnapLite is structured as a full native Windows desktop application with Tauri 2 and Rust. To compile a standalone `.exe` or Windows `.msi` / NSIS installer:
                </p>
              </div>
            </div>

            <div className="bg-[#1E1E1E] text-neutral-200 p-4 rounded-xl font-mono text-xs overflow-x-auto flex flex-col gap-2 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 text-[11px] border-b border-neutral-800 pb-2">
                <span>PowerShell / Command Prompt</span>
                <span className="text-emerald-400">Offline Standalone Binary</span>
              </div>
              <p className="text-neutral-400"># 1. Install frontend packages</p>
              <p className="text-white">npm install</p>
              <p className="text-neutral-400 mt-2"># 2. Build production Windows release</p>
              <p className="text-[#60A5FA]">npm run tauri build</p>
              <p className="text-neutral-400 mt-2"># Generated output:</p>
              <p className="text-emerald-400">src-tauri/target/release/snaplite.exe</p>
              <p className="text-emerald-400">src-tauri/target/release/bundle/msi/SnapLite_0.1.0_x64_en-US.msi</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

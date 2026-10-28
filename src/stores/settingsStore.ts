import { create } from 'zustand';
import { isTauri } from '../services/tauriBridge';

export interface ShortcutConfig {
  region: string;
  fullscreen: string;
  window: string;
  copy: string;
  save: string;
  undo: string;
  redo: string;
}

export interface AppSettings {
  shortcuts: ShortcutConfig;
  defaultFormat: 'png' | 'jpeg' | 'webp';
  defaultQuality: number;
  defaultSaveDir: string;
  copyAfterCapture: boolean;
  openEditorAfterCapture: boolean;
  autoSaveToDisk: boolean;
  captureDelay: number;
  showMagnifierLoupe: boolean;
  theme: 'system' | 'light' | 'dark';
  minimizeToTrayOnClose: boolean;
  launchAtStartup: boolean;
  soundEffects: boolean;
  quickCaptureMode: boolean; // Direct copy without opening editor
}

interface SettingsStore extends AppSettings {
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateShortcut: (action: keyof ShortcutConfig, keyCombination: string) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  shortcuts: {
    region: 'Ctrl+Shift+S',
    fullscreen: 'Ctrl+Shift+F',
    window: 'Ctrl+Shift+W',
    copy: 'Ctrl+C',
    save: 'Ctrl+S',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
  },
  defaultFormat: 'png',
  defaultQuality: 95,
  defaultSaveDir: 'C:\\Users\\User\\Pictures\\Screenshots',
  copyAfterCapture: false,
  openEditorAfterCapture: true,
  autoSaveToDisk: false,
  captureDelay: 0,
  showMagnifierLoupe: true,
  theme: 'system',
  minimizeToTrayOnClose: true,
  launchAtStartup: false,
  soundEffects: true,
  quickCaptureMode: false,
};

const STORAGE_KEY = 'snaplite_settings_v1';

const getInitialSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings from storage', e);
  }
  return DEFAULT_SETTINGS;
};

const syncToNativeBackend = (settings: AppSettings) => {
  if (isTauri()) {
    import('@tauri-apps/api/core')
      .then(({ invoke }) => {
        invoke('save_app_settings', {
          config: {
            default_format: settings.defaultFormat,
            default_quality: settings.defaultQuality,
            default_save_dir: settings.defaultSaveDir,
            copy_after_capture: settings.copyAfterCapture,
            open_editor: settings.openEditorAfterCapture,
            capture_delay: settings.captureDelay,
            minimize_to_tray: settings.minimizeToTrayOnClose,
            launch_at_startup: settings.launchAtStartup,
          },
        }).catch((e) => console.warn('Failed to sync settings with native backend:', e));
      })
      .catch(() => {});
  }
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...getInitialSettings(),

  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        syncToNativeBackend(updated);
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
      return updated;
    });
  },

  updateShortcut: (action, keyCombination) => {
    set((state) => {
      const updated = {
        ...state,
        shortcuts: {
          ...state.shortcuts,
          [action]: keyCombination,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        syncToNativeBackend(updated);
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
      return updated;
    });
  },

  resetToDefaults: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      syncToNativeBackend(DEFAULT_SETTINGS);
    } catch {}
    set({ ...DEFAULT_SETTINGS });
  },
}));

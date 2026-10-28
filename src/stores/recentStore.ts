import { create } from 'zustand';
import { ScreenshotItem } from '../types/screenshot';

interface RecentStore {
  screenshots: ScreenshotItem[];
  addScreenshot: (item: ScreenshotItem) => void;
  removeScreenshot: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'snaplite_recent_v1';
const MAX_RECENT_ITEMS = 12;

const getInitialScreenshots = (): ScreenshotItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT_ITEMS);
    }
  } catch (e) {
    console.warn('Failed to load recent screenshots', e);
  }
  return [];
};

export const useRecentStore = create<RecentStore>((set) => ({
  screenshots: getInitialScreenshots(),

  addScreenshot: (item) => {
    set((state) => {
      // Filter out duplicates and limit to MAX_RECENT_ITEMS
      const filtered = state.screenshots.filter((s) => s.id !== item.id);
      const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        // In case of quota error with large dataUrls, keep fewer items
        console.warn('Storage quota exceeded, pruning recent screenshots', e);
        try {
          const pruned = updated.slice(0, 4);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        } catch {}
      }
      return { screenshots: updated };
    });
  },

  removeScreenshot: (id) => {
    set((state) => {
      const updated = state.screenshots.filter((s) => s.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { screenshots: updated };
    });
  },

  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({ screenshots: [] });
  },
}));

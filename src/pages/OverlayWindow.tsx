import React, { useState, useEffect, useCallback } from 'react';
import { CaptureOverlay } from '../components/CaptureOverlay';
import { RectBounds } from '../types/screenshot';
import { isTauri } from '../services/tauriBridge';

interface SnapshotPayload {
  data_url: string;
  bounds: RectBounds;
}

export const OverlayWindow: React.FC = () => {
  const [desktopImage, setDesktopImage] = useState<string | null>(null);
  const [desktopBounds, setDesktopBounds] = useState<RectBounds | null>(null);

  // Initialize and listen for desktop snapshot from Rust backend
  useEffect(() => {
    let isMounted = true;

    if (isTauri()) {
      // 1. Immediately query in-memory snapshot if already captured
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke<SnapshotPayload | null>('get_current_desktop_snapshot')
            .then((res) => {
              if (isMounted && res) {
                setDesktopImage(res.data_url);
                setDesktopBounds(res.bounds);
              }
            })
            .catch((err) => console.warn('Could not query current desktop snapshot:', err));
        })
        .catch(() => {});

      // 2. Listen for load event from start_region_selection
      let unlistenFn: (() => void) | null = null;
      import('@tauri-apps/api/event')
        .then(({ listen }) => {
          listen<SnapshotPayload>('load-desktop-snapshot', (event) => {
            if (isMounted && event.payload) {
              setDesktopImage(event.payload.data_url);
              setDesktopBounds(event.payload.bounds);
            }
          }).then((unsub) => {
            unlistenFn = unsub;
          });
        })
        .catch(() => {});

      return () => {
        isMounted = false;
        if (unlistenFn) unlistenFn();
      };
    }
  }, []);

  // Handle region confirmation
  const handleConfirm = useCallback(
    async (selectionBounds: RectBounds, quickCopy = false) => {
      if (isTauri()) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');

          // Map overlay window local coordinates to virtual desktop coordinates
          const actualX = (desktopBounds ? desktopBounds.x : 0) + selectionBounds.x;
          const actualY = (desktopBounds ? desktopBounds.y : 0) + selectionBounds.y;

          const absoluteBounds: RectBounds = {
            x: actualX,
            y: actualY,
            width: selectionBounds.width,
            height: selectionBounds.height,
          };

          // Send selected bounds to Rust backend to crop native pixels, restore main window, and open editor
          await invoke('confirm_region_crop', {
            bounds: absoluteBounds,
            quickCopy,
          });
        } catch (err) {
          console.error('Failed to confirm region crop via Tauri IPC:', err);
        }
      }
    },
    [desktopBounds]
  );

  // Handle cancel (Esc)
  const handleCancel = useCallback(async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('cancel_region_selection');
      } catch (err) {
        console.error('Failed to cancel region selection:', err);
      }
    }
  }, []);

  if (!desktopImage) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center select-none pointer-events-none">
        <div className="bg-neutral-900/90 text-white text-xs py-2 px-4 rounded-xl shadow-2xl border border-white/10 animate-pulse">
          Initializing SnapLite Region Selector...
        </div>
      </div>
    );
  }

  return (
    <CaptureOverlay
      desktopImage={desktopImage}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};

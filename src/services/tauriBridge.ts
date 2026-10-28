import { CaptureMode, MonitorInfo, RectBounds, WindowInfo } from '../types/screenshot';

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Play authentic camera shutter sound using Web Audio API synthesis
 */
export function playShutterSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First click (shutter open)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.04);

    // Second click (shutter close)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.06);
    osc2.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.debug('Audio playback skipped', e);
  }
}

/**
 * Capture actual screen from Windows desktop via Tauri GDI BitBlt or native displayMedia in browser
 * No simulated or fake screenshots. Returns genuine screen capture or throws descriptive error.
 */
export async function captureScreenNative(
  mode: CaptureMode,
  bounds?: RectBounds,
  windowId?: string
): Promise<string> {
  // If Tauri native application is running
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<string>('capture_screen', {
        mode,
        bounds,
        windowId,
      });
      if (!result) {
        throw new Error('Native capture returned empty image data');
      }
      return result;
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err as Error)?.message || JSON.stringify(err);
      throw new Error(`Windows screen capture failed: ${msg}`);
    }
  }

  // Web environment: perform genuine screen capture via Web DisplayMedia API
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: mode === 'window' ? 'window' : 'monitor',
          // Request highest available capture fidelity
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(reject);
        };
        video.onerror = () => reject(new Error('Failed to start video stream playback'));
        setTimeout(() => reject(new Error('Screen capture stream initialization timed out')), 6000);
      });

      // Small delay for the first video frame to render
      await new Promise((r) => setTimeout(r, 80));

      const canvas = document.createElement('canvas');
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;

      if (bounds) {
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to acquire 2D canvas context');
        ctx.drawImage(video, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
      } else {
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to acquire 2D canvas context');
        ctx.drawImage(video, 0, 0, vw, vh);
      }

      // Stop all stream tracks immediately after snapshot is captured
      stream.getTracks().forEach((track) => track.stop());

      return canvas.toDataURL('image/png');
    } catch (e: unknown) {
      const errorMsg = (e as Error)?.message || 'Screen capture permission was denied or cancelled';
      throw new Error(`Screen capture error: ${errorMsg}. In the compiled desktop application, native Windows GDI captures the desktop automatically.`);
    }
  }

  throw new Error('Screen capture API is not supported in this environment. Please run the native SnapLite Windows desktop application.');
}

/**
 * Query active desktop windows from native backend
 */
export async function queryWindowsNative(): Promise<WindowInfo[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowInfo[]>('get_windows');
    } catch (e) {
      console.warn('Failed to query native windows:', e);
    }
  }
  return [];
}

/**
 * Query connected monitors from native backend
 */
export async function queryMonitorsNative(): Promise<MonitorInfo[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<MonitorInfo[]>('get_monitors');
    } catch (e) {
      console.warn('Failed to query native monitors:', e);
    }
  }
  return [
    {
      id: 'primary',
      name: 'Primary Display',
      width: window.screen.width * (window.devicePixelRatio || 1),
      height: window.screen.height * (window.devicePixelRatio || 1),
      scaleFactor: window.devicePixelRatio || 1,
      isPrimary: true,
      x: 0,
      y: 0,
    },
  ];
}

/**
 * Copy image bytes directly to native Windows clipboard
 */
export async function copyToClipboard(blob: Blob): Promise<boolean> {
  // If Tauri native application is running
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = Array.from(new Uint8Array(arrayBuffer));
      await invoke('copy_image_to_clipboard', { imageBytes: uint8 });
      return true;
    } catch (err) {
      console.warn('Tauri native clipboard copy failed, attempting browser clipboard API:', err);
    }
  }

  // Standard Clipboard API write
  if (typeof navigator !== 'undefined' && navigator.clipboard?.write) {
    try {
      const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ]);
      return true;
    } catch (err) {
      console.error('Browser clipboard write failed', err);
      return false;
    }
  }

  return false;
}

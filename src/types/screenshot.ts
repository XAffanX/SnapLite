export type CaptureMode = 'region' | 'fullscreen' | 'window';

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
  x: number;
  y: number;
}

export interface WindowInfo {
  id: string;
  title: string;
  appName: string;
  width: number;
  height: number;
  icon?: string;
  previewUrl?: string;
}

export interface CaptureOptions {
  mode: CaptureMode;
  delaySeconds?: number;
  monitorId?: string;
  windowId?: string;
  bounds?: RectBounds;
  quickCopy?: boolean;
}

export interface ScreenshotItem {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
  title: string;
  sizeBytes?: number;
  mode: CaptureMode;
}

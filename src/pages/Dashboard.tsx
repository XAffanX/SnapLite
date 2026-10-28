import React, { useState } from 'react';
import {
  Camera,
  Crop,
  Monitor,
  AppWindow,
  Clock,
  Settings,
  Zap,
  Sliders,
  Check,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { CaptureMode, ScreenshotItem } from '../types/screenshot';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { useSettingsStore } from '../stores/settingsStore';

interface DashboardProps {
  onTriggerCapture: (mode: CaptureMode, delaySec: number) => void;
  onOpenSettings: () => void;
  onOpenInEditor: (item: ScreenshotItem) => void;
  onToast: (msg: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onTriggerCapture,
  onOpenSettings,
  onOpenInEditor,
  onToast,
}) => {
  const {
    shortcuts,
    captureDelay,
    quickCaptureMode,
    updateSettings,
  } = useSettingsStore();

  const [selectedDelay, setSelectedDelay] = useState<number>(captureDelay);

  const handleDelayChange = (sec: number) => {
    setSelectedDelay(sec);
    updateSettings({ captureDelay: sec });
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-[#F9FAFB] dark:bg-[#1E1E1E] overflow-y-auto select-none p-5 sm:p-7">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-7">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              SnapLite
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Windows screenshot capture & annotation utility
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#252526] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 shadow-sm transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Hero Capture Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Region Capture - Highlighted Primary Card */}
          <div
            onClick={() => onTriggerCapture('region', selectedDelay)}
            className="group relative bg-gradient-to-br from-[#0078D4] to-[#005A9E] text-white rounded-2xl p-5 shadow-lg shadow-blue-500/15 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                <Crop className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono py-0.5 px-2 rounded-md bg-white/20 text-white font-medium">
                {shortcuts.region}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-semibold leading-tight mb-1">
                Capture Region
              </h3>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Precision crosshair box selection with live loupe magnifier
              </p>
            </div>
          </div>

          {/* Fullscreen Capture */}
          <div
            onClick={() => onTriggerCapture('fullscreen', selectedDelay)}
            className="group bg-white dark:bg-[#252526] rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200">
                <Monitor className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono py-0.5 px-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                {shortcuts.fullscreen}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-tight mb-1">
                Capture Fullscreen
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Snapshot entire primary display or virtual multi-monitors
              </p>
            </div>
          </div>

          {/* Window Capture */}
          <div
            onClick={() => onTriggerCapture('window', selectedDelay)}
            className="group bg-white dark:bg-[#252526] rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200">
                <AppWindow className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono py-0.5 px-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                {shortcuts.window}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-tight mb-1">
                Capture Window
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Select and snapshot any running application window
              </p>
            </div>
          </div>
        </div>

        {/* Capture Preferences Bar (Delay & Quick Capture) */}
        <div className="bg-white dark:bg-[#252526] rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Delay Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <Clock className="w-4 h-4 text-[#0078D4]" />
              <span>Capture Delay:</span>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              {[
                { sec: 0, label: 'Instant' },
                { sec: 3, label: '3s' },
                { sec: 5, label: '5s' },
                { sec: 10, label: '10s' },
              ].map((item) => (
                <button
                  key={item.sec}
                  onClick={() => handleDelayChange(item.sec)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
                    selectedDelay === item.sec
                      ? 'bg-white dark:bg-[#2D2D2D] text-[#0078D4] dark:text-blue-400 shadow-sm font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Capture Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">
                Quick Capture (direct copy to clipboard)
              </span>
            </div>
            <input
              type="checkbox"
              checked={quickCaptureMode}
              onChange={(e) => updateSettings({ quickCaptureMode: e.target.checked })}
              className="w-4 h-4 rounded accent-[#0078D4] cursor-pointer"
            />
          </div>
        </div>

        {/* Recent Screenshots Gallery */}
        <RecentScreenshots onOpenInEditor={onOpenInEditor} onToast={onToast} />
      </div>
    </div>
  );
};

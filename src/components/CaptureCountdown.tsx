import React, { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';

interface CaptureCountdownProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const CaptureCountdown: React.FC<CaptureCountdownProps> = ({
  seconds,
  onComplete,
  onCancel,
}) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center select-none animate-fadeIn">
      <div className="bg-white dark:bg-[#202020] rounded-2xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center max-w-xs w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0078D4] flex items-center justify-center mb-4 relative">
          <Camera className="w-7 h-7" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0078D4] text-white text-xs font-bold flex items-center justify-center shadow">
            {remaining}
          </div>
        </div>

        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
          Capturing in {remaining}s...
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Switch to your desired window or app now.
        </p>

        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel (Esc)</span>
        </button>
      </div>
    </div>
  );
};

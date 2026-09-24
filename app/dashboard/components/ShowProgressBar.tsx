"use client";

import React from 'react';
import { useWatched, type WatchedShowProgress } from '@/lib/watchedContext';
import { Check } from 'lucide-react';

interface ShowProgressBarProps {
  progress: number;
  isCompleted?: boolean;
  watchedCount?: number;
  totalEpisodes?: number;
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

export function ShowProgressBar({
  progress,
  isCompleted = false,
  watchedCount,
  totalEpisodes,
  className = "",
  showText = true,
  compact = false,
}: ShowProgressBarProps) {
  if (progress <= 0 && (!watchedCount || watchedCount <= 0)) return null;

  const effectiveCompleted = isCompleted || progress >= 100;
  const barColor = effectiveCompleted
    ? 'bg-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.6)]'
    : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]';

  const textColor = effectiveCompleted ? 'text-[#ccff00]' : 'text-cyan-400';

  return (
    <div className={`w-full ${className}`}>
      {/* نوار اصلی */}
      <div className={`w-full ${compact ? 'h-1' : 'h-1.5'} bg-white/15 rounded-full overflow-hidden backdrop-blur-sm`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
        />
      </div>

      {showText && (
        <div className="flex justify-between items-center text-[10px] mt-1 font-bold">
          <span className={`${textColor} flex items-center gap-1`}>
            {effectiveCompleted ? (
              <>
                <Check size={10} strokeWidth={3} />
                <span>کامل دیدی</span>
              </>
            ) : (
              <span>{progress}٪ دیدی</span>
            )}
          </span>

          {watchedCount !== undefined && totalEpisodes !== undefined && totalEpisodes > 0 && (
            <span className="text-gray-400 font-mono text-[9px] ltr">
              {watchedCount}/{totalEpisodes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ShowCardProgressProps {
  showId: number | string | undefined;
  totalEpisodes?: number;
  position?: 'bottom' | 'bottom-bar' | 'floating';
  showBadge?: boolean;
  showPercentageBadge?: boolean;
  showBar?: boolean;
  className?: string;
}

/**
 * All-in-one smart component that checks if user has watched this show,
 * and displays the progress bar and/or badge on top of any show card.
 */
export function ShowCardProgress({
  showId,
  totalEpisodes,
  position = 'bottom',
  showBadge = true,
  showPercentageBadge,
  showBar = true,
  className = "",
}: ShowCardProgressProps) {
  const { getShowProgress } = useWatched();
  const info: WatchedShowProgress = getShowProgress(showId, totalEpisodes);

  if (!info.isWatched) return null;

  const effectiveCompleted = info.isCompleted || info.progress >= 100;
  const displayBadge = showBadge && showPercentageBadge !== false;

  return (
    <>
      {/* بج درصد شناور در بالای پوستر */}
      {displayBadge && (
        <div 
          className="absolute top-2 right-2 z-20 pointer-events-none select-none bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-2 py-0.5 text-[10px] font-black shadow-lg flex items-center gap-1"
        >
          {effectiveCompleted ? (
            <span className="text-[#ccff00] flex items-center gap-0.5">
              <Check size={11} strokeWidth={3} />
              <span>۱۰۰٪</span>
            </span>
          ) : (
            <span className="text-cyan-400 font-mono">
              {info.progress}٪
            </span>
          )}
        </div>
      )}

      {/* نوار پیشرفت */}
      {showBar && (
        position === 'bottom-bar' ? (
          // نوار باریک چسبیده به کف کارت
          <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden ${className}`}>
            <div
              className={`h-full transition-all duration-500 ${
                effectiveCompleted
                  ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.8)]'
                  : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, info.progress))}%` }}
            />
          </div>
        ) : (
          // نوار پیشرفت استاندارد با متن توضیحی
          <div className={`w-full mt-1.5 z-10 ${className}`}>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  effectiveCompleted
                    ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.6)]'
                    : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                }`}
                style={{ width: `${Math.max(4, Math.min(100, info.progress))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] mt-0.5 font-bold">
              <span className={effectiveCompleted ? 'text-[#ccff00]' : 'text-cyan-400'}>
                {effectiveCompleted ? '✓ کامل شده' : `${info.progress}٪ دیده شده`}
              </span>
              {info.totalEpisodes > 0 && (
                <span className="text-[9px] text-gray-400 font-mono ltr">
                  {info.watchedCount}/{info.totalEpisodes}
                </span>
              )}
            </div>
          </div>
        )
      )}
    </>
  );
}

export default ShowProgressBar;

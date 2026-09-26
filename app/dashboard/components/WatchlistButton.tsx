"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Check, Plus, Loader2 } from 'lucide-react';

interface WatchlistButtonProps {
  showId: number | string;
  showName?: string;
  className?: string;
  iconSize?: number;
  stopPropagation?: boolean;
}

// حافظه مشترک برای تمامی کارت‌های سریال در صفحه جهت جلوگیری از کوئری‌های تکراری
let globalWatchlistIds: Set<number> | null = null;
const watchlistListeners = new Set<() => void>();
let fetchPromise: Promise<Set<number>> | null = null;

function notifyListeners() {
  watchlistListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

export function WatchlistButton({
  showId,
  showName,
  className = "",
  iconSize = 13,
  stopPropagation = true,
}: WatchlistButtonProps) {
  const router = useRouter();
  const supabase = createClient() as any;
  const numId = Number(showId);

  const [inWatchlist, setInWatchlist] = useState<boolean>(() => {
    return globalWatchlistIds ? globalWatchlistIds.has(numId) : false;
  });
  const [loading, setLoading] = useState(false);

  const updateFromGlobal = useCallback(() => {
    if (globalWatchlistIds) {
      setInWatchlist(globalWatchlistIds.has(numId));
    }
  }, [numId]);

  useEffect(() => {
    watchlistListeners.add(updateFromGlobal);

    if (globalWatchlistIds === null && !fetchPromise) {
      fetchPromise = (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            globalWatchlistIds = new Set();
            notifyListeners();
            return globalWatchlistIds;
          }
          const { data } = await supabase
            .from('watchlist')
            .select('show_id')
            .eq('user_id', user.id);
          globalWatchlistIds = new Set<number>((data || []).map((row: any) => Number(row.show_id)));
          notifyListeners();
          return globalWatchlistIds;
        } catch (err) {
          console.error('Error fetching watchlist:', err);
          globalWatchlistIds = new Set();
          return globalWatchlistIds;
        }
      })();
    } else if (globalWatchlistIds !== null) {
      setInWatchlist(globalWatchlistIds.has(numId));
    }

    const handleExternalUpdate = (event: Event) => {
      const customEvt = event as CustomEvent<{ showId?: number; inWatchlist?: boolean }>;
      if (customEvt.detail?.showId) {
        const sid = Number(customEvt.detail.showId);
        if (customEvt.detail.inWatchlist !== undefined && globalWatchlistIds) {
          if (customEvt.detail.inWatchlist) globalWatchlistIds.add(sid);
          else globalWatchlistIds.delete(sid);
        }
      }
      updateFromGlobal();
    };

    window.addEventListener('binger:watchlist-updated', handleExternalUpdate);

    return () => {
      watchlistListeners.delete(updateFromGlobal);
      window.removeEventListener('binger:watchlist-updated', handleExternalUpdate);
    };
  }, [numId, updateFromGlobal, supabase]);

  const handleToggle = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (loading) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      const isCurrentlyIn = globalWatchlistIds ? globalWatchlistIds.has(numId) : inWatchlist;
      const nextStatus = !isCurrentlyIn;

      // Optimistic update
      if (!globalWatchlistIds) globalWatchlistIds = new Set();
      if (nextStatus) {
        globalWatchlistIds.add(numId);
      } else {
        globalWatchlistIds.delete(numId);
      }
      setInWatchlist(nextStatus);
      notifyListeners();

      // رویداد سراسری برای هماهنگی با سایر بخش‌ها و صفحات
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('binger:watchlist-updated', {
            detail: { showId: numId, inWatchlist: nextStatus },
          })
        );
      }

      if (nextStatus) {
        await supabase
          .from('watchlist')
          .insert({ user_id: user.id, show_id: numId });
      } else {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('show_id', numId);
      }
    } catch (err) {
      console.error('Watchlist toggle error:', err);
      // بازگرداندن در صورت خطا
      if (globalWatchlistIds) {
        if (inWatchlist) globalWatchlistIds.add(numId);
        else globalWatchlistIds.delete(numId);
        notifyListeners();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-20 cursor-pointer shadow-md hover:scale-110 active:scale-95 flex items-center justify-center ${
        inWatchlist
          ? 'bg-[#ccff00] text-black border border-[#ccff00] shadow-[0_0_14px_rgba(204,255,0,0.6)]'
          : 'bg-black/75 text-white hover:bg-[#ccff00] hover:text-black border border-white/25 hover:border-[#ccff00] shadow-lg hover:shadow-[0_0_12px_rgba(204,255,0,0.5)]'
      } ${className}`}
      title={
        inWatchlist
          ? `«${showName || 'این سریال'}» در لیست انتظار شماست (کلیک برای حذف)`
          : `افزودن «${showName || 'این سریال'}» به لیست انتظار`
      }
      aria-label={inWatchlist ? "حذف از لیست انتظار" : "افزودن به لیست انتظار"}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : inWatchlist ? (
        <Check size={iconSize} strokeWidth={3} />
      ) : (
        <Plus size={iconSize} strokeWidth={2.5} />
      )}
    </button>
  );
}

export default WatchlistButton;

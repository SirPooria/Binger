"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import {
  KlipyGifItem,
  getGifPreviewUrl,
  getGifFullUrl,
  searchGifs,
  getTrendingGifs,
} from '@/lib/klipyClient';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: { url: string; previewUrl: string; title: string }) => void;
}

const QUICK_CATEGORIES = [
  { label: '🔥 ترندها', query: '' },
  { label: '🎬 سینما', query: 'movie cinema' },
  { label: '😂 خنده', query: 'laughing funny' },
  { label: '🔥 خفن', query: 'fire epic cool' },
  { label: '😱 شوکه', query: 'shocked what omg' },
  { label: '👏 تشویق', query: 'applause bravo clap' },
  { label: '🍿 پاپ‌کورن', query: 'popcorn watching' },
  { label: '❤️ عشق', query: 'love heart' },
  { label: '😢 گریه', query: 'crying sad' },
  { label: '😡 خشم', query: 'angry rage' },
];

export default function GifPickerModal({ isOpen, onClose, onSelect }: GifPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [gifs, setGifs] = useState<KlipyGifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      loadGifs('', 1);
    } else {
      setSearchQuery('');
      setActiveCategory('');
      setPage(1);
      setError(null);
    }
  }, [isOpen]);

  const loadGifs = async (query: string, pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const trimmed = query.trim();
      const result = trimmed
        ? await searchGifs(trimmed, 24, pageNum)
        : await getTrendingGifs(24, pageNum);

      if (append) {
        setGifs(prev => [...prev, ...(result.gifs || [])]);
      } else {
        setGifs(result.gifs || []);
      }
      setHasNext(result.hasNext);
      setPage(pageNum);
    } catch (err: any) {
      console.error('GIF load error:', err);
      setError('خطا در دریافت گیف‌ها. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setActiveCategory(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadGifs(val, 1, false);
    }, 350);
  };

  const handleSelectCategory = (query: string) => {
    setActiveCategory(query);
    setSearchQuery(query);
    loadGifs(query, 1, false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNext) {
      loadGifs(searchQuery, page + 1, true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="bg-[#141414] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] relative my-auto font-['Vazirmatn'] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#181818] shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#ccff00]/10 text-[#ccff00]">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">انتخاب گیف</h3>
              <p className="text-[10px] text-gray-400">جستجو در میلیون‌ها گیف جذاب KLIPY</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="بستن"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-white/5 bg-[#141414] shrink-0 space-y-2.5">
          <div className="relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="جستجوی گیف (فارسی یا انگلیسی)..."
              className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#ccff00] rounded-xl pr-9 pl-9 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            <Search size={15} className="absolute right-3 text-gray-500 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('');
                  loadGifs('', 1, false);
                  searchInputRef.current?.focus();
                }}
                className="absolute left-3 text-gray-500 hover:text-white p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Categories Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {QUICK_CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.query;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleSelectCategory(cat.query)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#ccff00] text-black font-black shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body / GIF Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[55vh]">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin text-[#ccff00]" />
              <span className="text-xs font-bold">در حال بارگذاری گیف‌ها...</span>
            </div>
          )}

          {error && !loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-rose-400">
              <AlertCircle size={28} />
              <span className="text-xs">{error}</span>
              <button
                onClick={() => loadGifs(searchQuery, 1, false)}
                className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {!loading && !error && gifs.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-2 text-gray-500">
              <span className="text-3xl">🔍</span>
              <span className="text-xs font-bold text-gray-400">گیفی برای این عبارت پیدا نشد.</span>
              <span className="text-[11px] text-gray-500">کلمات دیگری مانند movie، happy، clap را امتحان کنید.</span>
            </div>
          )}

          {!loading && !error && gifs.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {gifs.map(gif => {
                  const previewUrl = getGifPreviewUrl(gif);
                  const fullUrl = getGifFullUrl(gif);

                  if (!previewUrl) return null;

                  return (
                    <div
                      key={gif.id}
                      onClick={() => {
                        onSelect({
                          url: fullUrl || previewUrl,
                          previewUrl,
                          title: gif.title || 'GIF',
                        });
                        onClose();
                      }}
                      className="group relative aspect-video bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/10 hover:border-[#ccff00] transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95"
                      title={gif.title || 'انتخاب این گیف'}
                    >
                      <img
                        src={previewUrl}
                        alt={gif.title || 'GIF'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <span className="text-[10px] text-white truncate font-medium">
                          {gif.title || 'انتخاب گیف'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasNext && (
                <div className="pt-2 pb-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-white/10"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-[#ccff00]" />
                        <span>در حال بارگذاری...</span>
                      </>
                    ) : (
                      <span>نمایش بیشتر 🎬</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Klipy Branding */}
        <div className="px-4 py-2 border-t border-white/5 bg-[#121212] flex items-center justify-between text-[10px] text-gray-500 shrink-0">
          <span>برای انتخاب کافیست روی گیف کلیک کنید</span>
          <span className="font-mono text-gray-400">
            Powered by <strong className="text-white tracking-wider">KLIPY</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

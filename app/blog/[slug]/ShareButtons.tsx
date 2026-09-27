"use client";

import React, { useState } from 'react';
import { Share2, Copy, Check, Send } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTelegramShare = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`مطالعه مقاله: ${title}`);
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    }
  };

  const handleTwitterShare = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`مقاله «${title}» در مجله سینمایی بینجر:\n`);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        title="کپی پیوند مقاله"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer border border-white/5"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">کپی شد!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>اشتراک‌گذاری</span>
          </>
        )}
      </button>

      {/* Telegram Share */}
      <button
        onClick={handleTelegramShare}
        title="اشتراک در تلگرام"
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#229ED9] transition cursor-pointer border border-white/5"
      >
        <Send className="w-3.5 h-3.5" />
      </button>

      {/* Twitter / X Share */}
      <button
        onClick={handleTwitterShare}
        title="اشتراک در توییتر / X"
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer border border-white/5 font-bold text-xs"
      >
        <span>𝕏</span>
      </button>
    </div>
  );
}

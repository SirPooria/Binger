"use client";

import React, { useState } from 'react';
import { parseCommentContent } from '@/lib/klipyClient';
import { Maximize2, X } from 'lucide-react';

interface CommentRendererProps {
  content: string;
  className?: string;
  textClassName?: string;
}

export default function CommentRenderer({
  content,
  className = '',
  textClassName = 'text-xs sm:text-sm text-gray-200 leading-relaxed',
}: CommentRendererProps) {
  const { text, gifUrl } = parseCommentContent(content);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Text portion */}
      {text && (
        <p className={`whitespace-pre-line break-words ${textClassName}`}>
          {text}
        </p>
      )}

      {/* GIF Media portion */}
      {gifUrl && (
        <div className="relative inline-block max-w-full group">
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-md cursor-pointer hover:border-[#ccff00]/60 transition-all max-w-xs sm:max-w-sm"
          >
            <img
              src={gifUrl}
              alt="GIF Comment"
              loading="lazy"
              className="max-h-60 sm:max-h-72 w-auto object-cover group-hover:scale-[1.01] transition-transform duration-200"
            />
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 border border-white/10 text-[9px] font-mono text-[#ccff00] font-bold">
              GIF
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/70 text-white">
              <Maximize2 size={13} />
            </div>
          </div>

          {/* Full Screen Lightbox Modal */}
          {isLightboxOpen && (
            <div
              className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
              onClick={() => setIsLightboxOpen(false)}
            >
              <div
                className="relative max-w-2xl max-h-[85vh] flex flex-col items-center"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute -top-10 left-0 text-gray-400 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  title="بستن"
                >
                  <X size={18} />
                </button>
                <img
                  src={gifUrl}
                  alt="GIF"
                  className="rounded-2xl max-h-[80vh] max-w-full object-contain border border-white/20 shadow-2xl"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { CommentRenderer };

"use client";

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, Info, CheckCircle2, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 size={26} className="text-red-400" />,
          iconBg: 'bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]',
          confirmBtn: 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]',
          borderGlow: 'border-red-500/25',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={26} className="text-amber-400" />,
          iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]',
          borderGlow: 'border-amber-500/25',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={26} className="text-[#ccff00]" />,
          iconBg: 'bg-[#ccff00]/15 border-[#ccff00]/30 text-[#ccff00] shadow-[0_0_25px_rgba(204,255,0,0.25)]',
          confirmBtn: 'bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[0_0_20px_rgba(204,255,0,0.35)]',
          borderGlow: 'border-[#ccff00]/25',
        };
      default:
        return {
          icon: <Info size={26} className="text-sky-400" />,
          iconBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.25)]',
          confirmBtn: 'bg-sky-500 hover:bg-sky-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]',
          borderGlow: 'border-sky-500/25',
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div 
        className={`bg-[#121212] border ${vStyles.borderGlow} w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative text-center animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!loading && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X size={16} />
          </button>
        )}

        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${vStyles.iconBg}`}>
          {vStyles.icon}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-black text-white mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 font-normal">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${vStyles.confirmBtn}`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{confirmText}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/5"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

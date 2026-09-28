"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { updateSetting } from '@/app/admin/settingsActions';

export interface EditableTextProps {
  settingKey: string;
  initialValue: string;
  isAdmin?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  className?: string;
  multiline?: boolean;
  description?: string;
}

export default function EditableText({
  settingKey,
  initialValue,
  isAdmin = false,
  as: Component = 'span',
  className = '',
  multiline = false,
  description,
}: EditableTextProps) {
  const [value, setValue] = useState(initialValue || '');
  const [draft, setDraft] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // همگام‌سازی مقدار در صورت تغییر initialValue از سرور
  useEffect(() => {
    setValue(initialValue || '');
    setDraft(initialValue || '');
  }, [initialValue]);

  // فوکوس خودکار هنگام ورود به حالت ویرایش
  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }
    }
  }, [isEditing, multiline]);

  // اگر کاربر مدیر سایت نباشد، تنها المنت متن عادی رندر می‌شود
  if (!isAdmin) {
    return <Component className={className}>{value}</Component>;
  }

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await updateSetting(settingKey, trimmed, description);
      if (res.success) {
        setValue(trimmed);
        setIsEditing(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2500);
      } else {
        setErrorMessage(res.error || 'خطا در ذخیره‌سازی');
      }
    } catch (err: any) {
      console.error('[EditableText] Save error:', err);
      setErrorMessage(err?.message || 'خطای شبکه در ذخیره متن');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setErrorMessage(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }

    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }

    if (multiline && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }
  };

  return (
    <div className="relative group/editable inline-block w-full max-w-full text-right" dir="rtl">
      {/* پیام موقت ذخیره موفق */}
      {showSaved && (
        <span className="absolute -top-3 left-2 z-40 bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <Check size={11} strokeWidth={3} />
          <span>تغییرات ذخیره شد</span>
        </span>
      )}

      {/* وضعیت در حال ذخیره */}
      {isSaving && (
        <span className="absolute -top-3 left-2 z-40 bg-black/90 border border-[#ccff00]/60 text-[#ccff00] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
          <Loader2 size={11} className="animate-spin" />
          <span>در حال ذخیره...</span>
        </span>
      )}

      {/* پیام خطا در صورت بروز مشکل */}
      {errorMessage && (
        <span className="absolute -top-4 right-2 z-40 bg-red-500/20 border border-red-500 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg">
          {errorMessage}
        </span>
      )}

      {/* ۱. حالت عادی با دکمه ویرایش شناور برای ادمین */}
      {!isEditing ? (
        <div className="relative rounded-xl transition-all group-hover/editable:ring-1 group-hover/editable:ring-[#ccff00]/50 group-hover/editable:bg-white/[0.02] p-0.5">
          <Component className={className}>{value}</Component>

          {/* دکمه قلم ویرایش مستقیم روی هاور */}
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setIsEditing(true);
            }}
            className="opacity-0 group-hover/editable:opacity-100 transition-all duration-200 absolute -top-3 left-1 z-30 bg-[#121212] hover:bg-[#ccff00] text-gray-300 hover:text-black border border-white/20 hover:border-[#ccff00] px-2 py-1 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center gap-1.5 text-[11px] font-black cursor-pointer active:scale-95"
            title={`ویرایش مستقیم کلید: ${settingKey}`}
          >
            <Pencil size={12} className="stroke-[2.5]" />
            <span className="hidden sm:inline font-sans text-[10px]">ویرایش زنده</span>
          </button>
        </div>
      ) : (
        /* ۲. حالت ویرایش درون‌متنی (Inline Editing Input/Textarea) */
        <div className="relative z-40 bg-[#0a0a0a] border-2 border-[#ccff00] rounded-2xl p-2.5 shadow-[0_0_30px_rgba(204,255,0,0.25)] space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] text-gray-400 pb-1 border-b border-white/10 font-mono">
            <span className="text-[#ccff00] font-bold flex items-center gap-1">
              <span>● ویرایش زنده:</span>
              <span>{settingKey}</span>
            </span>
            <span>{multiline ? 'Ctrl+Enter برای ذخیره' : 'Enter برای ذخیره / Esc لغو'}</span>
          </div>

          {multiline ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              disabled={isSaving}
              className={`w-full bg-transparent border-0 text-white outline-none resize-y ${className}`}
              placeholder="متن جدید را وارد کنید..."
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className={`w-full bg-transparent border-0 text-white outline-none ${className}`}
              placeholder="متن جدید را وارد کنید..."
            />
          )}

          {/* نوار اکشن ذخیره / انصراف */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <X size={13} />
              <span>انصراف</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black transition flex items-center gap-1 shadow-[0_0_15px_rgba(204,255,0,0.3)] cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <Check size={13} strokeWidth={3} />
                  <span>ذخیره تغییرات</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

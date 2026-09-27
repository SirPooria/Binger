"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Save,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Globe,
  RefreshCw,
  Bold,
  Italic,
  Heading2,
  Quote,
  List,
  Code,
  ExternalLink,
} from 'lucide-react';
import { savePost, formatSlug, PostInputData } from '../../cmsActions';
import { PostRecord } from '../CmsTableClient';

interface EditorClientProps {
  initialPost: PostRecord | null;
}

export default function EditorClient({ initialPost }: EditorClientProps) {
  const router = useRouter();

  // Form Fields
  const [title, setTitle] = useState(initialPost?.title || '');
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [coverImage, setCoverImage] = useState(initialPost?.cover_image || '');
  const [published, setPublished] = useState(initialPost?.published || false);
  const [content, setContent] = useState(initialPost?.content || '');

  // Editor Mode (Write vs Markdown Preview)
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // Slug auto-generation state: if creating new post, auto-generate slug until manually modified
  const [autoSlug, setAutoSlug] = useState(!initialPost?.slug);

  // Loading & Alert state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-generate slug when title changes (if autoSlug enabled)
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(formatSlug(title));
    }
  }, [title, autoSlug]);

  const handleManualSlugChange = (val: string) => {
    setAutoSlug(false);
    setSlug(formatSlug(val));
  };

  const handleRegenerateSlug = () => {
    if (title) {
      const formatted = formatSlug(title);
      setSlug(formatted);
      setAutoSlug(true);
    }
  };

  // Quick Markdown formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('cms-content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousContent = textarea.value;
    const selectedText = previousContent.substring(start, end);

    const replacement = `${prefix}${selectedText || 'متن نمونه'}${suffix}`;
    const newContent =
      previousContent.substring(0, start) + replacement + previousContent.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage('لطفاً عنوان نوشته را وارد کنید.');
      return;
    }

    setIsSaving(true);

    const payload: PostInputData = {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      cover_image: coverImage.trim() || null,
      published,
    };

    try {
      const res = await savePost(payload, initialPost?.id);

      if (res.success) {
        setSuccessMessage('نوشته با موفقیت ذخیره شد!');
        setTimeout(() => {
          router.push('/admin/cms');
          router.refresh();
        }, 800);
      } else {
        setErrorMessage(res.error || 'خطا در ذخیره نوشته.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطای شبکه در هنگام ذخیره نوشته.');
    } finally {
      setIsSaving(false);
    }
  };

  // Character and word counts
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cms"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="بازگشت به لیست مقالات"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Link href="/admin/cms" className="hover:text-gray-300 transition">
                مدیریت مقالات
              </Link>
              <span>/</span>
              <span className="text-[#ccff00]">
                {initialPost ? 'ویرایش نوشته' : 'نوشته جدید'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">
              {initialPost ? `ویرایش: ${initialPost.title}` : 'نگارش و ایجاد نوشته جدید'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cms"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition"
          >
            انصراف
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ccff00] text-black text-xs font-black hover:bg-[#b8e600] shadow-lg shadow-[#ccff00]/15 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>ذخیره نوشته</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Post Metadata Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0e0e0e] border border-white/5 space-y-5 shadow-xl">
          {/* Title Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
              <span>عنوان نوشته (Title) *</span>
              <span className="text-[11px] text-gray-500 font-normal">عنوان جذاب و خوانا</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: معرفی ۱۰ سریال برتر ژانر علمی‌تخیلی سال ۲۰۲۶"
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ccff00]/60 focus:ring-1 focus:ring-[#ccff00]/60 font-semibold transition"
              required
            />
          </div>

          {/* Slug (URL) Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#ccff00]" />
                <span>نامک یکتا / پیوند یکتا (Slug) *</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerateSlug}
                className="text-[11px] text-gray-400 hover:text-[#ccff00] flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تولید مجدد از روی عنوان</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={slug}
                onChange={(e) => handleManualSlugChange(e.target.value)}
                placeholder="top-10-sci-fi-shows-2026"
                dir="ltr"
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-[#ccff00]/60 focus:ring-1 focus:ring-[#ccff00]/60 transition"
              />
            </div>
            <p className="text-[11px] text-gray-500 flex items-center gap-1 font-mono" dir="ltr">
              <span className="text-gray-400">URL Preview:</span>
              <span className="text-[#ccff00]/80">/blog/{slug || 'your-slug'}</span>
            </p>
          </div>

          {/* Cover Image & Publish Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Cover Image Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>آدرس تصویر شاخص (Cover Image URL)</span>
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                dir="ltr"
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-[#ccff00]/60 focus:ring-1 focus:ring-[#ccff00]/60 transition"
              />
              <p className="text-[11px] text-gray-500">
                تصویر با نسبت ابعاد ۱۶:۹ جهت نمایش در هدر مقاله و کارت‌ها
              </p>

              {/* Cover Live Preview */}
              {coverImage && (
                <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 aspect-video flex items-center justify-center max-w-sm">
                  <img
                    src={coverImage}
                    alt="پیش‌نمایش کاور"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-gray-300 font-mono">
                    پیش‌نمایش تصویر
                  </span>
                </div>
              )}
            </div>

            {/* Publication Settings Card */}
            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-300 block mb-1">
                  وضعیت انتشار (Publishing Status)
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  نوشته‌های منتشر شده در وب‌سایت در دسترس عموم قرار گرفته و توسط موتورهای جستجو ایندکس می‌شوند.
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      published ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-white">
                    {published ? 'منتشر شده (عمومی)' : 'پیش‌نویس (غیرعمومی)'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ccff00] peer-checked:after:bg-black"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Content Editor Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0e0e0e] border border-white/5 space-y-4 shadow-xl">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#ccff00]" />
              <label className="text-xs font-bold text-white">
                متن کامل مقاله (Markdown / HTML)
              </label>
            </div>

            {/* Editor vs Preview Mode */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setEditorTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  editorTab === 'write'
                    ? 'bg-[#ccff00] text-black font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایش متن</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  editorTab === 'preview'
                    ? 'bg-[#ccff00] text-black font-bold shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش زنده</span>
              </button>
            </div>
          </div>

          {/* Quick Markdown Toolbar (visible in write mode) */}
          {editorTab === 'write' && (
            <div className="flex items-center gap-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 overflow-x-auto">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                title="درشت (Bold)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                title="مورب (Italic)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n## ', '\n')}
                title="سرتیتر ۲"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n> ', '\n')}
                title="نقل‌قول"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n- ', '\n')}
                title="لیست موردی"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```\n', '\n```')}
                title="بلوک کد"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[عنوان پیوند](', ')')}
                title="پیوند اینترنتی"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Textarea or Preview View */}
          {editorTab === 'write' ? (
            <textarea
              id="cms-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="متن مقاله را به صورت Markdown یا متن ساده بنویسید..."
              rows={16}
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs text-white leading-relaxed placeholder-gray-600 focus:outline-none focus:border-[#ccff00]/60 focus:ring-1 focus:ring-[#ccff00]/60 transition font-sans resize-y"
            />
          ) : (
            <div className="min-h-[380px] p-5 rounded-2xl bg-black/60 border border-white/10 text-xs text-gray-200 leading-relaxed overflow-y-auto space-y-4">
              {content.trim() ? (
                <div className="prose prose-invert max-w-none text-xs leading-loose whitespace-pre-wrap">
                  {content}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-40" />
                  <p>هنوز متنی برای پیش‌نمایش وارد نشده است.</p>
                </div>
              )}
            </div>
          )}

          {/* Word and Character Count Footer */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 font-mono border-t border-white/5">
            <div className="flex items-center gap-3">
              <span>کلمات: {wordCount.toLocaleString('fa-IR')}</span>
              <span>|</span>
              <span>کاراکترها: {charCount.toLocaleString('fa-IR')}</span>
            </div>
            <div className="flex items-center gap-1 text-[#ccff00]/80">
              <Sparkles className="w-3 h-3" />
              <span>Markdown Ready</span>
            </div>
          </div>
        </div>

        {/* Bottom Floating Save Button for Mobile / Long Form */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/cms"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition"
          >
            انصراف و بازگشت
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ccff00] text-black text-xs font-black hover:bg-[#b8e600] shadow-xl shadow-[#ccff00]/15 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>ذخیره نهایی</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

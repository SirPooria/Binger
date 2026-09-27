"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  MessageCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  Crown,
  Tv,
  Film,
  Calendar,
  Sparkles,
  Save,
  MessageSquare,
} from 'lucide-react';
import { deleteAdminComment, updateAdminComment } from '../actions';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';

export interface AdminCommentRecord {
  id: number;
  user_id: string;
  show_id: number | null;
  episode_id: number | null;
  content: string | null;
  created_at: string;
  parent_id: number | null;
  authorName: string;
  authorAvatar: string | null;
  authorPhone?: string | null;
  authorIsVip?: boolean;
  showName?: string | null;
}

interface CommentsTableClientProps {
  initialComments: AdminCommentRecord[];
}

/**
 * Helper to parse comment text and GIF URL
 * Supports [gif:URL] format and markdown ![GIF](URL)
 */
function parseCommentContent(rawContent: string | null) {
  if (!rawContent) return { text: '', gifUrl: null };

  const gifRegex = /\[gif:(https?:\/\/[^\]]+)\]/i;
  const mdGifRegex = /!\[GIF\]\((https?:\/\/[^\)]+)\)/i;

  let gifUrl: string | null = null;
  let text = rawContent;

  const match = rawContent.match(gifRegex) || rawContent.match(mdGifRegex);
  if (match) {
    gifUrl = match[1];
    text = rawContent.replace(match[0], '').trim();
  }

  return { text, gifUrl };
}

export default function CommentsTableClient({ initialComments }: CommentsTableClientProps) {
  const [comments, setComments] = useState<AdminCommentRecord[]>(initialComments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'gif' | 'episodes' | 'shows'>('all');

  // Loading states
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit Modal State
  const [editingComment, setEditingComment] = useState<AdminCommentRecord | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const content = c.content || '';
      const hasGif = content.includes('[gif:') || content.includes('![GIF]');

      if (filterType === 'gif' && !hasGif) return false;
      if (filterType === 'episodes' && !c.episode_id) return false;
      if (filterType === 'shows' && c.episode_id !== null) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.trim().toLowerCase();
      const matchAuthor = c.authorName.toLowerCase().includes(q);
      const matchContent = content.toLowerCase().includes(q);
      const matchShowId = c.show_id ? String(c.show_id).includes(q) : false;
      const matchShowName = c.showName ? c.showName.toLowerCase().includes(q) : false;
      const matchCommentId = String(c.id).includes(q);

      return matchAuthor || matchContent || matchShowId || matchShowName || matchCommentId;
    });
  }, [comments, searchTerm, filterType]);

  // Action: Delete Comment
  const handleDelete = async (comment: AdminCommentRecord) => {
    const confirmDelete = window.confirm(
      `آیا از حذف دیدگاه #${comment.id} ارسال‌شده توسط «${comment.authorName}» اطمینان دارید؟ این عمل غیرقابل بازگشت است.`
    );
    if (!confirmDelete) return;

    setDeletingId(comment.id);
    try {
      const res = await deleteAdminComment(comment.id);
      if (res.success) {
        // Optimistic UI state update
        setComments((prev) => prev.filter((item) => item.id !== comment.id));
        showToast(`دیدگاه #${comment.id} با موفقیت حذف گردید.`, 'success');
      } else {
        showToast(res.error || 'خطا در حذف دیدگاه', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Action: Open Edit Modal
  const openEditModal = (comment: AdminCommentRecord) => {
    setEditingComment(comment);
    setEditingContent(comment.content || '');
  };

  // Action: Save Edited Comment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment) return;

    if (!editingContent.trim()) {
      showToast('متن دیدگاه نمی‌تواند خالی باشد', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateAdminComment(editingComment.id, editingContent);
      if (res.success && res.updatedContent !== undefined) {
        // Optimistic UI state update
        setComments((prev) =>
          prev.map((c) =>
            c.id === editingComment.id ? { ...c, content: res.updatedContent! } : c
          )
        );
        showToast(`دیدگاه #${editingComment.id} با موفقیت ویرایش شد.`, 'success');
        setEditingComment(null);
      } else {
        showToast(res.error || 'خطا در ویرایش نظر', 'error');
      }
    } catch {
      showToast('خطای شبکه در ارتباط با سرور', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-[#121c12] border-emerald-500/30 text-emerald-300 shadow-emerald-950/40'
              : 'bg-[#1c1212] border-red-500/30 text-red-300 shadow-red-950/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-white p-0.5 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ویرایش دیدگاه #{editingComment.id}</h3>
                  <p className="text-xs text-gray-400">
                    نویسنده: <span className="text-white font-medium">{editingComment.authorName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingComment(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-medium">متن دیدگاه:</label>
                <textarea
                  rows={5}
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition resize-y leading-relaxed"
                  placeholder="متن نظر را ویرایش کنید..."
                />
                <p className="text-[11px] text-gray-400">
                  اگر نظر دارای گیف است، تگ <code className="text-gray-300 font-mono">[gif:URL]</code> را برای حفظ گیف دست‌نخورده نگه دارید.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingComment(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editingContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-black font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-[#ccff00]/10"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>ذخیره تغییرات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 sm:p-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در متن نظر، نام کاربر، شناسه یا نام سریال..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/50 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#ccff00] text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            همه ({toPersianDigits(comments.length)})
          </button>
          <button
            onClick={() => setFilterType('gif')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterType === 'gif'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>دارای گیف GIF</span>
          </button>
          <button
            onClick={() => setFilterType('episodes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterType === 'episodes'
                ? 'bg-blue-500 text-white font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>اپیزودها</span>
          </button>
          <button
            onClick={() => setFilterType('shows')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterType === 'shows'
                ? 'bg-amber-400 text-black font-bold'
                : 'text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>سریال‌ها</span>
          </button>
        </div>
      </div>

      {/* Results Count Header */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-400">
        <span>
          نمایش {toPersianDigits(filteredComments.length)} از {toPersianDigits(comments.length)} نظر اخیر
        </span>
        {searchTerm && <span>فیلتر شده بر اساس: &quot;{searchTerm}&quot;</span>}
      </div>

      {/* Comments Data Table Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 select-none">
                <th className="py-3.5 px-4 font-bold">نویسنده (Author)</th>
                <th className="py-3.5 px-4 font-bold">هدف (Target)</th>
                <th className="py-3.5 px-4 font-bold min-w-[280px]">محتوا (Content)</th>
                <th className="py-3.5 px-4 font-bold whitespace-nowrap">تاریخ ثبت</th>
                <th className="py-3.5 px-4 font-bold text-center whitespace-nowrap">عملیات (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="w-8 h-8 opacity-40" />
                      <p className="text-sm">هیچ نظری با این مشخصات یافت نشد.</p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-[#ccff00] underline mt-1 cursor-pointer"
                        >
                          پاک کردن فیلتر جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => {
                  const { text, gifUrl } = parseCommentContent(comment.content);
                  const isDeleting = deletingId === comment.id;
                  const dateObj = comment.created_at ? new Date(comment.created_at) : null;
                  const persianDate = dateObj ? formatPersianDate(dateObj) : '—';
                  const timeStr = dateObj
                    ? dateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <tr
                      key={comment.id}
                      className="hover:bg-white/[0.03] transition-colors align-top"
                    >
                      {/* Author Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3 min-w-[140px]">
                          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0 border border-white/5">
                            {comment.authorAvatar || '😎'}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs sm:text-sm truncate">
                                {comment.authorName}
                              </span>
                              {comment.authorIsVip && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 block truncate">
                              ID: {comment.user_id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Target Column (Show / Episode) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 min-w-[130px]">
                          {comment.show_id ? (
                            <Link
                              href={`/dashboard/tv/${comment.show_id}`}
                              target="_blank"
                              className="font-bold text-white hover:text-[#ccff00] text-xs flex items-center gap-1 transition"
                            >
                              <span>{comment.showName || `سریال #${comment.show_id}`}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-xs">دیدگاه عمومی</span>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {comment.episode_id ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                                <Tv className="w-2.5 h-2.5" />
                                <span>اپیزود #{comment.episode_id}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[10px]">
                                <Film className="w-2.5 h-2.5" />
                                <span>کل سریال</span>
                              </span>
                            )}

                            {comment.parent_id && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono">
                                پاسخ به #{comment.parent_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Content Column (Text + Rich GIF Preview) */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="space-y-2">
                          {text && (
                            <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                              {text}
                            </p>
                          )}

                          {gifUrl && (
                            <div className="mt-2 inline-block rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-md">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={gifUrl}
                                alt="گیف پیوست"
                                className="max-h-24 sm:max-h-28 w-auto object-contain hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {!text && !gifUrl && (
                            <span className="text-gray-400 italic text-xs">بدون متن</span>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{toPersianDigits(persianDate)}</span>
                          </div>
                          {timeStr && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              ساعت {toPersianDigits(timeStr)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(comment)}
                            disabled={isDeleting}
                            title="ویرایش متن نظر"
                            className="p-2 rounded-xl transition border text-xs bg-white/[0.03] border-white/10 text-gray-400 hover:text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/20 cursor-pointer disabled:opacity-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(comment)}
                            disabled={isDeleting}
                            title="حذف نظر"
                            className="p-2 rounded-xl transition border text-xs bg-white/[0.03] border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

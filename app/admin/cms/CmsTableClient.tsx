"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  X,
  Filter,
} from 'lucide-react';
import { togglePostPublish, deletePost } from '../cmsActions';
import { toPersianDigits, formatPersianDate } from '@/lib/subscription';

export interface PostRecord {
  id: number;
  title: string;
  slug: string;
  content: string;
  cover_image: string | null;
  author_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  authorName?: string;
  authorAvatar?: string | null;
}

interface CmsTableClientProps {
  initialPosts: PostRecord[];
}

export default function CmsTableClient({ initialPosts }: CmsTableClientProps) {
  const [posts, setPosts] = useState<PostRecord[]>(initialPosts);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Loading state trackers
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Delete confirmation modal state
  const [postToDelete, setPostToDelete] = useState<PostRecord | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  };

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter === 'published' && !post.published) return false;
      if (statusFilter === 'draft' && post.published) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchSlug = post.slug.toLowerCase().includes(q);
      const matchAuthor = (post.authorName || '').toLowerCase().includes(q);

      return matchTitle || matchSlug || matchAuthor;
    });
  }, [posts, searchTerm, statusFilter]);

  // Handle Toggle Publish
  const handleTogglePublish = async (post: PostRecord) => {
    setTogglingId(post.id);
    try {
      const res = await togglePostPublish(post.id, post.published);
      if (res.success && res.published !== undefined) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, published: res.published! } : p))
        );
        showToast(
          res.published ? 'نوشته با موفقیت منتشر شد.' : 'نوشته به حالت پیش‌نویس تغییر یافت.',
          'success'
        );
      } else {
        showToast(res.error || 'خطا در تغییر وضعیت انتشار نوشته', 'error');
      }
    } catch {
      showToast('خطای اتصال هنگام تغییر وضعیت انتشار نوشته', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const targetId = postToDelete.id;
    setDeletingId(targetId);

    try {
      const res = await deletePost(targetId);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== targetId));
        showToast('نوشته با موفقیت حذف شد.', 'success');
        setPostToDelete(null);
      } else {
        showToast(res.error || 'خطا در حذف نوشته', 'error');
      }
    } catch {
      showToast('خطای شبکه هنگام حذف نوشته', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0e0e0e] border border-white/5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس عنوان مقاله، نامک (Slug) یا نویسنده..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ccff00]/60 focus:ring-1 focus:ring-[#ccff00]/60 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>همه مقالات</span>
            <span className="font-mono text-[10px] opacity-70">({toPersianDigits(posts.length)})</span>
          </button>

          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'published'
                ? 'bg-emerald-400 text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>منتشر شده</span>
            <span className="font-mono text-[10px] opacity-70">
              ({toPersianDigits(posts.filter((p) => p.published).length)})
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === 'draft'
                ? 'bg-amber-400 text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>پیش‌نویس</span>
            <span className="font-mono text-[10px] opacity-70">
              ({toPersianDigits(posts.filter((p) => !p.published).length)})
            </span>
          </button>
        </div>
      </div>

      {/* Posts Table */}
      <div className="rounded-2xl border border-white/5 bg-[#0e0e0e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 text-[11px] font-bold">
                <th className="py-3.5 px-4 sm:px-6">مشخصات نوشته و نامک</th>
                <th className="py-3.5 px-4">نویسنده</th>
                <th className="py-3.5 px-4">وضعیت انتشار</th>
                <th className="py-3.5 px-4">تاریخ ثبت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-gray-400">هیچ مقاله‌ای یافت نشد</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {searchTerm
                        ? 'عبارت جستجو شده با هیچ نوشته‌ای همخوانی ندارد.'
                        : 'هنوز مقاله‌ای ثبت نشده است. می‌توانید با زدن دکمه «نوشته جدید» اولین مقاله را منتشر کنید.'}
                    </p>
                    <Link
                      href="/admin/cms/editor"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-[#ccff00] text-black font-bold text-xs hover:bg-[#b8e600] transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>نوشتن اولین مقاله</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => {
                  const isToggling = togglingId === post.id;
                  const createdDate = new Date(post.created_at);

                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Title & Cover */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center">
                            {post.cover_image ? (
                              <img
                                src={post.cover_image}
                                alt={post.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback on image error
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-gray-500" />
                            )}
                          </div>

                          {/* Title & Slug */}
                          <div className="space-y-1 min-w-0">
                            <Link
                              href={`/admin/cms/editor?id=${post.id}`}
                              className="font-bold text-white hover:text-[#ccff00] transition block truncate max-w-md"
                            >
                              {post.title}
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-xs">
                                /{post.slug}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {post.authorAvatar ? (
                            <img
                              src={post.authorAvatar}
                              alt={post.authorName || 'Author'}
                              className="w-6 h-6 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-300">
                              <User className="w-3 h-3" />
                            </div>
                          )}
                          <span className="text-xs text-gray-300 truncate max-w-[120px]">
                            {post.authorName || 'ادمین'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {post.published ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>منتشر شده</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>پیش‌نویس</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-300 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span>{formatPersianDate(createdDate)}</span>
                          </p>
                          <p className="text-[10px] font-mono text-gray-500">
                            {createdDate.toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Publish Toggle Button */}
                          <button
                            onClick={() => handleTogglePublish(post)}
                            disabled={isToggling}
                            title={post.published ? 'تغییر به پیش‌نویس' : 'انتشار عمومی'}
                            className={`p-2 rounded-xl border transition ${
                              post.published
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : post.published ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Link */}
                          <Link
                            href={`/admin/cms/editor?id=${post.id}`}
                            title="ویرایش مقاله"
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-[#ccff00] hover:border-[#ccff00]/30 hover:bg-[#ccff00]/5 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete Button */}
                          <button
                            onClick={() => setPostToDelete(post)}
                            title="حذف مقاله"
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#121212] border border-red-500/20 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white">تأیید حذف نوشته</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                آیا از حذف مقاله «<span className="text-white font-bold">{postToDelete.title}</span>» اطمینان دارید؟ این عمل غیرقابل بازگشت است.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPostToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال حذف...</span>
                  </>
                ) : (
                  <span>بله، حذف کن</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

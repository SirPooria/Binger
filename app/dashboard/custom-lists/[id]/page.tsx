"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  ArrowRight, Share2, Globe, Lock, Layers, 
  Loader2, CheckCircle2, Film
} from 'lucide-react';

export default function SingleListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params?.id as string;
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isPrivateDenied, setIsPrivateDenied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchListDetails = async () => {
      if (!listId) return;

      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        // ۱. دریافت مشخصات خود لیست
        const { data: listData, error: listError } = await supabase
          .from('user_lists')
          .select('*')
          .eq('id', listId)
          .single();

        if (listError || !listData) {
          setList(null);
          setLoading(false);
          return;
        }

        // بررسی حریم خصوصی (اگر خصوصی باشد و کاربر فعلی صاحبش نباشد)
        if (!listData.is_public && user?.id !== listData.user_id) {
          setIsPrivateDenied(true);
          setLoading(false);
          return;
        }

        setList(listData);

        // ۲. دریافت اطلاعات سازنده لیست
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', listData.user_id)
          .single();

        setCreator(creatorData || { username: 'کاربر بینجر', avatar_url: '😎' });

        // ۳. دریافت سریال‌های داخل این لیست
        const { data: itemsData, error: itemsError } = await supabase
          .from('list_items')
          .select('*')
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (!itemsError) {
          setItems(itemsData || []);
        }

      } catch (err) {
        console.error("Error loading single list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListDetails();
  }, [listId]);

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک اختصاصی لیست کپی شد!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  // اگر لیست خصوصی بود و متعلق به کاربر جاری نبود
  if (isPrivateDenied) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 pt-28">
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black mb-2">این لیست خصوصی است</h2>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            سازنده این لیست آن را در حالت خصوصی قرار داده است و فقط توسط خودش قابل مشاهده می‌باشد.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-xs font-bold bg-[#ccff00] text-black px-5 py-3 rounded-xl hover:bg-[#b3e600] transition-all"
          >
            <ArrowRight size={16} /> بازگشت به پروفایل
          </Link>
        </div>
      </div>
    );
  }

  // اگر لیست پیدا نشد
  if (!list) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 pt-28">
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black mb-2">لیست پیدا نشد</h2>
          <p className="text-xs text-gray-400 mb-6">
            ممکن است این لیست حذف شده باشد یا آدرس وارد شده نادرست باشد.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-all"
          >
            <ArrowRight size={16} /> بازگشت به پروفایل
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-24 md:pt-28">
      <div className="max-w-5xl mx-auto">

        {/* هدر بالای صفحه */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <ArrowRight size={16} />
            <span className="hidden sm:inline">بازگشت</span>
          </button>

          <button
            onClick={handleShare}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
            title="اشتراک‌گذاری لیست"
          >
            <Share2 size={16} className="text-[#ccff00]" />
            <span className="hidden sm:inline">اشتراک‌گذاری لیست</span>
          </button>
        </div>

        {/* کارت معرفی لیست و سازنده */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#ccff00]/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              {list.is_public ? (
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Globe size={12} /> لیست عمومی
                </span>
              ) : (
                <span className="bg-gray-500/10 border border-gray-500/30 text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Lock size={12} /> لیست خصوصی
                </span>
              )}
              <span className="text-xs text-gray-500">• {items.length} سریال ثبت شده</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
              {list.title}
            </h1>

            {list.description && (
              <p className="text-sm text-gray-300 mt-3 leading-relaxed max-w-3xl">
                {list.description}
              </p>
            )}

            {/* مشخصات سازنده */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner">
                {creator?.avatar_url || '😎'}
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">سازنده لیست:</span>
                <span className="text-xs font-bold text-white">
                  {creator?.username || 'کاربر بینجر'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* بخش نمایش سریال‌های داخل لیست */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Film size={20} className="text-[#ccff00]" /> سریال‌های این لیست ({items.length})
            </h2>
            <span className="text-xs text-gray-500">
              برای ورود به صفحه هر سریال روی آن کلیک کنید
            </span>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/tv/${item.show_id}`}
                  className="group flex flex-col transition-all duration-300 hover:-translate-y-1.5 cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-[#ccff00]/60 transition-all shadow-lg bg-white/5">
                    <img
                      src={getImageUrl(item.poster_path)}
                      alt={item.show_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#ccff00] transition-colors truncate px-1">
                    {item.show_name}
                  </h4>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-8">
              <Film size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-xs text-gray-400">هنوز هیچ سریالی در این لیست ثبت نشده است.</p>
            </div>
          )}
        </div>

      </div>

      {/* اعلان Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
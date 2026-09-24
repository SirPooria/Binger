"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowRight, Loader2, MessageSquare, 
  Tv, Crown, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { LeaderboardUser } from '@/app/api/leaderboard/route';

interface PaginationState {
  page: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [myRankData, setMyRankData] = useState<LeaderboardUser | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    totalUsers: 0,
    totalPages: 1,
  });

  const fetchLeaderboard = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?page=${targetPage}&limit=25`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json() as {
        items: LeaderboardUser[];
        myRankData?: LeaderboardUser | null;
        pagination: PaginationState;
      };

      setLeaderboard(data.items || []);
      if (data.myRankData) {
        setMyRankData(data.myRankData);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
      setPage(targetPage);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(1);
  }, [fetchLeaderboard]);

  const top1 = page === 1 ? leaderboard[0] : null;
  const top2 = page === 1 ? leaderboard[1] : null;
  const top3 = page === 1 ? leaderboard[2] : null;
  const restUsers = page === 1 ? leaderboard.slice(3) : leaderboard;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-32 selection:bg-[#ccff00] selection:text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/profile"
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              title="بازگشت به پروفایل"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Trophy className="text-[#ccff00]" size={28} /> جدول امتیازات و لیدربرد
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                برترین کاربران بینجر بر اساس تماشای اپیزودها، نقدها و جذب دنبال‌کننده
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-400">
            <span>هر اپیزود: <strong className="text-[#ccff00]">۱۰+</strong></span>
            <span>•</span>
            <span>هر کامنت: <strong className="text-cyan-400">۵+</strong></span>
            <span>•</span>
            <span>هر فالوور: <strong className="text-pink-400">۲+</strong></span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex items-center justify-center text-[#ccff00]">
            <Loader2 className="animate-spin" size={44} aria-label="در حال بارگذاری لیدربرد..." />
          </div>
        ) : (
          <>
            {/* Podium (only shown on page 1) */}
            {page === 1 && leaderboard.length >= 2 && (
              <div className="mb-12 pt-6">
                <div className="flex items-end justify-center gap-2 sm:gap-6 max-w-lg mx-auto">
                  {/* Rank 2 (Silver) */}
                  {top2 && (
                    <Link
                      href={`/dashboard/user/${top2.id}`}
                      className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-2xl p-2"
                    >
                      <div className="relative mb-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-400 bg-[#161616] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(148,163,184,0.3)]">
                          {top2.avatar_url}
                        </div>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-300 text-black font-black text-xs flex items-center justify-center shadow-md">
                          2
                        </div>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-slate-300 transition-colors truncate max-w-[100px] text-center mt-2">
                        {top2.username}
                      </h3>
                      <span className="text-xs font-black text-slate-300 ltr mt-0.5">{top2.score.toLocaleString('fa-IR')} امتیاز</span>

                      <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-900/60 to-slate-800/40 border-t-2 border-slate-400 rounded-t-2xl mt-3 flex items-center justify-center text-slate-400/30 font-black text-2xl">
                        🥈
                      </div>
                    </Link>
                  )}

                  {/* Rank 1 (Gold) */}
                  {top1 && (
                    <Link
                      href={`/dashboard/user/${top1.id}`}
                      className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-2 z-10 focus:outline-none focus:ring-2 focus:ring-[#ccff00] rounded-2xl p-2"
                    >
                      <div className="relative mb-2">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#ccff00] bg-[#161616] flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_35px_rgba(204,255,0,0.35)]">
                          {top1.avatar_url}
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-300 animate-bounce">
                          <Crown size={22} fill="currentColor" />
                        </div>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#ccff00] text-black font-black text-xs flex items-center justify-center shadow-lg">
                          1
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-white group-hover:text-[#ccff00] transition-colors truncate max-w-[120px] text-center mt-2">
                        {top1.username}
                      </h3>
                      <span className="text-xs sm:text-sm font-black text-[#ccff00] ltr mt-0.5">{top1.score.toLocaleString('fa-IR')} امتیاز</span>

                      <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-[#ccff00]/20 to-[#ccff00]/10 border-t-4 border-[#ccff00] rounded-t-2xl mt-3 flex items-center justify-center text-[#ccff00]/40 font-black text-3xl shadow-[0_-10px_30px_rgba(204,255,0,0.1)]">
                        🥇
                      </div>
                    </Link>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {top3 && (
                    <Link
                      href={`/dashboard/user/${top3.id}`}
                      className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-2xl p-2"
                    >
                      <div className="relative mb-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-700 bg-[#161616] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(180,83,9,0.3)]">
                          {top3.avatar_url}
                        </div>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                          3
                        </div>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-500 transition-colors truncate max-w-[100px] text-center mt-2">
                        {top3.username}
                      </h3>
                      <span className="text-xs font-black text-amber-500 ltr mt-0.5">{top3.score.toLocaleString('fa-IR')} امتیاز</span>

                      <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-950/60 to-amber-900/30 border-t-2 border-amber-700 rounded-t-2xl mt-3 flex items-center justify-center text-amber-700/30 font-black text-2xl">
                        🥉
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* List */}
            <div className="bg-[#101010] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                <span>رتبه و کاربر</span>
                <span>جزئیات فعالیت و امتیاز</span>
              </div>

              <div className="divide-y divide-white/5">
                {restUsers.length > 0 ? (
                  restUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/dashboard/user/${u.id}`}
                      className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/5 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="w-7 text-center font-black text-xs sm:text-sm text-gray-400 group-hover:text-white ltr">
                          #{u.rank}
                        </span>

                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                          {u.avatar_url}
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#ccff00] transition-colors flex items-center gap-1.5">
                            <span>{u.username}</span>
                            {u.is_vip && (
                              <span className="text-[9px] bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/30 px-1.5 py-0.2 rounded font-black">
                                VIP
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1"><Tv size={11} /> {u.episodesCount} اپیزود</span>
                            <span className="flex items-center gap-1"><MessageSquare size={11} /> {u.commentsCount} نظر</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-[#ccff00] ltr">
                          {u.score.toLocaleString('fa-IR')}
                        </span>
                        <ChevronLeft size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-gray-500">
                    کاربری در این صفحه وجود ندارد.
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => fetchLeaderboard(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl bg-[#121212] border border-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ccff00] transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                >
                  <ChevronRight size={14} />
                  <span>قبلی</span>
                </button>

                <span className="text-xs text-gray-400 font-bold px-3">
                  صفحه {page.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
                </span>

                <button
                  type="button"
                  onClick={() => fetchLeaderboard(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 rounded-xl bg-[#121212] border border-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ccff00] transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                >
                  <span>بعدی</span>
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating My Rank Bar */}
      {myRankData && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40">
          <div className="bg-[#161616]/95 backdrop-blur-xl border-2 border-[#ccff00]/60 rounded-2xl p-3.5 sm:p-4 shadow-[0_0_30px_rgba(204,255,0,0.2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ccff00] text-black font-black text-xs sm:text-sm flex items-center justify-center shadow-md ltr">
                #{myRankData.rank}
              </div>

              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xl shrink-0">
                {myRankData.avatar_url}
              </div>

              <div>
                <span className="text-xs font-black text-white block">
                  رتبه شما در بینجر
                </span>
                <span className="text-[10px] text-gray-400">
                  {myRankData.episodesCount} اپیزود تماشا شده • {myRankData.commentsCount} کامنت
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] text-gray-400 block">امتیاز کل:</span>
                <span className="text-sm sm:text-base font-black text-[#ccff00] ltr">
                  {myRankData.score.toLocaleString('fa-IR')}
                </span>
              </div>

              <Link
                href="/dashboard/profile"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors hidden sm:inline-block focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
              >
                پروفایل من
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
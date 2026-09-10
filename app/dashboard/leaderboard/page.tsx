"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Trophy, ArrowRight, Loader2, MessageSquare, 
  Tv, Crown, ChevronLeft 
} from 'lucide-react';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  episodesCount: number;
  commentsCount: number;
  followersCount: number;
  score: number;
  rank: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [myRankData, setMyRankData] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // ۱. دریافت نامحدود تمام اپیزودهای دیتابیس برای محاسبه عادلانه لیدربرد
        let allWatchedRows: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data } = await supabase
            .from('watched')
            .select('user_id')
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allWatchedRows = [...allWatchedRows, ...data];
            if (data.length < 1000) hasMore = false;
            else page++;
          }
        }

        // دریافت مشخصات پروفایل‌ها، کامنت‌ها و فالوها
        const [profilesRes, commentsRes, followsRes] = await Promise.all([
          supabase.from('profiles').select('id, username, avatar_url'),
          supabase.from('comments').select('user_id'),
          supabase.from('follows').select('following_id')
        ]);

        const profiles = profilesRes.data || [];
        const watched = allWatchedRows;
        const comments = commentsRes.data || [];
        const follows = followsRes.data || [];  

        // ۲. شمارش فعالیت‌های هر کاربر
        const watchedMap: Record<string, number> = {};
        watched.forEach((w: any) => {
          if (w.user_id) watchedMap[w.user_id] = (watchedMap[w.user_id] || 0) + 1;
        });

        const commentsMap: Record<string, number> = {};
        comments.forEach((c: any) => {
          if (c.user_id) commentsMap[c.user_id] = (commentsMap[c.user_id] || 0) + 1;
        });

        const followersMap: Record<string, number> = {};
        follows.forEach((f: any) => {
          if (f.following_id) followersMap[f.following_id] = (followersMap[f.following_id] || 0) + 1;
        });

        // ۳. محاسبه امتیاز هر کاربر طبق فرمول رسمی بینجر
        // هر اپیزود = ۱۰ امتیاز | هر کامنت = ۵ امتیاز | هر فالوور = ۲ امتیاز
        const calculatedUsers: LeaderboardUser[] = profiles.map((p: any) => {
          const eps = watchedMap[p.id] || 0;
          const cmts = commentsMap[p.id] || 0;
          const flws = followersMap[p.id] || 0;

          const totalScore = (eps * 10) + (cmts * 5) + (flws * 2);

          return {
            id: p.id,
            username: p.username || 'کاربر بینجر',
            avatar_url: p.avatar_url || '😎',
            episodesCount: eps,
            commentsCount: cmts,
            followersCount: flws,
            score: totalScore,
            rank: 0,
          };
        });

        // ۴. مرتب‌سازی بر اساس بیشترین امتیاز
        calculatedUsers.sort((a, b) => b.score - a.score);

        // ۵. رتبه‌بندی کاربران
        const rankedUsers = calculatedUsers.map((u, index) => ({
          ...u,
          rank: index + 1
        }));

        // پیدا کردن رتبه خودِ کاربر لاگین‌شده
        if (user) {
          const myData = rankedUsers.find(u => u.id === user.id);
          if (myData) {
            setMyRankData(myData);
          } else {
            setMyRankData({
              id: user.id,
              username: 'شما',
              avatar_url: '😎',
              episodesCount: watchedMap[user.id] || 0,
              commentsCount: commentsMap[user.id] || 0,
              followersCount: followersMap[user.id] || 0,
              score: ((watchedMap[user.id] || 0) * 10) + ((commentsMap[user.id] || 0) * 5) + ((followersMap[user.id] || 0) * 2),
              rank: rankedUsers.length + 1
            });
          }
        }

        // ۶. نمایش ۱۰۰ کاربر برتر
        setLeaderboard(rankedUsers.slice(0, 100));

      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={44} />
      </div>
    );
  }

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restUsers = leaderboard.slice(3);

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pt-24 md:pt-28 pb-32">
      <div className="max-w-4xl mx-auto">

        {/* هدر بالای صفحه */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/profile"
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="بازگشت به پروفایل"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Trophy className="text-[#ccff00]" size={28} /> جدول امتیازات و لیدربرد
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                ۱۰۰ کاربر برتر بینجر بر اساس تماشای اپیزودها، نقدها و جذب دنبال‌کننده
              </p>
            </div>
          </div>

          {/* راهنمای فرمول امتیاز */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-400">
            <span>هر اپیزود: <strong className="text-[#ccff00]">۱۰+</strong></span>
            <span>•</span>
            <span>هر کامنت: <strong className="text-cyan-400">۵+</strong></span>
            <span>•</span>
            <span>هر فالوور: <strong className="text-pink-400">۲+</strong></span>
          </div>
        </div>

        {/* --- سکوی ۳ نفر برتر (Podium) --- */}
        {leaderboard.length >= 2 && (
          <div className="mb-12 pt-6">
            <div className="flex items-end justify-center gap-2 sm:gap-6 max-w-lg mx-auto">

              {/* نفر دوم (نقره) */}
              {top2 && (
                <div 
                  onClick={() => router.push(`/dashboard/user/${top2.id}`)}
                  className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1.5"
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
                  <span className="text-xs font-black text-slate-300 ltr mt-0.5">{top2.score.toLocaleString()} امتیاز</span>

                  <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-900/60 to-slate-800/40 border-t-2 border-slate-400 rounded-t-2xl mt-3 flex items-center justify-center text-slate-400/30 font-black text-2xl">
                    🥈
                  </div>
                </div>
              )}

              {/* نفر اول (طلا) */}
              {top1 && (
                <div 
                  onClick={() => router.push(`/dashboard/user/${top1.id}`)}
                  className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-2 z-10"
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
                  <span className="text-xs sm:text-sm font-black text-[#ccff00] ltr mt-0.5">{top1.score.toLocaleString()} امتیاز</span>

                  <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-[#ccff00]/20 to-[#ccff00]/10 border-t-4 border-[#ccff00] rounded-t-2xl mt-3 flex items-center justify-center text-[#ccff00]/40 font-black text-3xl shadow-[0_-10px_30px_rgba(204,255,0,0.1)]">
                    🥇
                  </div>
                </div>
              )}

              {/* نفر سوم (برنز) */}
              {top3 && (
                <div 
                  onClick={() => router.push(`/dashboard/user/${top3.id}`)}
                  className="flex-1 flex flex-col items-center group cursor-pointer transition-all hover:-translate-y-1.5"
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
                  <span className="text-xs font-black text-amber-500 ltr mt-0.5">{top3.score.toLocaleString()} امتیاز</span>

                  <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-950/60 to-amber-900/30 border-t-2 border-amber-700 rounded-t-2xl mt-3 flex items-center justify-center text-amber-700/30 font-black text-2xl">
                    🥉
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* --- جدول رتبه‌بندی رتبه‌های ۴ به بعد --- */}
        <div className="bg-[#101010] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
            <span>رتبه و کاربر</span>
            <span>جزئیات فعالیت و امتیاز</span>
          </div>

          <div className="divide-y divide-white/5">
            {restUsers.length > 0 ? (
              restUsers.map((u) => {
                const isMe = currentUser && currentUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => router.push(`/dashboard/user/${u.id}`)}
                    className={`flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/5 transition-colors cursor-pointer group ${
                      isMe ? 'bg-[#ccff00]/10 border-r-4 border-[#ccff00]' : ''
                    }`}
                  >
                    {/* رتبه و نام */}
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
                          {isMe && (
                            <span className="bg-[#ccff00] text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                              شما
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1"><Tv size={11} /> {u.episodesCount} اپیزود</span>
                          <span className="flex items-center gap-1"><MessageSquare size={11} /> {u.commentsCount} نظر</span>
                        </div>
                      </div>
                    </div>

                    {/* امتیاز کل */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#ccff00] ltr">
                        {u.score.toLocaleString()}
                      </span>
                      <ChevronLeft size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-gray-500">
                هنوز کاربران دیگری در این بخش وجود ندارند.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- نوار شناور رتبه خودِ کاربر (همیشه چسبیده به پایین) --- */}
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
                  {myRankData.score.toLocaleString()}
                </span>
              </div>

              <Link
                href="/dashboard/profile"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors hidden sm:inline-block"
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
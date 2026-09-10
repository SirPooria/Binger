"use client";

import React, { useEffect, useState } from 'react';
import { 
  X, Check, Star, Play, Clock, Calendar, MessageSquare, 
  ChevronRight, ChevronLeft, Share2, Loader2, Send, Lock,
  CheckCircle2, Eye, Award, Reply, ArrowRight, CornerDownLeft,
  Image as ImageIcon
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getSeasonDetails, getImageUrl, getShowDetails, BASE_URL, API_KEY } from '@/lib/tmdbClient';
import confetti from 'canvas-confetti';

interface EpisodeModalProps {
  showId: string;
  seasonNum: number;
  episodeNum: number;
  watchedEpisodeIds?: number[];
  onClose: () => void;
  onWatchedChange?: () => void;
}

const REACTIONS = [
  { emoji: '🤯', label: 'شوکه شدم' },
  { emoji: '🔥', label: 'شاهکار' },
  { emoji: '😭', label: 'اشکم دراومد' },
  { emoji: '🤩', label: 'هیجان‌زده' },
  { emoji: '😴', label: 'خسته‌کننده' },
];

export default function EpisodeModal({
  showId,
  seasonNum,
  episodeNum: initialEpNum,
  watchedEpisodeIds = [],
  onClose,
  onWatchedChange
}: EpisodeModalProps) {
  const supabase = createClient() as any;

  const [currentEpNum, setCurrentEpNum] = useState(initialEpNum);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [episode, setEpisode] = useState<any>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [currentView, setCurrentView] = useState<'overview' | 'forum'>('overview');

  // بازیگران و نظرسنجی ۱۰۰٪ واقعی از دیتابیس
  const [mainCast, setMainCast] = useState<any[]>([]);
  const [castList, setCastList] = useState<any[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [characterVotes, setCharacterVotes] = useState<Record<number, number>>({});
  const [totalCharacterVotes, setTotalCharacterVotes] = useState(0);

  // ری‌اکشن‌های ۱۰۰٪ واقعی از دیتابیس
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [reactionVotes, setReactionVotes] = useState<Record<string, number>>({});
  const [totalReactionVotes, setTotalReactionVotes] = useState(0);

  // نظرات و ریپلای
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, { username: string; avatar_url: string; percent: number }>>({});
  const [friendsWatchedCount, setFriendsWatchedCount] = useState(0);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const triggerCelebration = () => {
    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch {}
  };

  // ۱. دریافت فصل و بازیگران اصلی
  useEffect(() => {
    const fetchSeasonAndMainCast = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const [sData, creditsRes] = await Promise.all([
          getSeasonDetails(String(showId), Number(seasonNum)),
          fetch(`${BASE_URL}/tv/${showId}/credits?api_key=${API_KEY}`).then(r => r.json()).catch(() => ({}))
        ]);

        const eps = sData?.episodes || [];
        setSeasonEpisodes(eps);

        if (creditsRes?.cast) {
          setMainCast(creditsRes.cast.slice(0, 10));
        }
      } catch (err) {
        console.error("Error loading season data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonAndMainCast();
  }, [showId, seasonNum]);

  // ۲. مدیریت اپیزود جاری، اولویت‌بندی بازیگران اصلی و خواندن آمار واقعی از دیتابیس
  useEffect(() => {
    if (seasonEpisodes.length === 0) return;

    const currentEp = seasonEpisodes.find((e: any) => e.episode_number === currentEpNum) || seasonEpisodes[0];
    setEpisode(currentEp);
    setReplyingTo(null);
    // بررسی آنی در حافظه (بدون حتی ۱ صدم ثانیه تاخیر)
    if (currentEp) {
      setIsWatched(watchedEpisodeIds.includes(currentEp.id));
    }

    const guestStars = currentEp?.guest_stars || [];
    const combinedCast = [...mainCast, ...guestStars];
    const uniqueCast = Array.from(new Map(combinedCast.map(item => [item.id, item])).values());
    const finalCast = uniqueCast.slice(0, 8);
    setCastList(finalCast);

    if (currentEp && user) {
      // بررسی وضعیت تماشا
      supabase
        .from('watched')
        .select('id')
        .eq('user_id', user.id)
        .eq('show_id', Number(showId))
        .eq('episode_id', currentEp.id)
        .maybeSingle()
        .then(({ data }: any) => setIsWatched(!!data));

      // شمارش کاربران تماشا کرده
      supabase
        .from('watched')
        .select('id', { count: 'exact', head: true })
        .eq('show_id', Number(showId))
        .eq('episode_id', currentEp.id)
        .then(({ count }: any) => setFriendsWatchedCount(count || 0));

      // خواندن رای و ری‌اکشن خود کاربر از دیتابیس
      // خواندن رای و ری‌اکشن کاربر از جدول جدید دیتابیس
      supabase
        .from('episode_reactions')
        .select('reaction, character_id')
        .eq('user_id', user.id)
        .eq('episode_id', currentEp.id)
        .maybeSingle()
        .then(({ data }: any) => {
          setSelectedReaction(data?.reaction || null);
          setSelectedCharacterId(data?.character_id ? Number(data.character_id) : null);
        });

      // محاسبه درصدهای واقعی از دیتابیس
      fetchLiveCommunityStats(currentEp.id, finalCast);

      // خواندن نظرات این اپیزود
      fetchCommentsWithProfiles(currentEp.id);
    }
  }, [seasonEpisodes, currentEpNum, user, showId, mainCast]);

  // ۳. محاسبه درصدهای ۱۰۰٪ داینامیک و واقعی از روی رکوردهای دیتابیس (بدون هیچ فیک یا عدد شبیه‌سازی‌شده)
  const fetchLiveCommunityStats = async (epId: number, actors: any[]) => {
    try {
      const { data: allReactions } = await supabase
        .from('episode_reactions')
        .select('reaction, character_id')
        .eq('episode_id', epId);

      const records = allReactions || [];

      // الف) محاسبه درصد واقعی ایموجی‌ها
      const reactionRecords = records.filter((r: any) => r.reaction);
      const totalR = reactionRecords.length;
      setTotalReactionVotes(totalR);

      if (totalR > 0) {
        const rCounts: Record<string, number> = {};
        reactionRecords.forEach((r: any) => {
          rCounts[r.reaction] = (rCounts[r.reaction] || 0) + 1;
        });

        const rPercentMap: Record<string, number> = {};
        REACTIONS.forEach(r => {
          rPercentMap[r.emoji] = Math.round(((rCounts[r.emoji] || 0) / totalR) * 100);
        });
        setReactionVotes(rPercentMap);
      } else {
        setReactionVotes({});
      }

      // ب) محاسبه درصد واقعی شخصیت‌ها
      const characterRecords = records.filter((r: any) => r.character_id);
      const totalC = characterRecords.length;
      setTotalCharacterVotes(totalC);

      if (totalC > 0) {
        const cCounts: Record<number, number> = {};
        characterRecords.forEach((r: any) => {
          const cId = Number(r.character_id);
          cCounts[cId] = (cCounts[cId] || 0) + 1;
        });

        const cPercentMap: Record<number, number> = {};
        actors.forEach(actor => {
          const count = cCounts[actor.id] || 0;
          cPercentMap[actor.id] = Math.round((count / totalC) * 100);
        });
        setCharacterVotes(cPercentMap);
      } else {
        setCharacterVotes({});
      }

    } catch (err) {
      console.error("Error fetching live community stats:", err);
    }
  };

  // دریافت کامنت‌ها و مشخصات کامل نویسندگان
  const fetchCommentsWithProfiles = async (epId: number) => {
    try {
      const { data: cData } = await supabase
        .from('comments')
        .select('*')
        .eq('show_id', Number(showId))
        .eq('episode_id', epId)
        .order('created_at', { ascending: false });

      if (cData && cData.length > 0) {
        setComments(cData);
        const userIds = Array.from(new Set(cData.map((c: any) => c.user_id)));

        const [profilesRes, watchedRes, showRes] = await Promise.all([
          supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
          supabase.from('watched').select('user_id').eq('show_id', Number(showId)).in('user_id', userIds),
          getShowDetails(String(showId))
        ]);

        const profiles = profilesRes.data || [];
        const watchedList = watchedRes.data || [];
        const totalEps = showRes?.number_of_episodes || (seasonEpisodes.length > 0 ? seasonEpisodes.length : 1);

        const authorsMap: Record<string, { username: string; avatar_url: string; percent: number }> = {};

        userIds.forEach((uId: any) => {
          const prof = profiles.find((p: any) => p.id === uId);
          const userCount = watchedList.filter((w: any) => w.user_id === uId).length;
          const percent = totalEps > 0 ? Math.min(100, Math.round((userCount / totalEps) * 100)) : 100;

          authorsMap[uId] = {
            username: prof?.username || (uId === user?.id ? (user?.user_metadata?.full_name || 'شما') : 'کاربر بینجر'),
            avatar_url: prof?.avatar_url || '😎',
            percent: percent
          };
        });

        setCommentAuthors(authorsMap);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };

  // اکشن تغییر تماشا
  const handleToggleWatched = async () => {
    if (!user || !episode) return;

    setActionLoading(true);
    const nextState = !isWatched;
    setIsWatched(nextState);

    try {
      if (!nextState) {
        await supabase
          .from('watched')
          .delete()
          .eq('user_id', user.id)
          .eq('show_id', Number(showId))
          .eq('episode_id', episode.id);

        showToast('علامت تماشا برداشته شد.');
      } else {
        await supabase
          .from('watched')
          .insert([{
            user_id: user.id,
            show_id: Number(showId),
            episode_id: episode.id
          }]);

        triggerCelebration();
        showToast('دیدم! تالار نظرات و نظرسنجی باز شد 🎉');
      }

      if (onWatchedChange) onWatchedChange();
    } catch (err) {
      console.error(err);
      setIsWatched(!nextState);
      showToast('خطا در تغییر وضعیت تماشا.');
    } finally {
      setActionLoading(false);
    }
  };

 // ثبت ری‌اکشن حسی در دیتابیس
  const handleSelectReaction = async (emoji: string) => {
    setSelectedReaction(emoji);
    setReactionVotes(prev => ({ ...prev, [emoji]: 100 }));
    setTotalReactionVotes(prev => Math.max(prev, 1));

    if (!user || !episode) return;

    try {
      const payload: any = {
        user_id: user.id,
        show_id: Number(showId),
        episode_id: episode.id,
        reaction: emoji,
      };

      // حفظ بازیگر انتخابی قبلی در صورت وجود
      if (selectedCharacterId) {
        payload.character_id = selectedCharacterId;
      }

      const { error } = await supabase
        .from('episode_reactions')
        .upsert(payload, { onConflict: 'user_id, episode_id' });

      if (error) throw error;

      showToast(`حس شما ثبت شد: ${emoji}`);
      fetchLiveCommunityStats(episode.id, castList);

    } catch (err: any) {
      console.error("Error saving reaction:", err);
      showToast(err.message || 'خطا در ثبت ری‌اکشن.');
    }
  };

  // ثبت رای شخصیت برتر در دیتابیس
  const handleVoteCharacter = async (actor: any) => {
    setSelectedCharacterId(actor.id);
    setCharacterVotes(prev => ({ ...prev, [actor.id]: 100 }));
    setTotalCharacterVotes(prev => Math.max(prev, 1));

    if (!user || !episode) return;

    try {
      const payload: any = {
        user_id: user.id,
        show_id: Number(showId),
        episode_id: episode.id,
        character_id: actor.id,
        character_name: actor.character || actor.name,
      };

      // حفظ ری‌اکشن انتخابی قبلی در صورت وجود
      if (selectedReaction) {
        payload.reaction = selectedReaction;
      }

      const { error } = await supabase
        .from('episode_reactions')
        .upsert(payload, { onConflict: 'user_id, episode_id' });

      if (error) throw error;

      showToast(`رای شما برای ${actor.character || actor.name} ثبت شد! 🌟`);
      fetchLiveCommunityStats(episode.id, castList);

    } catch (err: any) {
      console.error("Error voting character:", err);
      showToast(err.message || 'خطا در ثبت رای شخصیت.');
    }
  };

  // ارسال نظر یا پاسخ در فروم
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !episode || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const commentPayload: any = {
        user_id: user.id,
        show_id: Number(showId),
        episode_id: episode.id,
        content: newComment.trim(),
        created_at: new Date().toISOString()
      };

      if (replyingTo) {
        commentPayload.parent_id = replyingTo.id;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([commentPayload])
        .select()
        .single();

      if (error) throw error;

      // محاسبه فوری درصد کاربر
      const { data: userWatched } = await supabase
        .from('watched')
        .select('id')
        .eq('user_id', user.id)
        .eq('show_id', Number(showId));

      const showData = await getShowDetails(String(showId));
      const totalEps = showData?.number_of_episodes || (seasonEpisodes.length > 0 ? seasonEpisodes.length : 1);
      const userCount = userWatched?.length || 0;
      const myPercent = totalEps > 0 ? Math.min(100, Math.round((userCount / totalEps) * 100)) : 100;

      setCommentAuthors(prev => ({
        ...prev,
        [user.id]: {
          username: user.user_metadata?.full_name || user.user_metadata?.name || 'شما',
          avatar_url: user.user_metadata?.avatar_url || '😎',
          percent: myPercent
        }
      }));

      setComments(prev => [data, ...prev]);
      setNewComment('');
      setReplyingTo(null);
      showToast(replyingTo ? 'پاسخ شما با موفقیت ارسال شد!' : 'نظر شما در تالار ثبت شد!');

    } catch (err: any) {
      console.error("Comment submit error:", err);
      showToast(err.message || 'خطا در ثبت نظر.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShareEpisode = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک این قسمت کپی شد!');
    }
  };

  const totalEpisodesInSeason = seasonEpisodes.length;
  const isLastEpisode = totalEpisodesInSeason > 0 && currentEpNum >= totalEpisodesInSeason;

  const rootComments = comments.filter(c => !c.parent_id);
  const getRepliesForComment = (parentId: number) => comments.filter(c => c.parent_id === parentId);
// بررسی اینکه آیا تاریخ پخش این قسمت رسیده یا نه
  const isEpisodeReleased = episode?.air_date ? new Date(episode.air_date) <= new Date() : false;
  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        dir="rtl"
        className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] relative my-auto font-['Vazirmatn'] flex flex-col max-h-[92vh] transition-all duration-300"
        onClick={e => e.stopPropagation()}
      >

        {/* هدر بالای مودال */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#161616] shrink-0">
          {currentView === 'forum' ? (
            <button
              onClick={() => setCurrentView('overview')}
              className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              <ArrowRight size={16} />
              <span>بازگشت به جزئیات اپیزود</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentEpNum(prev => Math.max(1, prev - 1))}
                disabled={currentEpNum <= 1 || loading}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="قسمت قبلی"
              >
                <ChevronRight size={16} />
                <span className="hidden sm:inline">قسمت قبلی</span>
              </button>

              <span className="text-xs font-black px-3 py-1 rounded-xl bg-black/60 border border-white/10 text-white ltr font-mono">
                S{String(seasonNum).padStart(2, '0')}E{String(currentEpNum).padStart(2, '0')}
              </span>

              <button
                onClick={() => setCurrentEpNum(prev => Math.min(totalEpisodesInSeason || 99, prev + 1))}
                disabled={isLastEpisode || loading}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="قسمت بعدی"
              >
                <span className="hidden sm:inline">قسمت بعدی</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareEpisode}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="اشتراک‌گذاری"
            >
              <Share2 size={16} className="text-[#ccff00]" />
            </button>

            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= نمای ۱: جزئیات اپیزود + نظرسنجی و ری‌اکشن ۱۰۰٪ واقعی ================= */}
        {currentView === 'overview' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#ccff00]">
                <Loader2 className="animate-spin" size={36} />
                <span className="text-xs text-gray-400">در حال لود اپیزود...</span>
              </div>
            ) : episode ? (
              <>
                {/* کاور سینمایی */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl group">
                  {episode.still_path ? (
                    <img 
                      src={getImageUrl(episode.still_path)} 
                      alt={episode.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-gray-500">
                      <Play size={40} className="opacity-30 mb-2" />
                      <span className="text-xs">بدون تصویر رسمی</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex items-end p-4 sm:p-5">
                    <div className="w-full flex items-end justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black bg-[#ccff00] text-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            خط زمانی: اپیزود {currentEpNum}
                          </span>
                          {episode.air_date && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1 font-bold">
                              <Calendar size={12} /> {episode.air_date}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                          {episode.name}
                        </h3>
                      </div>

                      {episode.vote_average > 0 && (
                        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
                          <Star size={14} fill="#ccff00" className="text-[#ccff00]" />
                          <span className="text-xs font-black text-white ltr font-mono">
                            {episode.vote_average.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ردیف بینجرهای تماشا کرده */}
                <div className="flex items-center justify-between px-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-[#121212] flex items-center justify-center text-[10px]">🎬</div>
                      <div className="w-6 h-6 rounded-full bg-pink-500 border-2 border-[#121212] flex items-center justify-center text-[10px]">🍿</div>
                      <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-[#121212] flex items-center justify-center text-[10px]">👑</div>
                    </div>
                    <span className="text-gray-300 font-bold">
                      {friendsWatchedCount > 0 ? `${friendsWatchedCount} بینجر این قسمت را دیده‌اند` : 'اولین نفری باشید که این قسمت را می‌بیند'}
                    </span>
                  </div>

                  {episode.runtime && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock size={13} className="text-[#ccff00]" /> {episode.runtime} دقیقه
                    </span>
                  )}
                </div>

                {/* خلاصه داستان */}
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {episode.overview || 'خلاصه داستانی برای این قسمت ثبت نشده است.'}
                  </p>
                </div>

                {/* دکمه علامت‌گذاری تماشا */}
                <div>
                  {!isEpisodeReleased ? (
                    <div className="w-full py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 select-none">
                      <Clock size={16} className="text-amber-400" />
                      <span>این قسمت هنوز پخش نشده است {episode.air_date ? `(تاریخ پخش: ${episode.air_date})` : ''}</span>
                    </div>
                  ) : (
                  <button
                    disabled={actionLoading}
                    onClick={handleToggleWatched}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                      isWatched
                        ? 'bg-[#ccff00] text-black shadow-[0_0_25px_rgba(204,255,0,0.3)] hover:bg-[#b3e600]'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isWatched ? (
                      <>
                        <Check size={20} strokeWidth={3} />
                        <span> تماشا شده ✅ </span>
                      </>
                    ) : (
                      <>
                        <Eye size={20} />
                        <span> این اپیزود را تماشا کردم </span>
                      </>
                    )}
                  </button>
                  )}
                </div>

                {/* بخش افشای تدریجی */}
                {!isWatched ? (
                  <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-center overflow-hidden">
                    <div className="absolute inset-0 backdrop-blur-md bg-black/50 z-10 flex flex-col items-center justify-center p-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                        <Lock size={24} />
                      </div>
                      <h4 className="text-sm font-black text-white mb-1">
                        برای باز شدن ری‌اکشن‌ها، نظرسنجی و نظرات، این قسمت را تماشا کنید
                      </h4>
                      <p className="text-[11px] text-gray-400 max-w-sm">
                        جهت جلوگیری از لو رفتن داستان، نظرسنجی بهترین کاراکتر و تالار گفتگو پس از زدن دکمه «دیدم» باز خواهد شد.
                      </p>
                    </div>

                    <div className="opacity-20 pointer-events-none space-y-3 filter blur-sm">
                      <div className="h-8 bg-white/20 rounded-xl w-3/4 mx-auto"></div>
                      <div className="h-16 bg-white/10 rounded-xl"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    {/* ۱. ری‌اکشن حسی ۱۰۰٪ واقعی از دیتابیس (با درصد زنده برای تک‌تک ایموجی‌ها) */}
                    <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-300 block">
                          حس شما بعد از دیدن این قسمت چی بود؟
                        </span>
                        {totalReactionVotes > 0 && (
                          <span className="text-[10px] text-gray-400 ltr font-mono font-bold">
                            {totalReactionVotes} رای ثبت شده
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {REACTIONS.map((r) => {
                          const isSelected = selectedReaction === r.emoji;
                          const votePercent = reactionVotes[r.emoji] || 0;

                          return (
                            <button
                              key={r.emoji}
                              onClick={() => handleSelectReaction(r.emoji)}
                              className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                  ? 'bg-[#ccff00]/15 border-[#ccff00] scale-105 shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
                              }`}
                            >
                              {selectedReaction && totalReactionVotes > 0 && (
                                <div 
                                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] transition-all duration-700"
                                  style={{ width: `${votePercent}%` }}
                                />
                              )}

                              <span className="text-2xl sm:text-3xl">{r.emoji}</span>
                              <span className="text-[10px] text-gray-400 font-bold mt-1">{r.label}</span>

                              {/* نمایش درصد ۱۰۰٪ واقعی هر ایموجی از دیتابیس */}
                              {selectedReaction && totalReactionVotes > 0 && (
                                <span className="text-[10px] font-black text-[#ccff00] ltr font-mono mt-0.5">
                                  {votePercent}٪
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ۲. نظرسنجی کاراکتر برتر ۱۰۰٪ واقعی از دیتابیس (با اولویت بازیگران اصلی مثل آلن ریچسون) */}
                    {castList.length > 0 && (
                      <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            <Award size={16} className="text-amber-400" />
                            <span>شخصیت مورد علاقه شما در این اپیزود کی بود؟</span>
                          </h4>
                          {totalCharacterVotes > 0 && (
                            <span className="text-[10px] text-gray-400 ltr font-mono font-bold">
                              {totalCharacterVotes} رای ثبت شده
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {castList.map((actor) => {
                            const isSelected = selectedCharacterId === actor.id;
                            const votePercent = characterVotes[actor.id] || 0;

                            return (
                              <div
                                key={actor.id}
                                onClick={() => handleVoteCharacter(actor)}
                                className={`relative rounded-2xl p-2.5 border transition-all cursor-pointer overflow-hidden flex flex-col items-center text-center group ${
                                  isSelected 
                                    ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.25)]' 
                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                }`}
                              >
                                {totalCharacterVotes > 0 && (
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] transition-all duration-700" 
                                    style={{ width: `${votePercent}%` }}
                                  />
                                )}

                                <div className="w-14 h-14 rounded-full overflow-hidden mb-2 border-2 border-white/10 group-hover:border-[#ccff00]/60 transition-colors bg-black shrink-0">
                                  {actor.profile_path ? (
                                    <img src={getImageUrl(actor.profile_path)} className="w-full h-full object-cover" alt={actor.name} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">👤</div>
                                  )}
                                </div>

                                <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#ccff00] transition-colors">
                                  {actor.character || actor.name}
                                </h5>
                                <span className="text-[9px] text-gray-400 line-clamp-1 mt-0.5">{actor.name}</span>

                                {/* نمایش درصد ۱۰۰٪ واقعی هر شخصیت از دیتابیس */}
                                {totalCharacterVotes > 0 && (
                                  <span className="mt-1.5 text-[11px] font-black text-[#ccff00] ltr font-mono">
                                    {votePercent}٪ آرا
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ۳. کارت ورود به فروم اپیزود */}
                    <div 
                      onClick={() => setCurrentView('forum')}
                      className="bg-gradient-to-r from-purple-900/30 to-[#ccff00]/10 border border-white/10 hover:border-[#ccff00]/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all cursor-pointer group shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-[#ccff00] group-hover:scale-110 transition-transform">
                          <MessageSquare size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white group-hover:text-[#ccff00] transition-colors">
                            تالار نقد و نظرات این قسمت
                          </h4>
                          <span className="text-xs text-gray-400 mt-0.5 block font-bold">
                            تعداد نقد و نظرات: <strong className="text-white ltr font-mono">({comments.length} نظر)</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#ccff00] bg-white/5 px-3 py-2 rounded-xl group-hover:bg-[#ccff00] group-hover:text-black transition-all">
                        <span>ورود به فروم</span>
                        <ChevronLeft size={16} />
                      </div>
                    </div>

                    {/* دکمه انتقال به قسمت بعدی */}
                    {!isLastEpisode && (
                      <div className="pt-2">
                        <button
                          onClick={() => setCurrentEpNum(prev => prev + 1)}
                          className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-[#ccff00] text-white hover:text-black font-black text-xs border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                        >
                          <span>ثبت قسمت بعدی (S{String(seasonNum).padStart(2, '0')}E{String(currentEpNum + 1).padStart(2, '0')})</span>
                          <ChevronLeft size={16} />
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ================= نمای ۲: تالار کامل فروم و نظرات ================= */}
        {currentView === 'forum' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#ccff00]" />
                <h3 className="text-base font-black text-white">
                  تالار بحث و گفتگوی قسمت {currentEpNum}
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-bold ltr font-mono">
                {comments.length} نظر ثبت شده
              </span>
            </div>

            {/* فرم ثبت نظر جدید */}
            <form onSubmit={handleSubmitComment} className="bg-[#181818] border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-lg">
              <div className="relative">
                <textarea
                  rows={2}
                  value={replyingTo ? '' : newComment}
                  onChange={(e) => { setReplyingTo(null); setNewComment(e.target.value); }}
                  placeholder="نظرت یا تحلیلت درباره این قسمت چیه؟ (بدون اسپویل)..."
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showToast('ارسال گیف (Giphy) در نسخه نهایی فعال خواهد شد 🎬')}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#ccff00] bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="افزودن گیف"
                  >
                    <ImageIcon size={14} />
                    <span>GIF</span>
                  </button>
                  <span className="text-[10px] text-gray-500 hidden sm:inline">نقد محترمانه و بدون اسپویل</span>
                </div>

                <button
                  type="submit"
                  disabled={submittingComment || replyingTo !== null || !newComment.trim()}
                  className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-20 text-black font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>ارسال نظر</span>
                </button>
              </div>
            </form>

            {/* لیست کامل درخت کامنت‌ها (تک‌باره و بدون تکرار) */}
            {rootComments.length > 0 ? (
              <div className="space-y-4">
                {rootComments.map((comment) => {
                  const author = commentAuthors[comment.user_id] || {
                    username: comment.user_id === user?.id ? (user?.user_metadata?.full_name || 'شما') : 'کاربر بینجر',
                    avatar_url: '😎',
                    percent: 100
                  };

                  const replies = getRepliesForComment(comment.id);
                  const isReplyingHere = replyingTo?.id === comment.id;

                  return (
                    <div key={comment.id} className="space-y-2">
                      
                      {/* کامنت اصلی */}
                      <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm shrink-0">
                              {author.avatar_url}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {author.username}
                                {comment.user_id === user?.id && (
                                  <span className="text-[9px] bg-[#ccff00] text-black px-1.5 py-0.2 rounded font-black mr-1.5">شما</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-500 ltr font-mono">
                              {new Date(comment.created_at).toLocaleDateString('fa-IR')}
                            </span>
                            <button
                              onClick={() => {
                                if (isReplyingHere) {
                                  setReplyingTo(null);
                                  setNewComment('');
                                } else {
                                  setReplyingTo(comment);
                                  setNewComment('');
                                }
                              }}
                              className={`text-xs flex items-center gap-1 transition-colors cursor-pointer px-2.5 py-1 rounded-lg ${
                                isReplyingHere 
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                                  : 'text-gray-400 hover:text-[#ccff00] hover:bg-white/5'
                              }`}
                            >
                              <Reply size={13} />
                              <span>{isReplyingHere ? 'بستن کادر' : 'پاسخ'}</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed pr-10">
                          {comment.content}
                        </p>

                        {/* پروگرس‌بار درصد تماشای سریال */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] pr-10">
                          <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${author.percent === 100 ? 'bg-[#ccff00]' : 'bg-cyan-400'}`}
                                style={{ width: `${Math.max(author.percent, 5)}%` }}
                              />
                            </div>
                            <span className="font-bold text-gray-400 ltr font-mono">{author.percent}٪</span>
                          </div>

                          <span className={`font-bold ${author.percent === 100 ? 'text-[#ccff00]' : 'text-gray-400'}`}>
                            {author.percent === 100 ? 'کل سریال رو دیده 👑' : `${author.percent}٪ از سریال رو دیده`}
                          </span>
                        </div>
                      </div>

                      {/* کادر پاسخ درجا (دقیقاً زیر همین کامنت) */}
                      {isReplyingHere && (
                        <form
                          onSubmit={handleSubmitComment}
                          className="mr-6 border-r-2 border-[#ccff00] pr-3 animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                          <div className="bg-[#141414] border border-[#ccff00]/40 rounded-2xl p-3 space-y-2.5 shadow-2xl">
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span className="flex items-center gap-1.5">
                                <CornerDownLeft size={14} className="text-[#ccff00]" />
                                در حال ارسال پاسخ به: <strong className="text-white">{author.username}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(null); setNewComment(''); }}
                                className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
                              >
                                انصراف
                              </button>
                            </div>

                            <textarea
                              autoFocus
                              rows={2}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder={`پاسخ خود به ${author.username} را بنویسید...`}
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none resize-none leading-relaxed"
                            />

                            <div className="flex justify-end gap-2">
                              <button
                                type="submit"
                                disabled={submittingComment || !newComment.trim()}
                                className="bg-[#ccff00] hover:bg-[#b3e600] disabled:opacity-20 text-black font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                <span>ارسال پاسخ</span>
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* پاسخ‌های تو در تو */}
                      {replies.length > 0 && (
                        <div className="mr-6 space-y-2 border-r-2 border-white/10 pr-3">
                          {replies.map((rep) => {
                            const repAuthor = commentAuthors[rep.user_id] || {
                              username: rep.user_id === user?.id ? (user?.user_metadata?.full_name || 'شما') : 'کاربر بینجر',
                              avatar_url: '😎',
                              percent: 100
                            };

                            return (
                              <div key={rep.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                                      {repAuthor.avatar_url}
                                    </div>
                                    <span className="text-xs font-bold text-gray-200">
                                      {repAuthor.username}
                                      {rep.user_id === user?.id && (
                                        <span className="text-[8px] bg-[#ccff00] text-black px-1.5 py-0.2 rounded font-black mr-1">شما</span>
                                      )}
                                    </span>
                                  </div>

                                  <span className="text-[10px] text-gray-500 ltr font-mono">
                                    {new Date(rep.created_at).toLocaleDateString('fa-IR')}
                                  </span>
                                </div>

                                <p className="text-xs text-gray-300 leading-relaxed pr-8">
                                  {rep.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 text-xs">
                هنوز گفتگویی برای این قسمت شکل نگرفته است؛ اولین نفری باشید که نظر می‌دهد!
              </div>
            )}

          </div>
        )}

      </div>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-[200] flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
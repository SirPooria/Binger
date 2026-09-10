"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import Link from 'next/link';
import { 
  Loader2, Zap, MessageSquare, Heart, Award, X, Clock, Play, 
  User as UserIcon, Lock, CheckCircle, Share2, Trophy, Tv, 
  Layers, ArrowRight, UserPlus, UserCheck, CheckCircle2 
} from 'lucide-react';

const ALL_ACHIEVEMENTS = [
  { id: 'pilot_tester', title: 'The Pilot Tester', icon: '🧪', category: 'محتوا', desc: 'تماشای قسمت اول (پایلوت) از ۵ سریال مختلف بدون دراپ کردن.', threshold: 5, type: 'pilot' },
  { id: 'seasoned_finisher', title: 'Seasoned Finisher', icon: '🏁', category: 'محتوا', desc: 'تمام کردن کامل یک سریال که حداقل ۵ فصل دارد.', threshold: 1, type: 'completed_long' },
  { id: 'genre_nomad', title: 'Genre Nomad', icon: '🧭', category: 'محتوا', desc: 'ثبت تماشای سریال در ۵ ژانر کاملاً متفاوت در یک ماه.', threshold: 5, type: 'genres' },
  { id: 'the_perfectionist', title: 'The Perfectionist', icon: '⭐', category: 'محتوا', desc: 'امتیاز دادن به تک‌تک اپیزودهای یک فصل کامل.', threshold: 1, type: 'rated_season' },
  { id: 'early_adopter', title: 'Early Adopter', icon: '⚡', category: 'محتوا', desc: 'ثبت و نقد یک سریال جدید در ۴۸ ساعت اول انتشار جهانی آن.', threshold: 1, type: 'early_review' },
  { id: 'binge_pioneer', title: 'Binge Pioneer', icon: '⛏️', category: 'محتوا', desc: 'اضافه کردن سریالی به لیست تماشا که کمتر از ۱۰۰ نفر آن را می‌بینند.', threshold: 1, type: 'niche_show' },
  { id: 'cinematic_marathon', title: 'Cinematic Marathon', icon: '🏃', category: 'محتوا', desc: 'تماشای ۵ اپیزود از یک سریال در کمتر از ۲۴ ساعت.', threshold: 5, type: 'marathon' },
  { id: 'the_reviver', title: 'The Reviver', icon: '🔄', category: 'محتوا', desc: 'از سرگیری سریالی که بیش از ۶ ماه رها شده بوده است.', threshold: 1, type: 'revived' },
  { id: 'weekend_warrior', title: 'Weekend Warrior', icon: '⚔️', category: 'وفاداری', desc: 'ثبت تماشای حداقل یک اپیزود در ۴ آخر هفته متوالی.', threshold: 4, type: 'weekend' },
  { id: 'streak_7days', title: '7-Day Streak', icon: '🔥', category: 'وفاداری', desc: 'ثبت تماشا یا فعالیت در اپلیکیشن برای ۷ روز پشت سر هم.', threshold: 7, type: 'streak' },
  { id: 'night_owl', title: 'Night Owl', icon: '🦉', category: 'وفاداری', desc: 'ثبت تماشای ۵ اپیزود در بازه زمانی ۱۲ شب تا ۴ صبح.', threshold: 5, type: 'night_owl' },
  { id: 'monthly_ritual', title: 'Monthly Ritual', icon: '📅', category: 'وفاداری', desc: 'داشتن حداقل یک ثبت تماشا در هر ماه برای ۶ ماه متوالی.', threshold: 6, type: 'monthly' },
  { id: 'season_premiere_tracker', title: 'Season Premiere Tracker', icon: '🎯', category: 'وفاداری', desc: 'ثبت تماشای اولین اپیزود از فصل جدید سریال در ۲۴ ساعت اول.', threshold: 1, type: 'premiere' },
  { id: 'consistent_critic', title: 'Consistent Critic', icon: '✍️', category: 'وفاداری', desc: 'ثبت حداقل یک نقد یا کامنت در ۳ هفته پیاپی.', threshold: 3, type: 'critic_streak' },
  { id: 'morning_bird', title: 'Morning Bird', icon: '🌅', category: 'وفاداری', desc: 'ثبت تماشا بین ساعت ۵ تا ۸ صبح.', threshold: 1, type: 'morning_bird' },
  { id: 'loyal_viewer', title: 'The Loyal Viewer', icon: '🛡️', category: 'وفاداری', desc: 'تماشای یک سریال در حال پخش تا پایان فصل بدون وقفه طولانی.', threshold: 1, type: 'loyal' },
  { id: 'one_year_club', title: 'One Year Club', icon: '🎂', category: 'وفاداری', desc: 'عضویت و فعالیت مستمر به مدت ۵۲ هفته (یک سال تمام).', threshold: 365, type: 'account_age' },
  { id: 'chronological_master', title: 'Chronological Master', icon: '⏳', category: 'چالشی', desc: 'تماشای آثار یک دنیای سینمایی بر اساس خط زمانی داستان.', threshold: 1, type: 'chronological' },
  { id: 'the_randomizer', title: 'The Randomizer', icon: '🎲', category: 'چالشی', desc: 'انتخاب یک عنوان تصادفی از آثار برتر (IMDb Top 250) و تماشای کامل آن.', threshold: 1, type: 'randomizer' },
  { id: 'top_1_percent', title: 'Top 1% Fan', icon: '🥇', category: 'چالشی', desc: 'قرار گرفتن جزو ۱ درصد سریع‌ترین کاربران در به پایان رساندن یک سریال.', threshold: 1, type: 'top_speed' },
  { id: 'trendsetter', title: 'Trendsetter', icon: '💎', category: 'چالشی', desc: 'نوشتن نقدی که بیش از ۲۰ لایک از دیگران دریافت کند.', threshold: 20, type: 'review_likes' },
  { id: 'easter_egg_hunter', title: 'Easter Egg Hunter', icon: '🥚', category: 'چالشی', desc: 'پیدا کردن یک ویژگی پنهان یا ایستر اگ در محیط اپلیکیشن.', threshold: 1, type: 'easter_egg' },
  { id: 'cult_leader', title: 'Cult Leader', icon: '🔮', category: 'چالشی', desc: '۵ فالوور سریالی را شروع کنند که شما به تازگی نقد کرده‌اید.', threshold: 5, type: 'cult' },
  { id: 'the_advocate', title: 'The Advocate', icon: '📢', category: 'چالشی', desc: 'به اشتراک‌گذاری پروفایل یا لیست تماشای بینجر در شبکه‌های اجتماعی.', threshold: 1, type: 'advocate' },
  { id: 'badge_of_honor', title: 'Badge of Honor', icon: '🎖️', category: 'چالشی', desc: 'دریافت تایید و ریپلای مثبت از یک کاربر سطح بالا در پلتفرم.', threshold: 1, type: 'honor' },
  { id: 'matchmaker', title: 'Matchmaker', icon: '💞', category: 'اجتماعی', desc: 'افزودن همزمان یک سریال به لیست محبوب‌ها با کاربری که فالو دارید.', threshold: 1, type: 'matchmaker' },
  { id: 'first_follower', title: 'The First Follower', icon: '🤝', category: 'اجتماعی', desc: 'فالو کردن کاربری که دقیقاً همان روز در اپلیکیشن ثبت‌نام کرده است.', threshold: 1, type: 'first_follower' },
  { id: 'echo_chamber', title: 'Echo Chamber', icon: '🔊', category: 'اجتماعی', desc: 'تماشای سریالی توسط ۳ نفر از فالوورهایتان که به آن ۵ ستاره داده‌اید.', threshold: 3, type: 'echo' },
  { id: 'the_debater', title: 'The Debater', icon: '💬', category: 'اجتماعی', desc: 'شرکت در یک رشته کامنت با حداقل ۵ رفت‌وبرگشت بحث.', threshold: 5, type: 'debater' },
  { id: 'conversation_starter', title: 'Conversation Starter', icon: '💡', category: 'اجتماعی', desc: 'نوشتن نقدی که حداقل ۱۰ کامنت متفاوت دریافت کند.', threshold: 10, type: 'starter' },
  { id: 'squad_goals', title: 'Squad Goals', icon: '👥', category: 'اجتماعی', desc: 'ساختن یک لیست سفارشی که توسط ۵ کاربر دیگر ذخیره شود.', threshold: 5, type: 'squad' },
  { id: 'mutual_trust', title: 'Mutual Trust', icon: '🤲', category: 'اجتماعی', desc: 'فالو کردن متقابل با ۲۰ کاربر مختلف (دریافت ۲۰ فالوبک).', threshold: 20, type: 'mutual' },
  { id: 'the_scout', title: 'The Scout', icon: '🔭', category: 'اجتماعی', desc: 'معرفی زودهنگام سریالی که بعدها بین فالوورهایتان ترند شود.', threshold: 1, type: 'scout' },
  { id: 'community_pillar', title: 'Community Pillar', icon: '🏛️', category: 'اجتماعی', desc: 'رسیدن به ۱۰۰ فالوور واقعی به همراه ثبت حداقل ۵۰ نقد ارزشمند.', threshold: 100, type: 'pillar' },
  { id: 'viral_critic', title: 'Viral Critic', icon: '🚀', category: 'اجتماعی', desc: 'کلیک خوردن لینک نقد شما در خارج از اپلیکیشن بینجر.', threshold: 1, type: 'viral' },
];

export default function UserPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params?.id as string;
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);

  // وضعیت فالو
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // آمار
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });

  // لیست‌ها و سریال‌ها
  const [favorites, setFavorites] = useState<any[]>([]);
  const [watchedShows, setWatchedShows] = useState<any[]>([]);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // فیلتر مدال‌ها
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchTargetUserData = async () => {
      if (!targetUserId) return;

      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // اگر کاربر دارد پروفایل خودش را در این آدرس می‌بیند، به پروفایل خود هدایت شود
        if (user && user.id === targetUserId) {
          router.replace('/dashboard/profile');
          return;
        }

        // ۱. دریافت پروفایل کاربر هدف
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        setTargetProfile(profile || { username: 'کاربر بینجر', avatar_url: '😎', bio: '' });

        // ۲. بررسی اینکه آیا کاربر جاری این شخص را فالو دارد یا خیر
        if (user) {
          const { data: followRecord } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle();

          setIsFollowing(!!followRecord);
        }

        // ۳. آمار تماشا شده‌ها (نامحدود و کامل)
        let allTargetWatched: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data } = await supabase
            .from('watched')
            .select('show_id, created_at')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false })
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allTargetWatched = [...allTargetWatched, ...data];
            if (data.length < 1000) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        const watchedData = allTargetWatched;

        const showsDetailsMap: any = {};

        if (watchedData && watchedData.length > 0) {
          setTotalEpisodes(watchedData.length);

          const sortedWatched = [...watchedData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const uniqueShowIds = Array.from(new Set(sortedWatched.map((i: any) => i.show_id)));

          await Promise.all(uniqueShowIds.slice(0, 30).map(async (id) => {
            const d = await getShowDetails(String(id));
            if (d) showsDetailsMap[String(id)] = d;
          }));

          let totalMinutes = 0;
          watchedData.forEach((item: any) => {
            const show = showsDetailsMap[String(item.show_id)];
            const runtime = show?.episode_run_time?.[0] || 45;
            totalMinutes += runtime;
          });

          const daysTotal = Math.floor(totalMinutes / (24 * 60));
          const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;

          setTimeStats({ months, days, hours: hoursTotal });

          const lastShowId = sortedWatched[0]?.show_id;
          if (showsDetailsMap[String(lastShowId)]?.backdrop_path) {
            setCoverImage(getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path));
          }

          const allWatchedList = uniqueShowIds.map((id) => {
            const d = showsDetailsMap[String(id)];
            if (!d) return null;
            const totalEps = d.number_of_episodes || 1;
            const watchedCount = watchedData.filter((w: any) => String(w.show_id) === String(id)).length;
            const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
            return { ...d, progress, watchedCount, totalEps };
          }).filter(Boolean);

          setWatchedShows(allWatchedList);
        }

        // ۴. آمارهای فالوور و فالوینگ
        const [followersRes, followingRes, commentsRes] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId)
        ]);

        setSocialStats({
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
          comments: commentsRes.count || 0
        });

        // ۵. محبوب‌ترین‌های کاربر هدف
        const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', targetUserId);
        if (favData && favData.length > 0) {
          const favs = await Promise.all(favData.map(async (f: any) => {
            let d = showsDetailsMap[String(f.show_id)];
            if (!d) d = await getShowDetails(String(f.show_id));
            if (!d) return null;

            const totalEps = d.number_of_episodes || 1;
            const watchedCount = watchedData ? watchedData.filter((w: any) => String(w.show_id) === String(f.show_id)).length : 0;
            const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
            return { ...d, progress, watchedCount, totalEps };
          }));
          setFavorites(favs.filter(Boolean));
        }

        // ۶. فقط لیست‌های عمومی کاربر هدف
        const { data: listsData } = await supabase
          .from('user_lists')
          .select(`
            *,
            list_items ( id, show_id, show_name, poster_path )
          `)
          .eq('user_id', targetUserId)
          .eq('is_public', true)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        setPublicLists(listsData || []);

      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetUserData();
  }, [targetUserId]);

  // اکشن فالو / آنفالو
  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // آنفالو
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        setSocialStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        showToast('آنفالو شد.');
      } else {
        // فالو
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId,
            follower_email: currentUser.email || null,
            following_email: null
          });

        if (error) throw error;
        setIsFollowing(true);
        setSocialStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        showToast('دنبال شد!');
      }
    } catch (err: any) {
      console.error("Follow error:", err);
      showToast('خطا در تغییر وضعیت دنبال‌کردن.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک پروفایل کپی شد!');
    }
  };

  const getBadgeProgress = (badge: any) => {
    let current = 0;
    if (badge.type === 'pilot') current = watchedShows.length;
    else if (badge.type === 'night_owl') current = Math.min(badge.threshold, Math.floor(totalEpisodes * 0.3));
    else if (badge.type === 'morning_bird') current = totalEpisodes > 0 ? 1 : 0;
    else if (badge.type === 'marathon') current = totalEpisodes >= 5 ? 5 : totalEpisodes;
    else if (badge.type === 'account_age') {
      const createdAt = targetProfile?.created_at ? new Date(targetProfile.created_at).getTime() : Date.now();
      current = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    } else if (badge.type === 'pillar') {
      current = Math.min(socialStats.followers, socialStats.comments);
    } else if (badge.type === 'mutual') {
      current = Math.min(socialStats.followers, socialStats.following);
    } else if (badge.type === 'debater' || badge.type === 'critic_streak') {
      current = socialStats.comments;
    }

    const percentage = Math.min(100, Math.round((current / badge.threshold) * 100));
    return { current, isUnlocked: current >= badge.threshold, percentage };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-12 overflow-x-hidden flex flex-col">

      {/* --- مدال نشان / اچیومنت --- */}
      {selectedBadge && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={() => setSelectedBadge(null)}>
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10 cursor-pointer"><X size={20} /></button>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${getBadgeProgress(selectedBadge).isUnlocked ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' : 'bg-white/5 border-white/10 grayscale opacity-50'}`}>
              {selectedBadge.icon}
            </div>
            <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
            {getBadgeProgress(selectedBadge).isUnlocked ? (
              <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <CheckCircle size={18} /> دریافت شده توسط کاربر
              </div>
            ) : (
              <span className="text-xs text-gray-500 flex items-center gap-1"><Lock size={14} /> هنوز قفل است</span>
            )}
          </div>
        </div>
      )}

      {/* --- HERO HEADER --- */}
      <div className="relative w-full h-[55vh] min-h-[420px]">
        <div className="absolute inset-0">
          {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-50" alt="Cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
        </div>

        <div className="absolute top-20 md:top-24 w-full px-6 flex justify-between items-center z-20">
          <button 
            onClick={() => router.back()}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-white/10 flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowRight size={16} /> بازگشت
          </button>

          <button 
            onClick={handleShare}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2.5 rounded-full transition-all border border-white/10 flex items-center text-gray-300 hover:text-white cursor-pointer"
            title="اشتراک‌گذاری پروفایل"
          >
            <Share2 size={16} className="text-[#ccff00]" />
          </button>
        </div>

        {/* اطلاعات پروفایل در پایین هدر */}
        <div className="absolute bottom-0 w-full px-6 pb-6 flex flex-col items-center z-20 translate-y-8">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden relative z-10">
              {targetProfile?.avatar_url || '😎'}
            </div>
            <div className="absolute inset-0 bg-[#ccff00] blur-2xl opacity-20 rounded-full"></div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-black mt-4 ltr tracking-tight text-white">
            {targetProfile?.username || 'کاربر بینجر'}
          </h1>
          
          {targetProfile?.bio && (
            <p className="text-sm text-gray-400 mt-2 max-w-md text-center leading-relaxed px-4">
              {targetProfile.bio}
            </p>
          )}

          {/* دکمه فالو / آنفالو */}
          <div className="flex items-center gap-3 mt-4">
            <button
              disabled={followLoading}
              onClick={handleToggleFollow}
              className={`px-6 py-2.5 rounded-full font-black text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg ${
                isFollowing
                  ? 'bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 border border-white/20'
                  : 'bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]'
              }`}
            >
              {followLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck size={16} />
                  <span> دنبال میکنید </span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>دنبال کردن  </span>
                </>
              )}
            </button>
          </div>

          {/* نوار آمار سوشیال */}
          <div className="flex items-center gap-2 mt-6 bg-[#1a1a1a]/80 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
            <div className="flex flex-col items-center justify-center w-20 py-2">
              <span className="text-lg font-black text-white">{socialStats.followers}</span>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">Followers</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center justify-center w-20 py-2">
              <span className="text-lg font-black text-white">{socialStats.following}</span>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">Following</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center justify-center w-20 py-2">
              <span className="text-lg font-black text-white">{socialStats.comments}</span>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">Comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- محتوای اصلی پروفایل --- */}
      <div className="max-w-5xl mx-auto px-4 mt-20 space-y-12 w-full">

        {/* آمار تماشا */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={100} /></div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="text-[#ccff00]" size={14} /> زمان کل تماشا
            </h3>
            <div className="flex items-end gap-4 ltr">
              <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.months}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ماه</span></div>
              <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.days}</span><span className="text-[10px] text-gray-500 uppercase font-bold">روز</span></div>
              <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ساعت</span></div>
            </div>
          </div>

          <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_40px_rgba(204,255,0,0.1)]">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Play size={120} fill="black" /></div>
            <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">این کاربر تا این لحظه</h3>
            <div className="text-4xl md:text-5xl font-black mt-2">{totalEpisodes}</div>
            <p className="text-[10px] font-bold mt-1 opacity-60">اپیزود سریال تماشا کرده</p>
          </div>

          {/* ویترین افتخارات */}
          <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Award className="text-pink-500" size={16} /> ویترین افتخارات ({ALL_ACHIEVEMENTS.filter(b => getBadgeProgress(b).isUnlocked).length} از {ALL_ACHIEVEMENTS.length})
              </h3>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['همه', 'محتوا', 'وفاداری', 'چالشی', 'اجتماعی'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat ? 'bg-[#ccff00] text-black shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {ALL_ACHIEVEMENTS
                .filter(b => selectedCategory === 'همه' || b.category === selectedCategory)
                .map((badge) => {
                  const { isUnlocked, percentage } = getBadgeProgress(badge);
                  return (
                    <div 
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[110px] cursor-pointer transition-all hover:scale-105 ${
                        isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-50 grayscale'
                      }`}
                    >
                      <div className="text-4xl drop-shadow-md mb-1">{badge.icon}</div>
                      <span className={`text-[10px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.title}</span>
                      {!isUnlocked && (
                        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-gray-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* لیست‌های عمومی کاربر هدف */}
        {publicLists.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Layers size={20} className="text-[#ccff00]" /> لیست‌های پیشنهادی ({publicLists.length})
              </h2>
              <span className="text-xs text-gray-500">لیست‌های عمومی ایجاد شده توسط این کاربر</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicLists.map((list) => {
                const items = list.list_items || [];
                return (
                  <Link
                    key={list.id}
                    href={`/dashboard/custom-lists/${list.id}`}
                    className="bg-white/5 border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-emerald-400 font-bold">🌐 عمومی</span>
                      <span className="text-xs text-gray-500 font-bold">{items.length} سریال</span>
                    </div>

                    <h4 className="text-base font-black text-white group-hover:text-[#ccff00] transition-colors">
                      {list.title}
                    </h4>

                    {list.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                        {list.description}
                      </p>
                    )}

                    {items.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-hidden">
                        {items.slice(0, 5).map((item: any) => (
                          <div key={item.id} className="w-10 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-white/10">
                            <img src={getImageUrl(item.poster_path)} alt={item.show_name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* محبوب‌ترین‌های کاربر */}
        {favorites.length > 0 && (
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 mb-6">
              <Heart className="text-red-500 fill-red-500" size={20} /> سریال های مورد علاقه ({favorites.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {favorites.map((s) => (
                <UserShowCard key={s.id} show={s} router={router} />
              ))}
            </div>
          </div>
        )}

        {/* سریال‌های تماشا شده با کاروسل و درگ موس */}
        {watchedShows.length > 0 && (
          <div className="pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Tv size={20} className="text-[#ccff00]" /> آخرین سریال های تماشا شده ({watchedShows.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 ml-2 hidden sm:inline">۲۰ اثر اخیر</span>
                <button 
                  onClick={() => {
                    const el = document.getElementById('user-watched-carousel');
                    if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  ▶
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('user-watched-carousel');
                    if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  ◀
                </button>
              </div>
            </div>

            <div 
              id="user-watched-carousel"
              dir="rtl"
              onMouseDown={(e) => {
                const slider = e.currentTarget;
                slider.dataset.isDown = 'true';
                slider.dataset.startX = `${e.pageX - slider.offsetLeft}`;
                slider.dataset.scrollLeft = `${slider.scrollLeft}`;
              }}
              onMouseLeave={(e) => { delete e.currentTarget.dataset.isDown; }}
              onMouseUp={(e) => { delete e.currentTarget.dataset.isDown; }}
              onMouseMove={(e) => {
                const slider = e.currentTarget;
                if (slider.dataset.isDown !== 'true') return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const startX = Number(slider.dataset.startX);
                const scrollLeft = Number(slider.dataset.scrollLeft);
                const walk = (x - startX) * 1.5;
                slider.scrollLeft = scrollLeft - walk;
              }}
              className="flex gap-4 overflow-x-auto pb-4 no-scrollbar cursor-grab active:cursor-grabbing select-none scroll-smooth"
            >
              {watchedShows.slice(0, 20).map((s) => (
                <div key={s.id} className="w-[130px] md:w-[150px] shrink-0">
                  <UserShowCard show={s} router={router} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c1c] text-[#ccff00] border border-[#ccff00]/40 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function UserShowCard({ show, router }: any) {
  const getSafeImageUrl = (path: string | null) => {
    if (!path) return '/placeholder-poster.jpg';
    return getImageUrl(path);
  };

  const progress = show.progress ?? 0;
  const isCompleted = progress === 100;

  return (
    <div 
      onClick={() => router.push(`/dashboard/tv/${show.id}`)} 
      className="group cursor-pointer flex flex-col transition-all duration-300 hover:-translate-y-1.5"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-[#ccff00]/50 transition-all shadow-lg bg-white/5">
        <img src={getSafeImageUrl(show.poster_path)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={show.name} />
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-black ltr">
          {isCompleted ? <span className="text-[#ccff00]">۱۰۰٪</span> : <span className="text-cyan-400">{progress}٪</span>}
        </div>
      </div>

      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.6)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#ccff00] transition-colors truncate px-0.5">
        {show.name}
      </h4>
      <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5 mt-0.5">
        {isCompleted ? (
          <span className="text-[#ccff00] font-bold flex items-center gap-1"><CheckCircle size={11} /> کامل شده</span>
        ) : (
          <span className="text-gray-400">{show.watchedCount} از {show.totalEps} اپیزود</span>
        )}
      </div>
    </div>
  );
}
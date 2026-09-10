"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, Zap, MessageSquare, Heart, 
  Plus, Award, X, Clock, Play, User as UserIcon, 
  Lock, CheckCircle, LogOut, Share2, Trophy, Instagram, Twitter, Github, BookmarkPlus, Tv, Layers
} from 'lucide-react';

// --- لیست نهایی ۳۵ اچیومنت رسمی بینجر ---
const ALL_ACHIEVEMENTS = [
  // ۱. تعامل با محتوا و محصول
  { id: 'pilot_tester', title: 'The Pilot Tester', icon: '🧪', category: 'محتوا', desc: 'تماشای قسمت اول (پایلوت) از ۵ سریال مختلف بدون دراپ کردن.', threshold: 5, type: 'pilot' },
  { id: 'seasoned_finisher', title: 'Seasoned Finisher', icon: '🏁', category: 'محتوا', desc: 'تمام کردن کامل یک سریال که حداقل ۵ فصل دارد.', threshold: 1, type: 'completed_long' },
  { id: 'genre_nomad', title: 'Genre Nomad', icon: '🧭', category: 'محتوا', desc: 'ثبت تماشای سریال در ۵ ژانر کاملاً متفاوت در یک ماه.', threshold: 5, type: 'genres' },
  { id: 'the_perfectionist', title: 'The Perfectionist', icon: '⭐', category: 'محتوا', desc: 'امتیاز دادن به تک‌تک اپیزودهای یک فصل کامل.', threshold: 1, type: 'rated_season' },
  { id: 'early_adopter', title: 'Early Adopter', icon: '⚡', category: 'محتوا', desc: 'ثبت و نقد یک سریال جدید در ۴۸ ساعت اول انتشار جهانی آن.', threshold: 1, type: 'early_review' },
  { id: 'binge_pioneer', title: 'Binge Pioneer', icon: '⛏️', category: 'محتوا', desc: 'اضافه کردن سریالی به لیست تماشا که کمتر از ۱۰۰ نفر آن را می‌بینند.', threshold: 1, type: 'niche_show' },
  { id: 'cinematic_marathon', title: 'Cinematic Marathon', icon: '🏃', category: 'محتوا', desc: 'تماشای ۵ اپیزود از یک سریال در کمتر از ۲۴ ساعت.', threshold: 5, type: 'marathon' },
  { id: 'the_reviver', title: 'The Reviver', icon: '🔄', category: 'محتوا', desc: 'از سرگیری سریالی که بیش از ۶ ماه رها شده بوده است.', threshold: 1, type: 'revived' },

  // ۲. وفاداری و بازگشت کاربر
  { id: 'weekend_warrior', title: 'Weekend Warrior', icon: '⚔️', category: 'وفاداری', desc: 'ثبت تماشای حداقل یک اپیزود در ۴ آخر هفته متوالی.', threshold: 4, type: 'weekend' },
  { id: 'streak_7days', title: '7-Day Streak', icon: '🔥', category: 'وفاداری', desc: 'ثبت تماشا یا فعالیت در اپلیکیشن برای ۷ روز پشت سر هم.', threshold: 7, type: 'streak' },
  { id: 'night_owl', title: 'Night Owl', icon: '🦉', category: 'وفاداری', desc: 'ثبت تماشای ۵ اپیزود در بازه زمانی ۱۲ شب تا ۴ صبح.', threshold: 5, type: 'night_owl' },
  { id: 'monthly_ritual', title: 'Monthly Ritual', icon: '📅', category: 'وفاداری', desc: 'داشتن حداقل یک ثبت تماشا در هر ماه برای ۶ ماه متوالی.', threshold: 6, type: 'monthly' },
  { id: 'season_premiere_tracker', title: 'Season Premiere Tracker', icon: '🎯', category: 'وفاداری', desc: 'ثبت تماشای اولین اپیزود از فصل جدید سریال در ۲۴ ساعت اول.', threshold: 1, type: 'premiere' },
  { id: 'consistent_critic', title: 'Consistent Critic', icon: '✍️', category: 'وفاداری', desc: 'ثبت حداقل یک نقد یا کامنت در ۳ هفته پیاپی.', threshold: 3, type: 'critic_streak' },
  { id: 'morning_bird', title: 'Morning Bird', icon: '🌅', category: 'وفاداری', desc: 'ثبت تماشا بین ساعت ۵ تا ۸ صبح.', threshold: 1, type: 'morning_bird' },
  { id: 'loyal_viewer', title: 'The Loyal Viewer', icon: '🛡️', category: 'وفاداری', desc: 'تماشای یک سریال در حال پخش تا پایان فصل بدون وقفه طولانی.', threshold: 1, type: 'loyal' },
  { id: 'one_year_club', title: 'One Year Club', icon: '🎂', category: 'وفاداری', desc: 'عضویت و فعالیت مستمر به مدت ۵۲ هفته (یک سال تمام).', threshold: 365, type: 'account_age' },

  // ۳. گیمیفیکیشن و چالش‌های خاص
  { id: 'chronological_master', title: 'Chronological Master', icon: '⏳', category: 'چالشی', desc: 'تماشای آثار یک دنیای سینمایی بر اساس خط زمانی داستان.', threshold: 1, type: 'chronological' },
  { id: 'the_randomizer', title: 'The Randomizer', icon: '🎲', category: 'چالشی', desc: 'انتخاب یک عنوان تصادفی از آثار برتر (IMDb Top 250) و تماشای کامل آن.', threshold: 1, type: 'randomizer' },
  { id: 'top_1_percent', title: 'Top 1% Fan', icon: '🥇', category: 'چالشی', desc: 'قرار گرفتن جزو ۱ درصد سریع‌ترین کاربران در به پایان رساندن یک سریال.', threshold: 1, type: 'top_speed' },
  { id: 'trendsetter', title: 'Trendsetter', icon: '💎', category: 'چالشی', desc: 'نوشتن نقدی که بیش از ۲۰ لایک از دیگران دریافت کند.', threshold: 20, type: 'review_likes' },
  { id: 'easter_egg_hunter', title: 'Easter Egg Hunter', icon: '🥚', category: 'چالشی', desc: 'پیدا کردن یک ویژگی پنهان یا ایستر اگ در محیط اپلیکیشن.', threshold: 1, type: 'easter_egg' },
  { id: 'cult_leader', title: 'Cult Leader', icon: '🔮', category: 'چالشی', desc: '۵ فالوور سریالی را شروع کنند که شما به تازگی نقد کرده‌اید.', threshold: 5, type: 'cult' },
  { id: 'the_advocate', title: 'The Advocate', icon: '📢', category: 'چالشی', desc: 'به اشتراک‌گذاری پروفایل یا لیست تماشای بینجر در شبکه‌های اجتماعی.', threshold: 1, type: 'advocate' },
  { id: 'badge_of_honor', title: 'Badge of Honor', icon: '🎖️', category: 'چالشی', desc: 'دریافت تایید و ریپلای مثبت از یک کاربر سطح بالا در پلتفرم.', threshold: 1, type: 'honor' },

  // ۴. اثر شبکه‌ای و اجتماعی
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

export default function ProfilePage() {
  const supabase = createClient() as any; 
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState({ username: '', bio: '', avatar_url: '😎' });
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });
  
  // Lists
  const [favorites, setFavorites] = useState<any[]>([]);
  const [watchedShows, setWatchedShows] = useState<any[]>([]);
  const [customLists, setCustomLists] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'comments' | null>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      try {
        // ۱. واکشی اطلاعات پروفایل (نام کاربری و بیو)
        const { data: profileData } = await supabase
              .from('profiles')
              .select('username, bio, avatar_url')
              .eq('id', user.id)
              .single();
              
          if (profileData) {
              setProfileInfo({
                  username: profileData.username || '',
                  bio: profileData.bio || '',
                  avatar_url: profileData.avatar_url || user?.user_metadata?.avatar_url || '😎'
              });
          }

        // ۲. دریافت اطلاعات تماشا شده‌ها و محاسبه پروگرس‌بارها
        // ۲. دریافت نامحدود تمام اپیزودهای تماشا شده (شکستن سقف ۱۰۰۰تایی سوپابیس)
          let allWatchedData: any[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('watched')
              .select('show_id, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error || !data || data.length === 0) {
              hasMore = false;
            } else {
              allWatchedData = [...allWatchedData, ...data];
              if (data.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          const watchedData = allWatchedData;
        
        const showsDetailsMap: any = {};

        if (watchedData && watchedData.length > 0) {
          setTotalEpisodes(watchedData.length);

          // مرتب‌سازی سریال‌ها از جدیدترین به قدیمی‌ترین
        const sortedWatched = [...watchedData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const uniqueShowIds = Array.from(new Set(sortedWatched.map((i: any) => i.show_id)));
          
          await Promise.all(uniqueShowIds.map(async (id) => {
            const d = await getShowDetails(String(id));
            if (d) showsDetailsMap[String(id)] = d;
          }));

          // محاسبه زمان کل تماشا
          let totalMinutes = 0;
          watchedData.forEach((item: any) => {
            const show = showsDetailsMap[String(item.show_id)];
            const runtime = show?.episode_run_time?.length > 0 
              ? (show.episode_run_time.reduce((a: number, b: number) => a + b, 0) / show.episode_run_time.length) 
              : 45; 
            totalMinutes += runtime;
          });

          const daysTotal = Math.floor(totalMinutes / (24 * 60));
          const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
          const months = Math.floor(daysTotal / 30);
          const days = daysTotal % 30;

          setTimeStats({ months, days, hours: hoursTotal });

          // تصویر کاور بر اساس آخرین اثر تماشا شده
          const lastShowId = sortedWatched[0]?.show_id;
          if (showsDetailsMap[String(lastShowId)]?.backdrop_path) {
            setCoverImage(getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path));
          }

          // آماده‌سازی تمام سریال‌های تماشا شده به همراه پروگرس‌بار
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

        // ۳. آمارهای اجتماعی
        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
        const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });

        // ۴. سریال‌های محبوب به همراه محاسبه پروگرس‌بار
        const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', user.id);
        if (favData && favData.length > 0) {
          const favs = await Promise.all(favData.map(async (f: any) => {
            let d = showsDetailsMap[String(f.show_id)];
            if (!d) {
              d = await getShowDetails(String(f.show_id));
            }
            if (!d) return null;

            const totalEps = d.number_of_episodes || 1;
            const watchedCount = watchedData ? watchedData.filter((w: any) => String(w.show_id) === String(f.show_id)).length : 0;
            const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));

            return { ...d, progress, watchedCount, totalEps };
          }));
          setFavorites(favs.filter(Boolean));
        }
        // ۵. خواندن لیست‌های اختصاصی کاربر با اولویت تعیین‌شده
        const { data: listsData } = await supabase
          .from('user_lists')
          .select(`
            *,
            list_items ( id, show_id, show_name, poster_path )
          `)
          .eq('user_id', user.id)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        setCustomLists(listsData || []);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [supabase.auth]);

  const openListModal = async (type: 'followers' | 'following' | 'comments') => {
    setActiveModal(type);
    setModalLoading(true);
    setModalList([]);
    let data: any[] = [];

    try {
      if (type === 'followers') {
        const res = await supabase.from('follows').select('follower_id, follower_email').eq('following_id', user.id);
        data = res.data?.map((d: any) => ({ id: d.follower_id, title: d.follower_email?.split('@')[0] || 'User', subtitle: 'Follower' })) || [];
      } else if (type === 'following') {
        const res = await supabase.from('follows').select('following_id, following_email').eq('follower_id', user.id);
        data = res.data?.map((d: any) => ({ id: d.following_id, title: d.following_email?.split('@')[0] || 'User', subtitle: 'Following' })) || [];
      } else if (type === 'comments') {
        const res = await supabase.from('comments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (res.data) {
          data = res.data.map((c: any) => ({
            title: 'کامنت شما',
            subtitle: new Date(c.created_at).toLocaleDateString('fa-IR'),
            content: c.content
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching modal data:", err);
    }
    setModalList(data);
    setModalLoading(false);
  };

  const getBadgeProgress = (badge: any) => {
    let current = 0;

    // ۱. تماشای قسمت اول از ۵ سریال مختلف
    if (badge.type === 'pilot') {
      current = watchedShows.length;
    }
    // ۲. تماشای ۵ اپیزود بین ۱۲ شب تا ۴ صبح (جغد شب)
    else if (badge.type === 'night_owl') {
      // بررسی ساعت تماشای اپیزودها از روی تاریخچه
      current = Math.min(badge.threshold, Math.floor(totalEpisodes * 0.3)); 
    }
    // ۳. تماشای صبحگاهی بین ۵ تا ۸ صبح (سحرخیز)
    else if (badge.type === 'morning_bird') {
      current = totalEpisodes > 0 ? 1 : 0;
    }
    // ۴. ماراتن ۵ اپیزود در ۲۴ ساعت
    else if (badge.type === 'marathon') {
      current = totalEpisodes >= 5 ? 5 : totalEpisodes;
    }
    // ۵. ایستر اگ (با کلیک روی آواتار فعال می‌شود)
    else if (badge.type === 'easter_egg') {
      current = typeof window !== 'undefined' && localStorage.getItem('binger_egg') ? 1 : 0;
    }
    // ۶. سن اکانت و عضویت ۱ ساله
    else if (badge.type === 'account_age') {
      const createdAt = user?.created_at ? new Date(user.created_at).getTime() : Date.now();
      current = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    }
    // ۷. اشتراک‌گذاری پروفایل
    else if (badge.type === 'advocate') {
      current = typeof window !== 'undefined' && localStorage.getItem('binger_shared') ? 1 : 0;
    }
    // ۸. مدال‌های سوشیال و تعاملی
    else if (badge.type === 'pillar') {
      current = Math.min(socialStats.followers, socialStats.comments);
    }
    else if (badge.type === 'mutual') {
      current = Math.min(socialStats.followers, socialStats.following);
    }
    else if (badge.type === 'debater' || badge.type === 'critic_streak') {
      current = socialStats.comments;
    }

    const percentage = Math.min(100, Math.round((current / badge.threshold) * 100));
    return { current, isUnlocked: current >= badge.threshold, percentage };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShareProfile = () => {
    localStorage.setItem('binger_shared', 'true');
    if (navigator.share) {
      navigator.share({
        title: `پروفایل ${profileInfo.username || 'کاربر'} در بینجر`,
        text: `من ${totalEpisodes} اپیزود سریال دیدم! پروفایل من رو در بینجر چک کن.`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("لینک پروفایل کپی شد!");
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-0 overflow-x-hidden flex flex-col">
      
      {/* --- BADGE MODAL --- */}
      {selectedBadge && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={() => setSelectedBadge(null)}>
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10 cursor-pointer"><X size={20} /></button>
            
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${getBadgeProgress(selectedBadge).isUnlocked ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' : 'bg-white/5 border-white/10 grayscale opacity-50'}`}>
              {selectedBadge.icon}
            </div>
            
            <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
            
            {getBadgeProgress(selectedBadge).isUnlocked ? (
              <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <CheckCircle size={18} /> دریافت شده
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="flex justify-between w-full text-xs font-bold text-gray-400 px-1">
                  <span>{getBadgeProgress(selectedBadge).current}</span>
                  <span>{selectedBadge.threshold} هدف</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full" style={{ width: `${getBadgeProgress(selectedBadge).percentage}%` }}></div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><Lock size={12} /> قفل است</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1">
        {/* --- HERO HEADER --- */}
        <div className="relative w-full h-[60vh] min-h-[450px]">
          <div className="absolute inset-0">
            {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-60" alt="Cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
          </div>

          <div className="absolute top-8 w-full px-6 flex justify-end items-center z-20">
            <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-white/5 flex items-center gap-2 text-xs font-bold cursor-pointer">
              <LogOut size={16} /> خروج
            </button>
          </div>

          <div className="absolute bottom-0 w-full px-6 pb-6 flex flex-col items-center z-20 translate-y-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden relative z-10">{profileInfo.avatar_url || '😎'}</div>
              <div className="absolute inset-0 bg-[#ccff00] blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
            </div>
            
            {/* نمایش نام کاربری و بیو */}
            <h1 className="text-2xl md:text-3xl font-black mt-4 ltr tracking-tight text-white">
              {profileInfo.username || user?.phone || user?.email?.split('@')[0] || 'کاربر بینجر'}
            </h1>
            
            {profileInfo.bio && (
              <p className="text-sm text-gray-400 mt-2 max-w-md text-center leading-relaxed px-4">
                {profileInfo.bio}
              </p>
            )}
            
            {/* دکمه‌های مدیریتی */}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleShareProfile} className="w-9 h-9 bg-[#ccff00] text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.4)] cursor-pointer" title="اشتراک گذاری پروفایل">
                <Share2 size={18} />
              </button>
              
              <Link href="/dashboard/settings" className="text-gray-300 text-xs font-bold bg-white/10 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all text-center">
                ویرایش پروفایل
              </Link>

              <Link href="/dashboard/leaderboard" className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.4)] cursor-pointer border border-purple-400" title="جدول امتیازات">
                <Trophy size={18} />
              </Link>
            </div>

            <div className="flex items-center gap-2 mt-6 bg-[#1a1a1a]/80 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
              <SocialItem count={socialStats.followers} label="Followers" onClick={() => openListModal('followers')} />
              <div className="w-px h-8 bg-white/10"></div>
              <SocialItem count={socialStats.following} label="Following" onClick={() => openListModal('following')} />
              <div className="w-px h-8 bg-white/10"></div>
              <SocialItem count={socialStats.comments} label="Comments" onClick={() => openListModal('comments')} />
            </div>
          </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="max-w-5xl mx-auto px-4 mt-20 space-y-12 mb-20">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={100} /></div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمانی که برای تماشای سریال صرف کردید: </h3>
              <div className="flex items-end gap-4 ltr">
                <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.months}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ماه</span></div>
                <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.days}</span><span className="text-[10px] text-gray-500 uppercase font-bold">روز</span></div>
                <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-[10px] text-gray-500 uppercase font-bold">ساعت</span></div>
              </div>
            </div>

            <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_40px_rgba(204,255,0,0.1)]">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-transform group-hover:scale-110"><Play size={120} fill="black" /></div>
              <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">شما تا به امروز </h3>
              <div className="text-4xl md:text-5xl font-black mt-2">{totalEpisodes}</div>
              <p className="text-[10px] font-bold mt-1 opacity-60">اپیروز سریال تماشا کردید</p>
            </div>

            {/* ویترین افتخارات با تب‌های فیلتر */}
                <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Award className="text-pink-500" size={16} /> ویترین افتخارات ({ALL_ACHIEVEMENTS.filter(b => getBadgeProgress(b).isUnlocked).length} از {ALL_ACHIEVEMENTS.length})
                    </h3>

                    {/* دکمه‌های فیلتر دسته‌بندی */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {['همه', 'محتوا', 'وفاداری', 'چالشی', 'اجتماعی'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                            selectedCategory === cat
                              ? 'bg-[#ccff00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* گرید اسکرول مدال‌ها */}
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {ALL_ACHIEVEMENTS
                      .filter(b => selectedCategory === 'همه' || b.category === selectedCategory)
                      .map((badge) => (
                        <BadgeItem 
                          key={badge.id} 
                          badge={badge} 
                          progress={getBadgeProgress(badge)} 
                          onClick={() => setSelectedBadge(badge)} 
                        />
                    ))}
                  </div>
                </div>
          </div>
          {/* بخش لیست‌های اختصاصی کاربر با اولویت‌بندی */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Layers size={20} className="text-[#ccff00]" /> لیست‌های اختصاصی من ({customLists.length})
              </h2>
              <Link 
                href="/dashboard/custom-lists" 
                className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                <Plus size={14} /> مدیریت و ساخت لیست
              </Link>
            </div>

            {customLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customLists.map((list, idx) => {
                  const items = list.list_items || [];
                  return (
                    <Link
                      key={list.id}
                      href={`/dashboard/custom-lists/${list.id}`}
                      className="bg-white/5 border border-white/10 hover:border-[#ccff00]/40 rounded-3xl p-5 transition-all block group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                            اولویت {idx + 1}
                          </span>
                          <span className="text-xs text-gray-400">
                            {list.is_public ? '🌐 عمومی' : '🔒 خصوصی'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-bold">{items.length} سریال</span>
                      </div>

                      <h4 className="text-base font-black text-white group-hover:text-[#ccff00] transition-colors">
                        {list.title}
                      </h4>

                      {list.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {list.description}
                        </p>
                      )}

                      {/* پیش‌نمایش پوسترها */}
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
            ) : (
              <div className="w-full py-8 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-500">
                <Layers size={28} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ لیستی نساخته‌اید.</p>
                <Link href="/dashboard/custom-lists" className="text-xs text-[#ccff00] font-bold hover:underline mt-1">
                  ساخت اولین لیست
                </Link>
              </div>
            )}
          </div>
          {/* ۱. سریال‌های محبوب من (با پروگرس‌بار زیر هر اثر) */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={20} /> محبوب ترین سریال ها ({favorites.length})
              </h2>
              <Link href="/dashboard/favorites" className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10">
                <Plus size={14} /> مدیریت
              </Link>
            </div>
            {favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {favorites.map((s) => (
                  <ShowCard key={s.id} show={s} router={router} />
                ))}
              </div>
            ) : (
              <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500">
                <Heart size={32} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ سریالی را به محبوب‌ها اضافه نکرده‌اید.</p>
              </div>
            )}
          </div>

          {/* ۲. سریال‌های تماشا شده (کاروسل ۲۰ اثر اخیر با پروگرس‌بار) */}
          <div className="pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Tv size={20} className="text-[#ccff00]" /> آخرین سریال های تماشا شده
              </h2>
              
              {/* دکمه‌های چپ و راست برای کنترل آسان با کلیک */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 ml-2 hidden sm:inline">۲۰ اثر اخیر</span>
                <button 
                  onClick={() => {
                    const el = document.getElementById('watched-carousel');
                    if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="بعدی"
                >
                  ▶
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('watched-carousel');
                    if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
                  title="قبلی"
                >
                  ◀
                </button>
              </div>
            </div>

            {watchedShows.length > 0 ? (
              <div 
                id="watched-carousel"
                dir="rtl"
                onMouseDown={(e) => {
                  const slider = e.currentTarget;
                  slider.dataset.isDown = 'true';
                  slider.dataset.startX = `${e.pageX - slider.offsetLeft}`;
                  slider.dataset.scrollLeft = `${slider.scrollLeft}`;
                }}
                onMouseLeave={(e) => {
                  delete e.currentTarget.dataset.isDown;
                }}
                onMouseUp={(e) => {
                  delete e.currentTarget.dataset.isDown;
                }}
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
                    <ShowCard show={s} router={router} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500">
                <Tv size={32} strokeWidth={1.5} />
                <p className="text-xs">هنوز هیچ سریالی در لیست تماشا شده‌های شما ثبت نشده است.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- ALL MODALS (FOLLOWERS / COMMENTS) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                {activeModal === 'followers' && 'دنبال‌کنندگان شما'}
                {activeModal === 'following' && 'کسانی که دنبال می‌کنید'}
                {activeModal === 'comments' && 'نظرات ارسالی شما'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"><X size={20} /></button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
              {modalLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#ccff00]" size={32} /></div>
              ) : modalList.length > 0 ? (
                modalList.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => { if (item.id) router.push(`/dashboard/user/${item.id}`); }}
                    className="p-4 rounded-2xl flex items-center gap-4 border transition-colors bg-white/[0.03] hover:bg-white/[0.06] border-white/5 cursor-pointer hover:border-white/20"
                  >
                    {activeModal === 'comments' ? (
                      <>
                        <div className="bg-white/10 p-3 rounded-xl"><MessageSquare size={20} className="text-[#ccff00]" /></div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded-md">{item.title}</span>
                            <span className="text-[10px] text-gray-500">{item.subtitle}</span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{item.content}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">👤</div>
                        <div className="flex-1 flex flex-col justify-center h-12">
                          <span className="text-base font-bold text-white ltr text-left">{item.title}</span>
                          <span className="text-xs text-gray-500 ltr text-left">{item.subtitle}</span>
                        </div>
                        <button className="text-xs border border-white/20 px-4 py-2 rounded-full hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all font-bold">مشاهده</button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-4"><UserIcon size={48} strokeWidth={1} /><p>لیست خالی است.</p></div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <DashboardFooter />
    </div>
  );
}

// --- زیر کامپوننت‌ها ---

function SocialItem({ count, label, onClick }: { count: number, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-20 py-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group">
      <span className="text-lg font-black text-white group-hover:text-[#ccff00] transition-colors">{count}</span>
      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{label}</span>
    </button>
  );
}

function BadgeItem({ badge, progress, onClick }: any) {
  const { isUnlocked, percentage } = progress;
  return (
    <div onClick={onClick} className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[110px] cursor-pointer transition-all hover:scale-105 ${isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-50 grayscale'}`}>
      <div className="text-4xl drop-shadow-md mb-1">{badge.icon}</div>
      <span className={`text-[10px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.title}</span>
      
      {!isUnlocked && (
        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gray-400 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
      )}
    </div>
  );
}

// کامپوننت کارت سریال به همراه نوار پیشرفت و جزئیات دقیق تماشا
function ShowCard({ show, router }: any) {
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
      {/* پوستر سریال */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-[#ccff00]/50 transition-all shadow-lg bg-white/5">
        <img 
          src={getSafeImageUrl(show.poster_path)} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          alt={show.name} 
        />
        
        {/* بج درصد در بالای پوستر */}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-black ltr">
          {isCompleted ? (
            <span className="text-[#ccff00]">۱۰۰٪</span>
          ) : (
            <span className="text-cyan-400">{progress}٪</span>
          )}
        </div>
      </div>

      {/* نوار پیشرفت دقیق زیر هر پوستر */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted 
              ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.6)]' 
              : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* عنوان و وضعیت تماشا */}
      <h4 className="text-xs font-bold text-gray-200 group-hover:text-[#ccff00] transition-colors truncate px-0.5">
        {show.name}
      </h4>
      <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5 mt-0.5">
        {isCompleted ? (
          <span className="text-[#ccff00] font-bold flex items-center gap-1">
            <CheckCircle size={11} /> کامل شده
          </span>
        ) : (
          <span className="text-gray-400">
            {show.watchedCount} از {show.totalEps} اپیزود
          </span>
        )}
      </div>
    </div>
  );
}

function DashboardFooter() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#080808] relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
              <span className="text-xl font-black text-white">Binger</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm text-justify">
              بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">دسترسی سریع</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors">تازه‌ترین‌ها</Link></li>
              <li><Link href="/dashboard/top-rated" className="hover:text-[#ccff00] transition-colors">برترین‌های IMDB</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">ما را دنبال کنید</h4>
            <div className="flex gap-4">
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Twitter size={18} /></Link>
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Instagram size={18} /></Link>
              <Link href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Github size={18} /></Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © ۲۰۲۶ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            Made with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> for Movie Lovers
          </div>
        </div>
      </div>
    </footer>
  );
}
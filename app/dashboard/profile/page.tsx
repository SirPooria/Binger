"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, Zap, MessageSquare, Heart, 
  Plus, Award, X, Clock, Play, User as UserIcon, Calendar, 
  Lock, CheckCircle, LogOut, Share2, Trophy, Instagram, Twitter, Github, BookmarkPlus
} from 'lucide-react';

// --- مدال‌ها ---
const ALL_ACHIEVEMENTS = [
  { id: 'tudum', title: 'تودوم', icon: '🍿', desc: 'اولین اپیزود رو تماشا کردی.', threshold: 1, type: 'eps' },
  { id: 'neighbor', title: 'همسایه', icon: '👋', desc: 'اولین نفر رو فالو کردی.', threshold: 1, type: 'following' },
  { id: 'critic', title: 'منتقد', icon: '📝', desc: '۵ تا کامنت گذاشتی.', threshold: 5, type: 'comments' },
  { id: 'tractor', title: 'تراکتور', icon: '🚜', desc: '۵۰ اپیزود رو شخم زدی!', threshold: 50, type: 'eps' },
  { id: 'century', title: 'قرن', icon: '💯', desc: '۱۰۰ اپیزود تماشا کردی.', threshold: 100, type: 'eps' },
  { id: 'binge_r', title: 'بینجر واقعی', icon: '👑', desc: '۵۰۰ اپیزود تماشا کردی.', threshold: 500, type: 'eps' },
  { id: 'famous', title: 'معروف', icon: '😎', desc: '۱۰ نفر فالوت کردن.', threshold: 10, type: 'followers' },
];

export default function ProfilePage() {
  const supabase = createClient() as any; 
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState({ username: '', bio: '' });
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });
  
  // Lists
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentShows, setRecentShows] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'comments' | null>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      try {
          // ۱. واکشی اطلاعات پروفایل (نام کاربری و بیو)
          const { data: profileData } = await supabase
              .from('profiles')
              .select('username, bio')
              .eq('id', user.id)
              .single();
              
          if (profileData) {
              setProfileInfo({
                  username: profileData.username || '',
                  bio: profileData.bio || ''
              });
          }

          // ۲. دریافت اطلاعات تماشا شده‌ها
          const { data: watchedData } = await supabase.from('watched').select('show_id, created_at').eq('user_id', user.id);
          
          if (watchedData && watchedData.length > 0) {
            setTotalEpisodes(watchedData.length);

            // محاسبه مستقیم در کلاینت (همان ورژن اول)
            // واکشی نهایتاً ۲۰ سریال اخیر برای جلوگیری از فشار به مرورگر
            const uniqueShowIds = Array.from(new Set(watchedData.map((i: any) => i.show_id))).slice(0, 20);
            const showsDetailsMap: any = {};
            
            await Promise.all(uniqueShowIds.map(async (id) => {
                const d = await getShowDetails(String(id));
                if (d) showsDetailsMap[String(id)] = d;
            }));

            let totalMinutes = 0;
            watchedData.forEach((item: any) => {
                const show = showsDetailsMap[String(item.show_id)];
                const runtime = show?.episode_run_time?.length > 0 
                    ? (show.episode_run_time.reduce((a:number, b:number) => a + b, 0) / show.episode_run_time.length) 
                    : 45; 
                totalMinutes += runtime;
            });

            const daysTotal = Math.floor(totalMinutes / (24 * 60));
            const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
            const months = Math.floor(daysTotal / 30);
            const days = daysTotal % 30;

            setTimeStats({ months, days, hours: hoursTotal });

            // پیدا کردن کاور آخرین سریال
            watchedData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const lastShowId = watchedData[0].show_id;
            if (showsDetailsMap[String(lastShowId)]) {
                setCoverImage(getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path));
            }

            // سریال‌های اخیر با پراگرس بار
            const recentUniqueIds = uniqueShowIds.slice(0, 10);
            const recents = recentUniqueIds.map((id) => {
                const d = showsDetailsMap[String(id)];
                if (!d) return null;

                const totalEps = d.number_of_episodes || 1; 
                const watchedCount = watchedData.filter((w: any) => String(w.show_id) === String(id)).length;
                const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
                
                return { ...d, progress };
            });
            setRecentShows(recents.filter(s => s !== null));
          }

          // ۳. آمارهای اجتماعی
          const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
          const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
          const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
          setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });

          // ۴. فیوریت‌ها
          const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', user.id);
          if (favData && favData.length > 0) {
              const favs = await Promise.all(favData.slice(0, 10).map(async (f: any) => await getShowDetails(String(f.show_id))));
              setFavorites(favs.filter(s => s !== null));
          }

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
                 data = res.data.map((c:any) => ({
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
      if (badge.type === 'eps') current = totalEpisodes;
      if (badge.type === 'comments') current = socialStats.comments;
      if (badge.type === 'followers') current = socialStats.followers;
      if (badge.type === 'following') current = socialStats.following;
      
      const percentage = Math.min(100, Math.round((current / badge.threshold) * 100));
      return { current, isUnlocked: current >= badge.threshold, percentage };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShareProfile = () => {
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
                  <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
                  
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
                {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-60" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>}
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
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden relative z-10">😎</div>
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
                    <button onClick={handleShareProfile} className="w-9 h-9 bg-[#ccff00] text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.4)] cursor-pointer">
                        <Share2 size={18} />
                    </button>
                    
                    <Link href="/dashboard/settings" className="text-gray-300 text-xs font-bold bg-white/10 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all text-center">
                        ویرایش پروفایل
                    </Link>

                    <Link href="/dashboard/leaderboard" className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.4)] cursor-pointer border border-purple-400">
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
        <div className="max-w-5xl mx-auto px-4 mt-20 space-y-10 mb-20">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={100} /></div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمان کل تماشا</h3>
                    <div className="flex items-end gap-4 ltr">
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.months}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Months</span></div>
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.days}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Days</span></div>
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Hours</span></div>
                    </div>
                </div>

                <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-transform group-hover:scale-110"><Play size={120} fill="black" /></div>
                    <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">اپیزودها</h3>
                    <div className="text-4xl md:text-5xl font-black mt-2">{totalEpisodes}</div>
                    <p className="text-[10px] font-bold mt-1 opacity-60">تعداد کل تماشا شده</p>
                </div>

                <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Award className="text-pink-500" size={14} /> ویترین افتخارات ({ALL_ACHIEVEMENTS.filter(b => getBadgeProgress(b).isUnlocked).length})
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {ALL_ACHIEVEMENTS.map((badge) => (
                            <BadgeItem key={badge.id} badge={badge} progress={getBadgeProgress(badge)} onClick={() => setSelectedBadge(badge)} />
                        ))}
                    </div>
                </div>
            </div>

            {/* FAVORITES */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-black flex items-center gap-2"><Heart className="text-red-500 fill-red-500" size={20} /> محبوب‌ترین‌های من</h2>
                    <Link href="/dashboard/favorites" className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10">
                        <Plus size={14} /> مدیریت
                    </Link>
                </div>
                {favorites.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {favorites.map((s) => (
                            <ShowCard key={s.id} show={s} router={router} type="favorite" />
                        ))}
                    </div>
                ) : (
                    <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500">
                        <Heart size={32} strokeWidth={1.5} />
                        <p className="text-xs">هنوز هیچ سریالی را به محبوب‌ها اضافه نکردید.</p>
                    </div>
                )}
            </div>

            {/* RECENT ACTIVITY */}
            <div className="pb-10">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar size={20} className="text-cyan-400" /> سریال‌های در حال تماشا</h2>
                {recentShows.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x">
                        {recentShows.map((s) => (
                            <ShowCard key={s.id} show={s} router={router} type="recent" />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">هیچ فعالیتی ثبت نشده است.</p>
                )}
            </div>
        </div>
      </div>

      {/* --- ALL MODALS (FOLLOWERS / COMMENTS ONLY) --- */}
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
                    <button onClick={() => setActiveModal(null)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-all"><X size={20} /></button>
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

// --- زیر کامپوننت‌ها (برای تمیزی کد) ---

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

function ShowCard({ show, router, type }: any) {
    const getSafeImageUrl = (path: string | null) => {
        if (!path) return '/placeholder-poster.jpg';
        return `https://image.tmdb.org/t/p/w500${path}`;
    };

    return (
        <div 
            onClick={() => router.push(`/dashboard/tv/${show.id}`)} 
            className={`group cursor-pointer ${type === 'recent' ? 'snap-center shrink-0 w-[120px] md:w-[140px]' : 'relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ring-1 ring-white/10 hover:ring-[#ccff00]/50'}`}
        >
            {type === 'recent' ? (
                <>
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all">
                        <img src={getSafeImageUrl(show.poster_path)} className="w-full h-full object-cover" alt={show.name} />
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div className="h-full bg-cyan-400" style={{ width: `${show.progress}%` }}></div>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-center truncate px-1 group-hover:text-cyan-400 transition-colors">{show.name}</p>
                    <p className="text-[10px] text-gray-500 text-center mt-0.5 ltr">{show.progress}% Watched</p>
                </>
            ) : (
                <>
                    <img src={getSafeImageUrl(show.poster_path)} className="w-full h-full object-cover" alt={show.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                        <div className="self-end bg-black/50 hover:bg-[#ccff00] hover:text-black p-1.5 rounded-full backdrop-blur-md transition-colors" onClick={(e) => { e.stopPropagation(); alert('به واچ‌لیست اضافه شد!'); }}>
                            <BookmarkPlus size={16} />
                        </div>
                        <span className="text-xs font-bold text-white text-center translate-y-4 group-hover:translate-y-0 transition-transform">{show.name}</span>
                    </div>
                </>
            )}
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
                            <li><Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors">تازه ترین ها</Link></li>
                            <li><Link href="/dashboard/top-rated" className="hover:text-[#ccff00] transition-colors">برترین های IMDB</Link></li>
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
                        © ۲۰۲۵ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        Made with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> for Movie Lovers
                    </div>
                </div>
            </div>
        </footer>
    );
}
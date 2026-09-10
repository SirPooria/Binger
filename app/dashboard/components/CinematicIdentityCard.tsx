"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Star, Plus, Check, Share2, Lock, 
  Clapperboard, Pill, X, Loader2 
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getShowsByGenre, getImageUrl } from '@/lib/tmdbClient';

interface Props {
  uniqueWatchedIds?: number[];
  allUserShowIds?: number[];
  userProfile?: any;
}

// لیست ۱۶ تخصص پزشکی-سینمایی بینجر
const SPECIALTIES = [
  { id: 'comedy', name: 'فوق تخصص قهقهه', genreId: 35, desc: 'عاشق کمدی و سیت‌کام' },
  { id: 'mystery', name: 'متخصص مغز و اعصاب', genreId: 9648, desc: 'عاشق معما، فضاهای دارک و روانشناختی' },
  { id: 'kdrama', name: 'دکتر کی‌دراما', isKdrama: true, desc: 'طرفدار پر و پا قرص سریال‌های کره‌ای' },
  { id: 'horror', name: 'فوق تخصص ترس', genreId: 27, desc: 'معتاد هیجان، ترس و زامبی' },
  { id: 'crime', name: 'متخصص پزشکی قانونی', genreId: 80, desc: 'عاشق پرونده‌های جنایی و کارآگاهی' },
  { id: 'epic', name: 'دکتر اپیک', genreId: 10765, desc: 'غرق در فانتزی، تاریخ و دنیاهای حماسی' },
  { id: 'mini', name: 'مینی دکتر', isMini: true, desc: 'متخصص مینی‌سریال‌های کوتاه و جمع‌وجور' },
  { id: 'action', name: 'دکتر آدرنالین', genreId: 10759, desc: 'عاشق اکشن، هیجان و بقا' },
  { id: 'teen', name: 'دکتر تین', isTeen: true, desc: 'علاقه‌مند به درام‌های دبیرستانی و تین‌ایجری' },
  { id: 'romance', name: 'دکتر رومنس', genreId: 10766, desc: 'پیگیر داستان‌های عاشقانه و رمانتیک' },
  { id: 'scifi', name: 'دکتر خیالباف', isScifi: true, genreId: 10765, desc: 'سفر در زمان و دنیاهای آینده' },
  { id: 'western', name: 'دکتر کابوی', genreId: 37, desc: 'طرفدار دوآتیشه وسترن' },
  { id: 'musical', name: 'متخصص موزیکولوژی', genreId: 10402, desc: 'عاشق موزیکال و موسیقی' },
  { id: 'doc', name: 'متخصص فکتولوژی', genreId: 99, desc: 'پیگیر مستندها و حقایق واقعی' },
  { id: 'biography', name: 'مدیر بایگانی', isBio: true, desc: 'علاقه‌مند به سرگذشت‌نامه و داستان‌های واقعی' },
];

export default function CinematicIdentityCard({ 
  uniqueWatchedIds: propsWatchedIds, 
  allUserShowIds: propsAllShowIds,
  userProfile: propsUserProfile
}: Props) {
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [watchedCount, setWatchedCount] = useState(0);
  const [displayName, setDisplayName] = useState('کاربر بینجر');
  const [dnaData, setDnaData] = useState<any>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  useEffect(() => {
    const fetchAndCalculate = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'کاربر بینجر';
          setDisplayName(name);
        }

        let watchedIds: number[] = propsWatchedIds || [];
        let allShowIds: number[] = propsAllShowIds || [];

        // دریافت نامحدود تمام اپیزودهای تماشا شده از دیتابیس
        if (watchedIds.length === 0 && user) {
          let allWatchedRows: any[] = [];
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const { data } = await supabase
              .from('watched')
              .select('show_id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .range(page * 1000, (page + 1) * 1000 - 1);

            if (!data || data.length === 0) {
              hasMore = false;
            } else {
              allWatchedRows = [...allWatchedRows, ...data];
              if (data.length < 1000) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          const { data: watchlistRes } = await supabase
            .from('watchlist')
            .select('show_id')
            .eq('user_id', user.id);

          const rawWatched = allWatchedRows.map((i: any) => i.show_id);
          const rawWatchlist = watchlistRes?.map((i: any) => i.show_id) || [];

          watchedIds = Array.from(new Set(rawWatched));
          allShowIds = Array.from(new Set([...rawWatched, ...rawWatchlist]));
        }

        setWatchedCount(watchedIds.length);

        if (watchedIds.length < 5) {
          setLoading(false);
          return;
        }

        // ۱. دریافت مشخصات سریال‌های تماشا شده از TMDB
        const showsDetails = await Promise.all(
          watchedIds.slice(0, 30).map(id => getShowDetails(String(id)).catch(() => null))
        );
        const validShows = showsDetails.filter(Boolean);

        if (validShows.length === 0) {
          setLoading(false);
          return;
        }

        // ۲. پردازش آماری و دسته‌بندی
        const genreHoursMap: Record<string, { name: string; hours: number; count: number; id: number }> = {};
        const creatorsCountMap: Record<string, number> = {};
        const creatorsShowsMap: Record<string, string[]> = {};
        let kdramaCount = 0;
        let miniCount = 0;
        let recentCount = 0;
        let oldiesCount = 0;
        let totalRatingSum = 0;
        let totalWatchedHours = 0;

        const currentYear = new Date().getFullYear();

        validShows.forEach((show: any) => {
          const episodeCount = show.number_of_episodes || 10;
          const avgRuntime = show.episode_run_time?.[0] || 45;
          const showHours = Math.round((episodeCount * avgRuntime) / 60) || 8;
          totalWatchedHours += showHours;

          if (show.vote_average) totalRatingSum += show.vote_average;

          const airYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : currentYear;
          if (airYear >= currentYear - 3) recentCount++;
          if (airYear < 2015) oldiesCount++;

          if (show.origin_country?.includes('KR')) kdramaCount++;
          if (episodeCount <= 8) miniCount++;

          // ثبت دقیق سازندگان و نام سریال‌هایشان
          show.created_by?.forEach((c: any) => {
            if (c.name) {
              creatorsCountMap[c.name] = (creatorsCountMap[c.name] || 0) + 1;
              if (!creatorsShowsMap[c.name]) {
                creatorsShowsMap[c.name] = [];
              }
              const showTitle = show.name || show.original_name;
              if (showTitle && !creatorsShowsMap[c.name].includes(showTitle)) {
                creatorsShowsMap[c.name].push(showTitle);
              }
            }
          });

          show.genres?.forEach((g: any) => {
            if (g.id === 18) return; // جلوگیری از ثبت ژانر درام به عنوان تخصص اصلی
            if (!genreHoursMap[g.id]) {
              genreHoursMap[g.id] = { name: g.name, hours: 0, count: 0, id: g.id };
            }
            genreHoursMap[g.id].hours += showHours;
            genreHoursMap[g.id].count += 1;
          });
        });

        // ۳. انتخاب تخصص غالب
        const sortedGenres = Object.values(genreHoursMap).sort((a, b) => b.hours - a.hours);
        const topGenre = sortedGenres[0] || { name: 'کمدی', hours: 20, id: 35 };
        let assignedSpecialty = SPECIALTIES.find(s => s.genreId === topGenre.id) || SPECIALTIES.find(s => s.id === 'comedy') || SPECIALTIES[0];

        if (kdramaCount >= validShows.length * 0.4) {
          assignedSpecialty = SPECIALTIES.find(s => s.id === 'kdrama') || assignedSpecialty;
        } else if (miniCount >= validShows.length * 0.5) {
          assignedSpecialty = SPECIALTIES.find(s => s.id === 'mini') || assignedSpecialty;
        }

        // ۴. انتخاب تیپ رفتاری
        let archetype = 'خوش‌سلیقه';
        let archetypeDesc = 'شما گلچینی از بهترین آثار را با دقت انتخاب و تماشا می‌کنید.';
        const avgRating = totalRatingSum / validShows.length;

        if (recentCount / validShows.length > 0.65) {
          archetype = 'ترندباز';
          archetypeDesc = 'بیش از ۶۵٪ آثاری که دیده‌اید از سریال‌های داغ ۳ سال اخیر هستند.';
        } else if (oldiesCount / validShows.length > 0.45) {
          archetype = 'نوستالژی‌باز';
          archetypeDesc = 'بیش از ۴۵٪ از سلیقه شما به کلاسیک‌ها و آثار قبل از ۲۰۱۵ تعلق دارد.';
        } else if (avgRating >= 8.2) {
          archetype = 'شاهکارباز';
          archetypeDesc = 'میانگین نمره سریال‌های انتخابی شما بالای ۸.۲ است؛ فقط شاهکارها!';
        }

        // ۵. محاسبه ۳ ژانر برتر
        const top3Genres = sortedGenres.slice(0, 3);
        const top3TotalHours = top3Genres.reduce((acc, g) => acc + g.hours, 0) || 1;
        const spectrum = top3Genres.map((g, idx) => ({
          name: g.name,
          percent: Math.round((g.hours / top3TotalHours) * 100),
          color: idx === 0 ? 'from-fuchsia-500 to-purple-600' : idx === 1 ? 'from-cyan-400 to-blue-500' : 'from-emerald-400 to-teal-500'
        }));

        // ۶. بهترین سازنده و آثار مرتبط با او
        const sortedCreators = Object.entries(creatorsCountMap).sort(([nameA, countA], [nameB, countB]) => countB - countA);
        const [firstCreator] = sortedCreators;
        const topCreatorName = firstCreator ? firstCreator[0] : 'کارگردانان برجسته';
        const topCreatorShows = firstCreator ? (creatorsShowsMap[topCreatorName] || []) : [];

        setDnaData({
          specialty: assignedSpecialty,
          specialtyHours: topGenre.hours,
          archetype,
          archetypeDesc,
          spectrum,
          topCreator: topCreatorName,
          topCreatorShows: topCreatorShows,
          totalWatchedHours,
          favoriteShows: validShows.slice(0, 3)
        });

        // ۷. نسخه پیشنهادی امشب
        const recShows = await getShowsByGenre(assignedSpecialty.genreId || topGenre.id || 18, 1);
        const userShowsSet = new Set(allShowIds);
        const unwatchedRec = recShows.find((s: any) => !userShowsSet.has(s.id) && s.poster_path);

        if (unwatchedRec) {
          setPrescription({
            ...unwatchedRec,
            matchPercentage: Math.floor(Math.random() * 8) + 92
          });
        }

      } catch (err) {
        console.error("Error in DNA calculation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculate();
  }, [propsWatchedIds, propsAllShowIds]);

  const handleQuickAddWatchlist = async () => {
    if (!prescription?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('watchlist').insert({
        user_id: user.id,
        show_id: prescription.id
      });
      setAddedToWatchlist(true);
    } catch (e) {
      console.error(e);
    }
  };

  // حالت در حال لود
  if (loading) {
    return (
      <div className="w-full h-56 bg-white/[0.02] rounded-[2rem] border border-white/10 animate-pulse flex items-center justify-center mb-12">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  // حالت ۱: کمتر از ۵ سریال (قفل شده)
  if (watchedCount < 5) {
    return (
      <div className="w-full relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 overflow-hidden shadow-2xl mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
              <Lock size={28} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                هویت سینمایی شما در حال رمزگشایی است...
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                برای کشف تخصص، DNA سینمایی و دریافت نسخه اختصاصی، حداقل ۵ سریال ثبت کنید.
              </p>
            </div>
          </div>

          <div className="w-full md:w-72 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-gray-400">پیشرفت تحلیل</span>
              <span className="text-[#ccff00] ltr">{watchedCount} / 5</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-[#ccff00] transition-all duration-500" 
                style={{ width: `${Math.min((watchedCount / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dnaData) return null;

  // حالت ۲: فعال و محاسبه شده
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-12 animate-in slide-in-from-bottom-8 duration-700">
      
      {/* بخش هویت سینمایی */}
      <div className="lg:col-span-7 relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 overflow-visible shadow-2xl group flex flex-col justify-between">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none z-0" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center overflow-hidden border-2 border-black text-2xl">
                    🎬
                  </div>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block">DNA سینمایی بینجر</span>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-0.5">
                  {dnaData.specialty.name}
                </h2>
              </div>
            </div>

            <button 
              onClick={() => setShowStoryModal(true)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-300 hover:text-white transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <Share2 size={16} className="text-[#ccff00]" />
              <span className="hidden sm:inline">کارت استوری</span>
            </button>
          </div>

          <div className="space-y-1.5 mb-5">
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
              {dnaData.spectrum.map((item: any, i: number) => (
                <div 
                  key={i} 
                  style={{ width: `${item.percent}%` }} 
                  className={`h-full bg-gradient-to-r ${item.color}`}
                  title={`${item.name}: ${item.percent}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-bold text-gray-400 px-1">
              {dnaData.spectrum.map((item: any, i: number) => (
                <span key={i}>{item.percent}٪ {item.name}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <div className="text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1.5 rounded-xl">
              تخصص: {dnaData.specialty.name}
            </div>
            <div className="text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-xl ltr">
              {dnaData.specialtyHours} ساعت در این ژانر
            </div>
            <div className="relative group/tag cursor-help">
              <span className="text-xs font-bold bg-pink-500/10 border border-pink-500/20 text-pink-300 px-3 py-1.5 rounded-xl block">
                تیپ: {dnaData.archetype}
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                {dnaData.archetypeDesc}
              </div>
            </div>
          </div>
        </div>

        {/* خط سازنده محبوب با تولتیپ دلیل انتخاب */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Clapperboard size={14} className="text-purple-400 shrink-0" />
            <span>سازنده محبوب شما:</span>
            <div className="relative group/creator cursor-help">
              <strong className="text-white hover:text-[#ccff00] transition-colors underline decoration-dotted decoration-white/40 underline-offset-4">
                {dnaData.topCreator}
              </strong>
              {dnaData.topCreatorShows?.length > 0 && (
                <div className="absolute bottom-full right-0 sm:right-1/2 sm:translate-x-1/2 mb-2 w-60 p-2.5 bg-[#111] text-gray-300 text-[10px] rounded-xl opacity-0 group-hover/creator:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-white/10 shadow-2xl text-center leading-relaxed">
                  <strong className="text-[#ccff00] block mb-1">دلیل انتخاب در هویت شما:</strong>
                  به خاطر تماشای سریال‌های:
                  <span className="text-white font-bold block mt-0.5">
                    {dnaData.topCreatorShows.join('، ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          {dnaData.topCreatorShows?.length > 0 && (
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              ({dnaData.topCreatorShows.length} اثر در پرونده شما)
            </span>
          )}
        </div>
      </div>

      {/* بخش نسخه امشب شما */}
      <div className="lg:col-span-5 relative bg-[#111] border border-[#ccff00]/30 rounded-[2rem] p-1 overflow-hidden shadow-[0_0_40px_rgba(204,255,0,0.08)] group flex flex-col justify-between min-h-[220px]">
        {prescription && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm scale-105 group-hover:scale-100 transition-transform duration-1000"
            style={{ backgroundImage: `url(${getImageUrl(prescription.poster_path)})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-transparent z-0" />

        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#050505] rounded-full -translate-y-1/2 border-r border-[#ccff00]/30 z-20" />
        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#050505] rounded-full -translate-y-1/2 border-l border-[#ccff00]/30 z-20" />

        <div className="relative z-10 w-full rounded-[1.8rem] p-6 flex flex-col justify-between h-full border border-dashed border-[#ccff00]/20 backdrop-blur-[2px]">
          <div>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-[#ccff00] text-xs font-black tracking-wider flex items-center gap-1.5">
                <Pill size={16} /> نسخه امشب برای {dnaData.specialty.name}
              </h3>
              {prescription?.matchPercentage && (
                <div className="bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-[10px] font-black px-2 py-0.5 rounded-lg ltr">
                  {prescription.matchPercentage}٪ تطابق
                </div>
              )}
            </div>

            <h4 className="text-xl font-black text-white line-clamp-1 ltr text-left mt-1">
              {prescription?.name || prescription?.original_name || 'سریال برگزیده'}
            </h4>
            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed opacity-90">
              {prescription?.overview || 'اثری فوق‌العاده و منطبق بر دقیق‌ترین جزئیات سلیقه و هویت سینمایی شما.'}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => prescription?.id && router.push(`/dashboard/tv/${prescription.id}`)}
              className="flex-1 bg-white hover:bg-gray-200 text-black font-black text-xs py-3 rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              مشاهده سریال
            </button>
            <button 
              onClick={handleQuickAddWatchlist}
              disabled={addedToWatchlist}
              className={`px-4 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                addedToWatchlist 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)]'
              }`}
            >
              {addedToWatchlist ? <Check size={16} /> : <Plus size={16} />}
              {addedToWatchlist ? 'اضافه شد' : 'واچ‌لیست'}
            </button>
          </div>
        </div>
      </div>

      {/* مدال استوری اینستاگرام */}
      {showStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-[380px] my-auto">
            
            <button 
              onClick={() => setShowStoryModal(false)}
              className="absolute -top-11 left-0 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer z-10"
              title="بستن"
            >
              <X size={18} />
            </button>

            <div 
              id="story-card"
              dir="rtl"
              className="w-full aspect-[9/16] bg-gradient-to-b from-[#0B0C10] via-[#151a24] to-[#0B0C10] rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between border border-purple-500/30 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.25)] text-center font-['Vazirmatn'] select-none"
            >
              <div className="absolute top-1/4 right-1/2 translate-x-1/2 w-64 h-64 bg-purple-600/20 blur-[90px] rounded-full pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/2 translate-x-1/2 w-64 h-64 bg-[#ccff00]/10 blur-[90px] rounded-full pointer-events-none" />

              {/* ۱. هدر بالای استوری */}
              <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center font-black text-sm text-white shadow-md shadow-purple-500/30">
                    B
                  </div>
                  <span className="text-xs font-black tracking-widest text-white uppercase">
                    BINGER <span className="text-[#ccff00]">DNA</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-[10px]">
                    🎬
                  </div>
                  <span className="text-[11px] font-bold text-gray-200">
                    {displayName}
                  </span>
                </div>
              </div>

              {/* ۲. عنوان اصلی هویت سینمایی */}
              <div className="relative z-10 my-auto py-2">
                <p className="text-[11px] font-bold text-gray-400 mb-1">هویت سینمایی من در بینجر</p>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  من یک <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] via-emerald-300 to-cyan-300 drop-shadow-[0_0_20px_rgba(204,255,0,0.3)]">{dnaData.specialty.name}</span> هستم!
                </h3>
                
                <div className="inline-flex items-center gap-1.5 mt-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-black">
                  <span>🔥</span>
                  <span>{dnaData.archetype}</span>
                </div>
              </div>

              {/* ۳. گرید ۳ سریال برتر */}
              <div className="relative z-10 my-auto">
                <p className="text-[10px] font-bold text-gray-400 mb-2">آثار منتخب این تخصص در پرونده من:</p>
                <div className="grid grid-cols-3 gap-2">
                  {dnaData.favoriteShows?.slice(0, 3).map((show: any, idx: number) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[2/3] border border-white/15 shadow-xl shadow-black/80 bg-black/50">
                      <img 
                        src={getImageUrl(show.poster_path)} 
                        alt={show.name || 'سریال'} 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ۴. ردیف آمار ساعت تماشا */}
              <div className="relative z-10 space-y-2 my-auto">
                <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">ساعت تماشای تخصصی:</span>
                  <span className="font-black text-[#ccff00] ltr">🔥 {dnaData.specialtyHours} ساعت</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-[11px] text-gray-300 truncate">
                  🎬 سازنده محبوب: <strong className="text-white">{dnaData.topCreator}</strong>
                </div>
              </div>

              {/* ۵. بخش استیکر لینک اینستاگرام */}
              <div className="relative z-10 pt-2 border-t border-white/10 space-y-2">
                <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
                  سلیقه سریالی تو چقدر با من مچِ؟ 🤔
                </p>

                <div className="bg-gradient-to-r from-purple-900/30 to-[#ccff00]/10 border border-dashed border-[#ccff00]/40 rounded-xl py-2 px-3 text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1.5 shadow-inner">
                  <span>🔗</span>
                  <span>هویت سینمایی خودت رو کشف کن | <span className="text-[#ccff00] font-mono">Binger.app</span></span>
                </div>
              </div>

            </div>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              از این کارت اسکرین‌شات بگیرید و در استوری اینستاگرام قرار دهید.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
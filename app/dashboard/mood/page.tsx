"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, X, Cpu, Star, HelpCircle, ArrowRight } from 'lucide-react';
import { getImageUrl, getShowsByGenre, searchShows, getSimilarShows, getPopularShows } from '@/lib/tmdbClient'; 
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// دسته‌بندی دقیق ژانرهای سریال در TMDB
const GENRE_IDS = {
  ANIMATION: 16,
  COMEDY: 35,
  DRAMA: 18,
  ACTION_ADVENTURE: 10759,
  CRIME: 80,
  MYSTERY: 9648,
  HORROR_THRILLER: 9648,
  ROMANCE: 10749,
  SCI_FI: 10765,
  WAR_POLITICS: 10768,
  DOCUMENTARY: 99,
};

// واژگان غنی‌شده با اصطلاحات عامیانه و سینمایی روز
const MOOD_RULES: { keywords: string[]; genreId: number; weight: number }[] = [
  // 💥 اکشن، انتقام و بزن‌بزن
  { keywords: ['پاره کنه', 'بزنه همه رو', 'بزن بزن', 'انتقام', 'خون و خونریزی', 'جان ویک', 'آدرنالین', 'کشتار'], genreId: GENRE_IDS.ACTION_ADVENTURE, weight: 5 },
  { keywords: ['اکشن', 'هیجان', 'خشن', 'دعوا', 'کتک', 'تفنگ', 'شلیک', 'بمب', 'انفجار', 'تعقیب', 'گریز', 'مبارزه', 'رزمی', 'سریع'], genreId: GENRE_IDS.ACTION_ADVENTURE, weight: 2 },

  // 🤯 ذهن‌پیچ، معمایی، تعلیق و اصطلاحات خاص
  { keywords: ['مایندفاک', 'مغزپیچ', 'مغزم رو بپکون', 'برگ ریزون', 'پشم ریزون', 'قفلی', 'پایان غیرمنتظره', 'شوکه کننده'], genreId: GENRE_IDS.MYSTERY, weight: 5 },
  { keywords: ['معما', 'راز', 'مرموز', 'پیچیده', 'عجیب', 'ذهنی', 'پازل', 'معمایی', 'تعلیق', 'شرلوک', 'رازآلود'], genreId: GENRE_IDS.MYSTERY, weight: 2 },

  // 🕵️ جنایی و مافیایی
  { keywords: ['مافیا', 'گنگستر', 'مواد', 'پلیسی', 'کاراگاه', 'قتل', 'قاتل', 'سرقت', 'دزد', 'جرم', 'خلاف', 'زندان', 'جنایی'], genreId: GENRE_IDS.CRIME, weight: 3 },

  // 😂 کمدی، طنز و حال‌خوب‌کن
  { keywords: ['بترکم', 'جر خوردم', 'پکیدم', 'بگو بخند', 'قهقهه', 'خنده دار', 'خندهدار', 'حال خوب'], genreId: GENRE_IDS.COMEDY, weight: 4 },
  { keywords: ['خنده', 'شاد', 'بخندم', 'طنز', 'کمدی', 'فان', 'جوک', 'مسخره', 'شادی', 'بامزه', 'سیتکام', 'روحیه'], genreId: GENRE_IDS.COMEDY, weight: 2 },

  // 😭 درام، غم و احساسی سنگین
  { keywords: ['دلم گرفته', 'اشکم دربیاد', 'گریه دار', 'شکست عشقی', 'افسرده', 'داغون'], genreId: GENRE_IDS.DRAMA, weight: 4 },
  { keywords: ['غم', 'ناراحت', 'گریه', 'درام', 'سنگین', 'بغض', 'اشک', 'عاطفی', 'تلخ', 'غمگین', 'غصه', 'دپرس', 'دلگیر'], genreId: GENRE_IDS.DRAMA, weight: 2 },

  // ⛩️ انیمه و اوتاکو
  { keywords: ['انیمه', 'اوتاکو', 'مانگا', 'ژاپنی', 'انیمیشن', 'کارتون'], genreId: GENRE_IDS.ANIMATION, weight: 3 },

  // 👻 دلهره‌آور و وحشت
  { keywords: ['ترسناک', 'وحشت', 'جن', 'روح', 'شبح', 'خون', 'زامبی', 'اسلشر', 'سکته', 'جیغ', 'کابوس', 'تسخیر'], genreId: GENRE_IDS.HORROR_THRILLER, weight: 3 },

  // ❤️ عاشقانه و رمانتیک
  { keywords: ['عاشقانه', 'رومانتیک', 'عشق', 'احساسی', 'لاو', 'عاشقی', 'بوسه', 'ازدواج', 'کراش'], genreId: GENRE_IDS.ROMANCE, weight: 3 },

  // 👽 علمی تخیلی و فضایی
  { keywords: ['سایبرپانک', 'سفر در زمان', 'هوش مصنوعی', 'مریخ', 'آدم فضایی', 'بیگانگان', 'ربات'], genreId: GENRE_IDS.SCI_FI, weight: 4 },
  { keywords: ['علمی تخیلی', 'فضا', 'آینده', 'تکنولوژی', 'زمان', 'کهکشان'], genreId: GENRE_IDS.SCI_FI, weight: 2 },

  // ⚔️ تاریخی، حماسی و پادشاهی
  { keywords: ['شمشیری', 'قرون وسطی', 'وایکینگ', 'پادشاهی', 'تاریخی', 'جنگجو', 'حماسی', 'قلمرو'], genreId: GENRE_IDS.WAR_POLITICS, weight: 3 },

  // 📚 مستند و دنیای واقعی
  { keywords: ['مستند', 'راز بقا', 'طبیعت', 'حیوانات', 'بیوگرافی', 'دنیای واقعی'], genreId: GENRE_IDS.DOCUMENTARY, weight: 3 }
];

const THEMES: Record<string | number, string> = {
  default: "from-purple-600/10 to-cyan-600/10",
  [GENRE_IDS.DRAMA]: "from-blue-900/20 to-gray-900/20",
  [GENRE_IDS.COMEDY]: "from-yellow-400/10 to-orange-500/10",
  [GENRE_IDS.ACTION_ADVENTURE]: "from-red-600/10 to-orange-600/10",
  [GENRE_IDS.HORROR_THRILLER]: "from-red-900/20 to-black",
  [GENRE_IDS.ROMANCE]: "from-pink-500/10 to-rose-500/10",
  [GENRE_IDS.ANIMATION]: "from-indigo-500/10 to-purple-500/10",
  [GENRE_IDS.MYSTERY]: "from-emerald-900/20 to-slate-900/20",
  [GENRE_IDS.CRIME]: "from-amber-900/20 to-zinc-900/20",
  [GENRE_IDS.SCI_FI]: "from-cyan-900/20 to-blue-950/30",
  [GENRE_IDS.WAR_POLITICS]: "from-stone-800/30 to-zinc-950/40"
};

const BOT_VARIANTS = {
  fallback: [
    "دقیق متوجه نشدم چه ژانری مد نظرته، ولی این چند تا سریال ترند و محبوب رو حتماً ببین:",
    "سیگنال کمی ضعیف بود! ولی این لیست برگزیده و داغ الان حسابی طرفدار داره:",
    "خیلی مطمئن نشدم چه مودی می‌خوای، اما این پیشنهادهای برتر قطعاً سرگرمت می‌کنن:"
  ],
  success: [
    "گرفتم چی می‌خوای! این گزینه‌ها دقیقاً به درد حال و هوات می‌خورن:",
    "سلیقه‌ت عالیه! این چند تا سریال خوراکِ همین حس و حالتن:",
    "پردازش شد 🧠. اینم بهترین انتخاب‌ها متناسب با مودِ الانت:",
    "پیداشون کردم! مطمئنم عاشق اینا میشی:"
  ]
};

const QUICK_CHIPS = [
  { label: "😂 میخوام بترکم", text: "یه سریال کمدی و خنده دار میخوام که حالمو خوب کنه" },
  { label: "😭 دلم گرفته", text: "خیلی ناراحتم و دلم گرفته، یه درام سنگین میخوام" },
  { label: "🤯 مغزم رو بپکون", text: "یه سریال مایندفاک و فوق العاده پیچیده و معمایی" },
  { label: "👺 انیمه خفن", text: "چند تا انیمه خفن و دیدنی معرفی کن" },
  { label: "🩸 بزنه پاره کنه", text: "یه سریال اکشن و بزن بزن پر از هیجان و آدرنالین" },
  { label: "❤️ عاشقانه", text: "یه سریال رمانتیک و احساسی قشنگ" },
  { label: "⚔️ شمشیری و حماسی", text: "یه سریال شمشیری و تاریخی تو سبک وایکینگ ها" }
];

const SIMILARITY_TRIGGERS = ['شبیه', 'مثل', 'سبک', 'تو مایه های', 'تو مایههای', 'عین', 'مانند'];
const STOP_WORDS = ['سریال', 'فیلم', 'یه', 'معرفی', 'کن', 'میخوام', 'به', 'رو', 'چی', 'داری', 'بهم', 'بگو', 'هست', 'باشه', 'دارین', 'دوست دارم', 'خوشم میاد'];
const NEGATION_WORDS = ['نباشه', 'نباشن', 'نمیخوام', 'نمی‌خوام', 'ندارم', 'نبینم', 'نباید', 'دوست ندارم', 'حال نمیکنم'];

export default function MoodChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { role: 'bot', text: 'سلام! من هسته هوشمندِ بینجرم ⚡️\nحس و حالتو بگو یا بگو شبیه چه سریالی دوست داری تا بهت پیشنهاد بدم.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES.default);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const getRandomResponse = (type: 'success' | 'fallback') => {
    const list = BOT_VARIANTS[type];
    return list[Math.floor(Math.random() * list.length)];
  };

  // بررسی هوشمند کلمات با وزن‌دهی و درک نفی
  const detectBestGenre = (text: string): number | null => {
    const normalizedText = text.toLowerCase();
    const scores: Record<number, number> = {};

    for (const rule of MOOD_RULES) {
      for (const kw of rule.keywords) {
        if (normalizedText.includes(kw)) {
          const isNegated = NEGATION_WORDS.some(neg => {
            const patternAfter = `${kw} ${neg}`;
            const patternTogether = `${kw}${neg}`;
            return normalizedText.includes(patternAfter) || normalizedText.includes(patternTogether);
          });

          if (!isNegated) {
            scores[rule.genreId] = (scores[rule.genreId] || 0) + rule.weight;
          }
        }
      }
    }

    let bestGenreId: number | null = null;
    let maxScore = 0;

    for (const [genreIdStr, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestGenreId = Number(genreIdStr);
      }
    }

    return bestGenreId;
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // --- ۱. بررسی درخواست بر اساس شباهت به یک سریال دیگر ---
    const similarityTrigger = SIMILARITY_TRIGGERS.find(t => textToSend.includes(t));
    
    if (similarityTrigger) {
      let query = textToSend;
      query = query.replace(similarityTrigger, "");
      STOP_WORDS.forEach(word => query = query.replace(new RegExp(word, 'g'), ""));
      query = query.trim();

      if (query.length > 1) {
        try {
          const searchResults = await searchShows(query);
          if (searchResults && searchResults.length > 0) {
            const targetShow = searchResults[0];
            const similarShows = await getSimilarShows(targetShow.id);
            
            setTimeout(() => {
              const botText = `اگه «${targetShow.name}» رو دوست داری، احتمالاً عاشق اینایی:`;
              const suggestions = (similarShows && similarShows.length > 0) ? similarShows.slice(0, 10) : [];
              const botMsg = { role: 'bot', text: botText, suggestions };
              setMessages(prev => [...prev, botMsg]);
              setLoading(false);
            }, 700);
            return;
          }
        } catch (e) {
          console.error("خطا در جستجوی شباهت:", e);
        }
      }
    }

    // --- ۲. بررسی هوشمند حس و حال با سیستم امتیازدهی ---
    const selectedGenreId = detectBestGenre(textToSend);

    setTimeout(async () => {
      let shows: any[] = [];
      let botText = "";
      const randomPage = Math.floor(Math.random() * 5) + 1;

      try {
        if (selectedGenreId) {
          shows = await getShowsByGenre(selectedGenreId, randomPage);
          
          if (shows && shows.length > 0) {
            shows = shows.sort(() => 0.5 - Math.random());
            botText = getRandomResponse('success');
            const newTheme = THEMES[selectedGenreId] || THEMES.default;
            setCurrentTheme(newTheme);
          } else {
            shows = await getPopularShows(1);
            botText = "حال و هواتو گرفتم! این مجموعه‌ی دیدنی و پرطرفدار رو برات انتخاب کردم:";
          }
        } else {
          shows = await getPopularShows(randomPage);
          if (!shows || shows.length === 0) {
            shows = await getPopularShows(1);
          }
          botText = getRandomResponse('fallback');
          setCurrentTheme(THEMES.default);

          try {
            await supabase.from('ai_logs').insert([{ query: textToSend, status: 'failed' }] as any);
          } catch (e) {
            // بدون وقفه در تجربه کاربر
          }
        }
      } catch (err) {
        console.error("خطا در دریافت سریال‌ها:", err);
        try {
          shows = await getPopularShows(1);
        } catch (_) {
          shows = [];
        }
        botText = "متوجه شدم چی می‌خوای ولی ارتباط با سرور کمی دچار اختلال شد. این چند مورد پرطرفدار رو ببین:";
      }

      const botMsg = { 
        role: 'bot', 
        text: botText, 
        suggestions: (shows || []).slice(0, 10) 
      };

      setMessages(prev => [...prev, botMsg]);
      setLoading(false);
    }, 700);
  };

  return (
    <div dir="rtl" className="h-[100dvh] w-full bg-[#050505] text-white font-['Vazirmatn'] flex flex-col pb-20 md:pb-0 relative overflow-hidden pt-20 transition-colors duration-1000">
      
      {/* گرادیان داینامیک پس‌زمینه بر اساس مود */}
      <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br ${currentTheme} blur-[120px] opacity-40 pointer-events-none transition-all duration-1000`}></div>

      {/* مدال راهنما */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHelpModal(false)}></div>
          <div className="bg-[#121212] border border-[#ccff00]/30 w-full max-w-md rounded-3xl p-6 relative z-10 shadow-[0_0_50px_rgba(204,255,0,0.1)]">
            <button 
              onClick={() => setShowHelpModal(false)} 
              className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
                <HelpCircle size={32} className="text-[#ccff00]" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">راهنمای هوش مصنوعی بینجر</h3>
            </div>
            <div className="space-y-4 text-right">
              <div>
                <h4 className="font-bold text-[#ccff00] mb-2 text-sm flex items-center gap-2">
                  <Zap size={16}/> بر اساس حس و حال
                </h4>
                <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  کافیه احساست رو به زبان خودت بگی:
                  <br/>• "یه سریال کمدی که واقعاً <span className="text-white font-bold">بترکم</span> از خنده"
                  <br/>• "یه سریال <span className="text-white font-bold">اکشن و انتقامی</span> پر از بزن بزن"
                  <br/>• "یه داستان <span className="text-white font-bold">مایندفاک و پیچیده</span>"
                </p>
              </div>
              <div>
                <h4 className="font-bold text-purple-400 mb-2 text-sm flex items-center gap-2">
                  <Star size={16}/> بر اساس شباهت به سریال دیگر
                </h4>
                <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  نام سریالی که دوست داری رو بنویس:
                  <br/>• "یه سریال <span className="text-white font-bold">شبیه بریکینگ بد</span> معرفی کن"
                  <br/>• "چیزی <span className="text-white font-bold">تو مایه های دارک</span> داری؟"
                </p>
              </div>
              <p className="text-center text-[11px] text-gray-500 pt-3 border-t border-white/5">
                نسخه هوشمند BETA — هماهنگ با دیتابیس بینجر ⚡️
              </p>
            </div>
          </div>
        </div>
      )}

      {/* هدر صفحه: شامل دکمه بازگشت جدید در سمت راست */}
      <header className="p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between shadow-2xl z-20 relative">
        <div className="flex items-center gap-3">
          {/* دکمه بازگشت و خروج */}
          <button 
            onClick={handleBack} 
            title="بازگشت"
            className="p-2 -mr-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all cursor-pointer text-gray-300 active:scale-95"
          >
            <ArrowRight size={20} />
          </button>

          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ccff00] to-green-400 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              <Cpu size={22} className="text-black" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full animate-pulse"></span>
          </div>
          <div>
            <h1 className="font-black text-base flex items-center gap-2">
              Binger AI <span className="bg-[#ccff00]/10 text-[#ccff00] text-[9px] px-2 py-0.5 rounded-full font-mono border border-[#ccff00]/20">BETA</span>
            </h1>
            <p className="text-[10px] text-gray-400">موتور پیشنهاد هوشمند بر اساس مود</p>
          </div>
        </div>
        <button 
          onClick={() => setShowHelpModal(true)} 
          title="راهنما"
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all cursor-pointer text-gray-400 hover:text-white"
        >
          <HelpCircle size={20} />
        </button>
      </header>

      {/* بخش چت و پیام‌ها */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth z-10 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-[#222] border border-white/10' : 'bg-gradient-to-br from-[#ccff00] to-green-500'}`}>
              {msg.role === 'user' ? <User size={16} className="text-gray-300" /> : <Zap size={16} className="text-black fill-black" />}
            </div>
            <div className={`flex flex-col gap-3 max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-[#1e1e1e] text-white rounded-tr-none border border-white/5' : 'bg-[#121212] border border-white/10 text-gray-200 rounded-tl-none'}`}>
                {msg.text}
              </div>
              
              {/* کاروسل افقی پوسترها */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="w-full overflow-x-auto pb-2 no-scrollbar">
                  <div className="flex gap-3 w-max px-1">
                    {msg.suggestions.map((show: any) => (
                      <div 
                        key={show.id} 
                        onClick={() => router.push(`/dashboard/tv/${show.id}`)} 
                        className="relative w-28 aspect-[2/3] bg-[#111] rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#ccff00] transition-all group shrink-0 shadow-md"
                      >
                        <img 
                          src={getImageUrl(show.poster_path)} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          alt={show.name} 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-80"></div>
                        <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-[#ccff00] flex items-center gap-0.5 shadow-sm border border-white/5">
                          <Star size={9} fill="currentColor" /> {show.vote_average ? show.vote_average.toFixed(1) : '—'}
                        </div>
                        <div className="absolute bottom-0 w-full p-2 text-right">
                          <h4 className="text-[10px] font-bold line-clamp-2 text-white group-hover:text-[#ccff00] transition-colors leading-tight">
                            {show.name}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-[#151515] border border-white/10 flex items-center justify-center">
              <Bot size={16} className="text-gray-500" />
            </div>
            <div className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] rounded-2xl rounded-tl-none border border-white/5">
              <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-bounce [animation-delay:0.3s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* بخش ورودی پیام و چیپ‌های سریع */}
      <div className="bg-[#0a0a0a]/95 border-t border-white/10 backdrop-blur-xl z-20 flex flex-col gap-2 pb-3">
        <div className="overflow-x-auto no-scrollbar py-2 px-4">
          <div className="flex gap-2 w-max">
            {QUICK_CHIPS.map((chip, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSend(chip.text)} 
                disabled={loading} 
                className="bg-white/5 hover:bg-[#ccff00]/15 hover:text-[#ccff00] hover:border-[#ccff00]/40 border border-white/10 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center group px-4">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            type="text" 
            placeholder="حس و حالت رو بنویس... (مثلاً: یه سریال بزن بزن و انتقامی)" 
            className="w-full bg-[#151515] border border-white/10 rounded-full py-3.5 pr-5 pl-14 text-sm focus:outline-none focus:border-[#ccff00]/60 focus:bg-[#181818] transition-all text-white placeholder:text-gray-500 shadow-inner"
          />
          <button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading} 
            className="absolute left-6 p-2.5 bg-[#ccff00] rounded-full text-black hover:bg-[#b8e600] disabled:opacity-40 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(204,255,0,0.35)] cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />}
          </button>
        </div>
      </div>

    </div>
  );
}
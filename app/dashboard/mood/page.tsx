"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, X, Cpu, Star, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { getImageUrl, searchShows, getPopularShows, getShowDetails } from '@/lib/tmdbClient'; 
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const QUICK_CHIPS = [
  { label: "😂 بترکم از خنده", text: "یه سریال کمدی و خنده دار خفن معرفی کن که حالمو حسابی جا بیاره" },
  { label: "🤯 مایندفاک و مغزپیچ", text: "یه سریال معمایی و به شدت مایندفاک با پایان غیرقابل پیش‌بینی می‌خوام" },
  { label: "🩸 بزنه پاره کنه", text: "یه سریال اکشن و انتقامی پر از بزن بزن و آدرنالین خالص" },
  { label: "😭 دلم گرفته", text: "خیلی دلم گرفته، یه درام سنگین و فوق‌العاده احساسی پیشنهاد بده" },
  { label: "👺 انیمه شاهکار", text: "چند تا انیمه خفن و دیدنی که حتماً باید دید رو معرفی کن" },
  { label: "❤️ عاشقانه و خاص", text: "یه سریال رمانتیک و عاطفی دلنشین می‌خوام" },
  { label: "⚔️ شمشیری و حماسی", text: "یه سریال تاریخی و شمشیری تو مایه‌های وایکینگ‌ها یا بازی تاج و تخت" }
];

const INITIAL_MESSAGE = { 
  role: 'bot', 
  text: 'سلام! من هسته هوشمندِ بینجرم ⚡️\nحس و حال الانت رو برام بنویس یا بگو شبیه چه سریالی دوست داری تا با بررسی سابقه تماشات، بهترین‌ها رو بهت معرفی کنم.' 
};

export default function MoodChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [watchedIds, setWatchedIds] = useState<number[]>([]);
  const [watchedNames, setWatchedNames] = useState<string[]>([]);

  // ۱. خواندن تاریخچه چت‌های قبلی از حافظه کاربر
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem('binger_mood_chat_history');
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.error('خطا در خواندن تاریخچه چت:', e);
    }
  }, []);

  // ۲. اسکرول خودکار به آخرین پیام
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  // ۳. خواندن لیست سریال‌های دیده‌شده کاربر از سوپابیس با حلقه ۱۰۰۰ تایی
  useEffect(() => {
    const fetchUserWatchedData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let allWatched: { show_id: number; created_at: string }[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        // حلقه نامحدود برای دور زدن لیمیت ۱۰۰۰ تایی سوپابیس
        while (hasMore) {
          const { data, error } = await supabase
            .from('watched')
            .select('show_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
            break;
          }

          allWatched = allWatched.concat(data.map(d => ({ show_id: Number(d.show_id), created_at: d.created_at })));

          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        }

        // شناسه‌های یکتا برای فیلتر کردن
        const uniqueIds: number[] = Array.from(new Set(allWatched.map(w => w.show_id)));
        setWatchedIds(uniqueIds);

        // استخراج نام چند سریال آخری که دیده تا به هوش مصنوعی منتقل شود
        const recentShowIds = uniqueIds.slice(0, 6);
        const namePromises = recentShowIds.map(async (id: any) => {
          try {
            // تبدیل شناسه به متن (String) برای سازگاری کامل با تابع
            const details = await getShowDetails(String(id) as any);
            return details?.name || null;
          } catch {
            return null;
          }
        });

        const resolvedNames = await Promise.all(namePromises);
        const validNames = resolvedNames.filter((n): n is string => Boolean(n));
        setWatchedNames(validNames);
      } catch (err) {
        console.error('خطا در دریافت سریال‌های دیده‌شده کاربر:', err);
      }
    };

    fetchUserWatchedData();
  }, []);

  // دکمه بازگشت و خروج
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  // پاک کردن تاریخچه چت و شروع مجدد
  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    try {
      localStorage.removeItem('binger_mood_chat_history');
    } catch (e) {}
  };

  // ارسال پیام به هوش مصنوعی و دریافت پوسترها
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // ارتباط با هوش مصنوعی واقعی Groq از طریق روت سرور
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          watchedShowNames: watchedNames,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در پاسخ هوش مصنوعی');
      }

      const data = await response.json();
      const botText = data.reply || 'این گزینه‌ها متناسب با حس و حالتن:';
      const recommendedTitles: string[] = data.recommended_titles || [];

      // دریافت پوسترها و مشخصات واقعی TMDB برای عناوین پیشنهادی هوش مصنوعی
      let suggestions: any[] = [];
      if (recommendedTitles.length > 0) {
        const searchPromises = recommendedTitles.map(async (title: string) => {
          try {
            const results = await searchShows(title);
            if (results && results.length > 0) {
              // سریال‌هایی که کاربر قبلاً دیده از کارت‌ها حذف می‌شوند
              const unWatched = results.filter((s: any) => !watchedIds.includes(s.id));
              return unWatched.length > 0 ? unWatched[0] : null;
            }
            return null;
          } catch {
            return null;
          }
        });

        const resolvedShows = await Promise.all(searchPromises);
        suggestions = resolvedShows.filter(Boolean);
      }

      // اگر احیاناً هیچ پوستری پیدا نشد، ترندهای روز به عنوان پشتیبان لود می‌شوند تا صفحه خالی نماند
      if (suggestions.length === 0) {
        const fallbackShows = await getPopularShows(1);
        suggestions = (fallbackShows || [])
          .filter((s: any) => !watchedIds.includes(s.id))
          .slice(0, 6);
      }

      const botMsg = {
        role: 'bot',
        text: botText,
        suggestions: suggestions.slice(0, 8),
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);
      localStorage.setItem('binger_mood_chat_history', JSON.stringify(finalMessages));

    } catch (err) {
      console.error('خطا در پردازش پیام:', err);
      // حالت پشتیبان در صورت خطای شبکه
      const fallbackShows = await getPopularShows(1);
      const botMsg = {
        role: 'bot',
        text: 'متوجه حال و هوات شدم! ارتباط سرور کمی تاخیر داشت، اما این چند تا سریال منتخب که با سلیقه‌ت جور درمیاد رو ببین:',
        suggestions: (fallbackShows || []).slice(0, 6),
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);
      localStorage.setItem('binger_mood_chat_history', JSON.stringify(finalMessages));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="h-[100dvh] w-full bg-[#050505] text-white font-['Vazirmatn'] flex flex-col pb-20 md:pb-0 relative overflow-hidden pt-20 transition-colors duration-1000">
      
      {/* نور سینمایی پس‌زمینه */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#ccff00]/10 via-transparent to-purple-950/20 blur-[130px] opacity-40 pointer-events-none"></div>

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
              <h3 className="text-xl font-black text-white mb-2">هوش مصنوعی بینجر</h3>
            </div>
            <div className="space-y-4 text-right">
              <div>
                <h4 className="font-bold text-[#ccff00] mb-2 text-sm flex items-center gap-2">
                  <Zap size={16}/> متصل به هوش مصنوعی واقعی
                </h4>
                <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  با زبان خودت حرف بزن! هوش مصنوعی بینجر با درک کامل زبان فارسی و اصطلاحات فیلم‌بازها، سریال‌های متناسب با حس و حالت را پیشنهاد می‌دهد.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-green-400 mb-2 text-sm flex items-center gap-2">
                  <Star size={16}/> هماهنگ با سابقه تماشای تو
                </h4>
                <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                  سریال‌هایی که قبلاً در بینجر تماشا کرده‌ای از لیست پیشنهادات حذف می‌شوند تا همیشه با شاهکارهای جدید شگفت‌زده شوی!
                </p>
              </div>
              <p className="text-center text-[11px] text-gray-500 pt-3 border-t border-white/5">
                نسخه پیشرفته Binger AI — با پشتیبانی از مدل Llama 3.3 ⚡️
              </p>
            </div>
          </div>
        </div>
      )}

      {/* هدر صفحه: شامل دکمه بازگشت، وضعیت و دکمه شروع مجدد */}
      <header className="p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between shadow-2xl z-20 relative">
        <div className="flex items-center gap-3">
          {/* دکمه بازگشت */}
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
              Binger AI <span className="bg-[#ccff00]/10 text-[#ccff00] text-[9px] px-2 py-0.5 rounded-full font-mono border border-[#ccff00]/20">PRO</span>
            </h1>
            <p className="text-[10px] text-gray-400">دستیار فوق‌هوشمند سینما</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* دکمه ریست چت */}
          <button 
            onClick={handleResetChat} 
            title="شروع مجدد گفتگو"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-red-500/50 hover:text-red-400 transition-all cursor-pointer text-gray-400"
          >
            <RotateCcw size={18} />
          </button>

          {/* دکمه راهنما */}
          <button 
            onClick={() => setShowHelpModal(true)} 
            title="راهنما"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all cursor-pointer text-gray-400 hover:text-white"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* بخش چت و پیام‌ها */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth z-10 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-[#222] border border-white/10' : 'bg-gradient-to-br from-[#ccff00] to-green-500'}`}>
              {msg.role === 'user' ? <User size={16} className="text-gray-300" /> : <Zap size={16} className="text-black fill-black" />}
            </div>
            <div className={`flex flex-col gap-3 max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#1e1e1e] text-white rounded-tr-none border border-white/5' : 'bg-[#121212] border border-white/10 text-gray-200 rounded-tl-none'}`}>
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

      {/* بخش ورودی پیام و دکمه‌های سریع (Chips) */}
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
            placeholder="حس و حالت رو به زبان خودت بنویس..." 
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
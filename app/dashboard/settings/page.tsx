"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  ArrowRight, Check, Loader2, Sparkles, User, FileText, 
  Phone, Mail, Bell, BellRing
} from 'lucide-react';
import Link from 'next/link';

// گالری آواتارهای آماده سینمایی بینجر
const PRESET_AVATARS = [
  { id: 'director', icon: '🎬', label: 'کارگردان' },
  { id: 'popcorn', icon: '🍿', label: 'فیلم‌باز' },
  { id: 'king', icon: '👑', label: 'بینجر اصیل' },
  { id: 'gangster', icon: '🕶️', label: 'نئو نوآر' },
  { id: 'detective', icon: '🕵️', label: 'کارآگاه' },
  { id: 'drama', icon: '🎭', label: 'دراماتیک' },
  { id: 'scifi', icon: '🤖', label: 'سای‌فای' },
  { id: 'cowboy', icon: '🤠', label: 'کابوی' },
  { id: 'vampire', icon: '🧛', label: 'خون‌آشام' },
  { id: 'space', icon: '🚀', label: 'کیهان‌نورد' },
  { id: 'wizard', icon: '🧙', label: 'فانتزی' },
  { id: 'cool', icon: '😎', label: 'کلاسیک' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient() as any;

  // تب‌های صفحه تنظیمات
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // مشخصات کاربری
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😎');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // استیت‌های نوتیفیکیشن
  const [browserPermission, setBrowserPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [notificationSettings, setNotificationSettings] = useState({
    newEpisodes: true,       // پخش قسمت جدید سریال‌های من
    newFollowers: true,      // دنبال‌کننده جدید
    achievements: true,      // باز شدن اچیومنت جدید
    weeklyPicks: false,      // پیشنهادهای داغ هفتگی
  });

  // ۱. خواندن اطلاعات کاربر و تنظیمات نوتیفیکیشن
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setUser(user);

        // بررسی دسترسی نوتیفیکیشن مرورگر
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setBrowserPermission(Notification.permission);
        }

        const metaBio = user.user_metadata?.bio || '';
        const metaName = user.user_metadata?.full_name || '';
        const metaAvatar = user.user_metadata?.avatar_url || '😎';
        const userPhone = user.phone || user.user_metadata?.phone || '';
        const userEmail = user.email || '';
        const savedNotifs = user.user_metadata?.notification_preferences;

        if (savedNotifs) {
          setNotificationSettings(savedNotifs);
        }

        setEmail(userEmail);

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUsername(profile.username || metaName || '');
          setPhone((profile as any).phone || userPhone || '');
          setBio((profile as any).bio || metaBio || '');
          setSelectedAvatar(profile.avatar_url || metaAvatar || '😎');
        } else {
          setUsername(metaName || userEmail.split('@')[0] || '');
          setPhone(userPhone);
          setBio(metaBio);
          setSelectedAvatar(metaAvatar);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router, supabase]);

  // درخواست اجازه ارسال نوتیفیکیشن از مرورگر
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission === 'granted') {
        new Notification('بینجر | Binger', {
          body: 'نوتیفیکیشن‌های بینجر با موفقیت برای شما فعال شد! 🎉',
          icon: '/Logo.png'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ارسال نوتیفیکیشن تستی
  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('اعلان تستی بینجر 🍿', {
        body: 'قسمت جدید سریالی که دنبال می‌کنی هم‌اکنون منتشر شد!',
        icon: '/Logo.png'
      });
    } else {
      requestNotificationPermission();
    }
  };

  // تغییر سوییچ‌های نوتیفیکیشن
  const toggleNotificationItem = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ۲. ذخیره اطلاعات
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage('');
    setIsError(false);

    try {
      const cleanUsername = username.trim();
      const cleanPhone = phone.trim();
      const cleanEmail = email.trim();
      const cleanBio = bio.trim();

      // ذخیره در جدول profiles
      const profilePayload: any = {
        id: user.id,
        username: cleanUsername,
        phone: cleanPhone,
        bio: cleanBio,
        avatar_url: selectedAvatar,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (dbError) throw dbError;

      // آپدیت ایمیل کاربر در صورت تغییر
      if (cleanEmail && cleanEmail !== user.email) {
        await supabase.auth.updateUser({ email: cleanEmail });
      }

      // ذخیره در متادیتای کاربر در سوپابیس (شامل تنظیمات نوتیفیکیشن)
      await supabase.auth.updateUser({
        data: {
          full_name: cleanUsername,
          phone: cleanPhone,
          bio: cleanBio,
          avatar_url: selectedAvatar,
          notification_preferences: notificationSettings,
        }
      });

      setMessage('تنظیمات با موفقیت ذخیره شد!');

      setTimeout(() => {
        router.push('/dashboard/profile');
        router.refresh();
      }, 500);

    } catch (err: any) {
      console.error("Save Error:", err);
      setIsError(true);
      setMessage(`خطا در ذخیره: ${err.message || 'مشکلی پیش آمد'}`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-24 md:pt-28 flex justify-center items-start">
      <div className="w-full max-w-2xl">

        {/* دکمه بازگشت به پروفایل */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-white/10 transition-all cursor-pointer"
          >
            <ArrowRight size={16} />
            <span>بازگشت به پروفایل</span>
          </Link>
        </div>

        {/* کارت اصلی تنظیمات */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#ccff00]/10 blur-[100px] rounded-full pointer-events-none" />

          {/* عنوان صفحه */}
          <div className="mb-6 text-center sm:text-right">
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="text-[#ccff00]" size={24} /> تنظیمات حساب کاربری
            </h1>
            <p className="text-xs text-gray-400 mt-1.5">
              مشخصات حساب، آواتار و نحوه دریافت نوتیفیکیشن‌ها را مدیریت کنید.
            </p>
          </div>

          {/* تب‌های انتخاب بخش */}
          <div className="flex gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#ccff00] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={16} />
              <span>پروفایل و مشخصات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#ccff00] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bell size={16} />
              <span>نوتیفیکیشن و اعلان‌ها</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* ================= تب ۱: پروفایل و مشخصات ================= */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* گالری آواتارها */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-3 block flex items-center gap-1.5">
                    <span>انتخاب آواتار سینمایی</span>
                    <span className="text-[10px] text-gray-500 font-normal">(یک مورد را انتخاب کنید)</span>
                  </label>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {PRESET_AVATARS.map((avatar) => {
                      const isSelected = selectedAvatar === avatar.icon;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar.icon)}
                          className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                            isSelected 
                              ? 'border-2 border-[#ccff00] shadow-[0_0_20px_rgba(204,255,0,0.35)] scale-105 bg-white/10' 
                              : 'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="text-3xl filter drop-shadow-md">{avatar.icon}</span>
                          <span className="text-[9px] text-gray-400 mt-1 font-bold group-hover:text-gray-200">{avatar.label}</span>

                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#ccff00] text-black rounded-full flex items-center justify-center shadow-md">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* پیش‌نمایش آواتار */}
                <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-900 border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    {selectedAvatar}
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    آواتار انتخابی شما در پروفایل و استوری‌های اینستاگرام نمایش داده خواهد شد.
                  </div>
                </div>

                {/* نام کاربری */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1.5">
                    <User size={14} className="text-[#ccff00]" /> نام کاربری / نمایشی
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثلاً پوریا یا FilmLover"
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3.5 text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none transition-colors text-sm"
                  />
                </div>

                {/* شماره تماس */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1.5">
                    <Phone size={14} className="text-[#ccff00]" /> شماره تماس / موبایل
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3.5 text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none transition-colors text-sm tracking-wider text-left"
                  />
                </div>

                {/* ایمیل */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1.5">
                    <Mail size={14} className="text-[#ccff00]" /> ایمیل حساب کاربری
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3.5 text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none transition-colors text-sm text-left"
                  />
                </div>

                {/* بیوگرافی */}
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1.5">
                    <FileText size={14} className="text-[#ccff00]" /> درباره من (بیو)
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="مثلاً: عاشق سینمای نولان و سیت‌کام‌های کلاسیک..."
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl p-3.5 text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none transition-colors text-sm resize-none leading-relaxed"
                  />
                </div>

              </div>
            )}

            {/* ================= تب ۲: نوتیفیکیشن‌ها و اعلان‌ها ================= */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* وضعیت دسترسی مرورگر */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        browserPermission === 'granted' 
                          ? 'bg-[#ccff00]/15 text-[#ccff00]' 
                          : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        <BellRing size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>وضعیت دسترسی مرورگر</span>
                          {browserPermission === 'granted' ? (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                              فعال است
                            </span>
                          ) : browserPermission === 'denied' ? (
                            <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-bold">
                              مسدود شده
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                              نیازمند تایید
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {browserPermission === 'granted'
                            ? 'مرورگر شما آماده دریافت اعلان‌های بینجر است.'
                            : 'برای باخبر شدن از قسمت‌های جدید، دسترسی را فعال کنید.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {browserPermission !== 'granted' ? (
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="bg-[#ccff00] hover:bg-[#b3e600] text-black text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          فعال‌سازی دسترسی
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={sendTestNotification}
                          className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
                        >
                          ارسال پیام تستی
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* سوییچ‌های اختصاصی نوتیفیکیشن */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 mb-2">انتخاب اعلان‌های دلخواه:</h4>

                  {/* اعلان قسمت‌های جدید */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">قسمت جدید سریال‌های در حال تماشا</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">به محض پخش شدن اپیزود جدید از سریال‌های در حال تماشای شما</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationItem('newEpisodes')}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        notificationSettings.newEpisodes ? 'bg-[#ccff00]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${notificationSettings.newEpisodes ? 'translate-x-0' : '-translate-x-6'}`} />
                    </button>
                  </div>

                  {/* اعلان فالوور جدید */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">دنبال‌کننده جدید</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">وقتی کاربری شما را در بینجر فالو می‌کند</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationItem('newFollowers')}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        notificationSettings.newFollowers ? 'bg-[#ccff00]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${notificationSettings.newFollowers ? 'translate-x-0' : '-translate-x-6'}`} />
                    </button>
                  </div>

                  {/* اعلان باز شدن اچیومنت */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">کسب مدال و افتخار جدید (Achievements)</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">تبریک و اطلاع‌رسانی باز شدن هر یک از ۳۵ مدال بینجر</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationItem('achievements')}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        notificationSettings.achievements ? 'bg-[#ccff00]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${notificationSettings.achievements ? 'translate-x-0' : '-translate-x-6'}`} />
                    </button>
                  </div>

                  {/* اعلان پیشنهادهای هفتگی */}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">پیشنهادهای شاهکار هفتگی</h5>
                      <p className="text-[10px] text-gray-500 mt-0.5">معرفی هفتگی سریال‌های با امتیاز بالای ۸.۵ متناسب با سلیقه شما</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotificationItem('weeklyPicks')}
                      className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        notificationSettings.weeklyPicks ? 'bg-[#ccff00]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${notificationSettings.weeklyPicks ? 'translate-x-0' : '-translate-x-6'}`} />
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* دکمه‌های ثبت */}
            <div className="pt-4 border-t border-white/10 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-black py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>ذخیره تغییرات</span>
                  </>
                )}
              </button>

              <Link
                href="/dashboard/profile"
                className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold rounded-xl border border-white/10 transition-colors text-sm text-center"
              >
                انصراف
              </Link>
            </div>

            {message && (
              <p className={`text-center text-xs p-3 rounded-xl border ${
                isError 
                  ? 'text-red-400 bg-red-950/40 border-red-500/30' 
                  : 'text-[#ccff00] bg-lime-950/40 border-lime-500/30'
              }`}>
                {message}
              </p>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
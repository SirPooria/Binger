import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowRight, ShieldAlert, CreditCard, RefreshCcw, Film, UserCheck, AlertTriangle, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'قوانین و مقررات استفاده | بینجر (Binger)',
  description: 'قوانین و مقررات استفاده از سامانه بینجر، شرایط خرید اشتراک VIP و سیاست استرداد وجه.',
};

export default function TermsOfServicePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-neutral-200 font-['Vazirmatn'] selection:bg-[#ccff00] selection:text-black">
      {/* هدر صفحه */}
      <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors text-xs font-bold">
            <ArrowRight size={16} />
            <span>بازگشت به بینجر</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/Logo.png" alt="بینجر" className="h-7 w-auto object-contain" />
            <span className="text-white font-bold text-sm">بینجر • Binger</span>
          </div>
        </div>
      </header>

      {/* محتوای اصلی */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-12">
        {/* عنوان و مشخصات سند */}
        <div className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold">
            <FileText size={14} />
            <span>شرایط و ضوابط رسمی خدمات</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            قوانین و مقررات استفاده (Terms of Service)
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            آخرین به‌روزرسانی: مهر ۱۴۰۵ (اکتبر ۲۰۲۶) • حاکم بر کلیه خدمات وب‌سایت و برنامه بینجر (Binger)
          </p>
        </div>

        {/* ماده ۱: تعریف سرویس و ماهیت حقوقی */}
        <section className="space-y-4 text-sm leading-relaxed text-neutral-300">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Film className="text-[#ccff00]" size={20} />
            <span>ماده ۱: ماهیت و دامنه خدمات پلتفرم</span>
          </h2>
          <p>
            پلتفرم <strong>بینجر (Binger)</strong> یک سامانه تحت وب هوشمند برای <strong>ردیابی سوابق تماشا، مدیریت لیست‌ها و کشف آثار سینمایی و تلویزیونی</strong> است. بینجر بستری برای ثبت پیشرفت اپیزودها، یادداشت دیدگاه‌های مخاطبان، دریافت پیشنهادات هوش مصنوعی بر اساس مود و ساخت سالنامه تماشا فراهم می‌آورد.
          </p>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <ShieldAlert size={16} />
              <span>سلب مسئولیت کپی‌رایت و میزبانی ویدیو (Copyright & Streaming Disclaimer)</span>
            </div>
            <p className="leading-relaxed">
              <strong>بینجر هیچ‌گونه فایل ویدیویی فیلم یا سریال را میزبانی، آپلود، دانلود یا استریم نمی‌کند.</strong> کلیه تصاویر پوسترها، اسامی بازیگران و ابرداده‌های سینمایی از طریق رابط برنامه‌نویسی پایگاه داده The Movie Database (TMDB) فراخوانی می‌شوند. بینجر هیچ ادعایی نسبت به مالکیت معنوی آثار سینمایی نمایش‌داده‌شده ندارد و پیوند یا ارائه‌دهنده پخش آنلاین نمی‌باشد.
            </p>
          </div>
        </section>

        {/* ماده ۲: حساب کاربری و ثبت‌نام */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <UserCheck className="text-[#ccff00]" size={20} />
            <span>ماده ۲: حساب کاربری و احراز هویت</span>
          </h2>
          <div className="space-y-2 text-sm text-neutral-300 leading-relaxed">
            <ul className="list-disc list-inside space-y-2 pr-2">
              <li>
                <strong>احراز هویت پیامکی:</strong> ورود به بینجر از طریق ارسال کد یک‌بار مصرف (OTP) به شماره همراه معتبر کاربر انجام می‌شود. مالکیت شماره تلفن بر عهده کاربر است و کلیه اقدامات انجام‌شده از طریق حساب به صاحب شماره منتسب خواهد بود.
              </li>
              <li>
                <strong>حفظ امنیت دسترسی:</strong> کاربر موظف است از در اختیار گذاشتن کد تایید پیامکی به افراد ناشناس خودداری نماید.
              </li>
              <li>
                <strong>رعایت ادب و ضوابط در نام کاربری:</strong> انتخاب اسامی ناقض قوانین کشور، نام‌های موهن، نژادپرستانه یا جعل هویت اشخاص حقیقی و حقوقی ممنوع بوده و حق اصلاح یا مسدودسازی برای مدیریت محفوظ است.
              </li>
            </ul>
          </div>
        </section>

        {/* ماده ۳: اشتراک‌های VIP، پرداخت‌ها و شرایط استرداد وجه (Refund Policy) */}
        <section id="refund" className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="text-[#ccff00]" size={20} />
            <span>ماده ۳: اشتراک ویژه (VIP)، پرداخت و شرایط بازگشت پول (Refund Policy)</span>
          </h2>
          <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
            <p>
              بینجر علاوه بر خدمات پایه رایگان، اشتراک‌های اختیاری VIP (ماهانه و سالانه) را جهت دسترسی به امکاناتی نظیر هوش مصنوعی نامحدود، لیست‌های نامحدود، نشان‌های طلایی و آمار پیشرفته سالنامه عرضه می‌نماید.
            </p>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <RefreshCcw className="text-[#ccff00]" size={16} />
                <span>سیاست استرداد وجه (قوانین مرجوعی و انصراف از خرید)</span>
              </h3>
              <p className="text-xs text-neutral-400">
                مطابق با <strong>مواد ۳۷ و ۳۸ قانون تجارت الکترونیکی جمهوری اسلامی ایران</strong> و مقررات حاکم بر ارائه خدمات و محصولات دیجیتال غیرملموس، شرایط بازگشت وجه به شرح زیر است:
              </p>

              <div className="space-y-2 text-xs text-neutral-300">
                <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                  <strong className="text-emerald-400 block font-bold">۱. مواردی که وجه به طور کامل مسترد می‌گردد:</strong>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300 pr-1">
                    <li>
                      <strong>تراکنش ناموفق یا کسر اضافه بانکی:</strong> در صورتی که به دلیل اختلال در درگاه شاپرک/زیبال وجه از حساب شما کسر شده اما اشتراک فعال نشده و مغایرت ظرف ۷۲ ساعت توسط شبکه بانکی رفع نشود، با ارائه شماره پیگیری (Ref Number) وجه سریعاً به حساب بازگردانده می‌شود یا اشتراک به صورت دستی فعال می‌گردد.
                    </li>
                    <li>
                      <strong>نقص فنی غیرقابل جبران در سامانه:</strong> چنانچه ظرف ۴۸ ساعت نخست پس از خرید اشتراک، به دلیل بروز نقص فنی سمت سرورهای بینجر، کاربر به هیچ‌یک از امکانات VIP خریداری‌شده دسترسی نداشته باشد و تیم پشتیبانی ظرف ۴۸ ساعت موفق به رفع مشکل نگردد، کل مبلغ اشتراک عودت داده خواهد شد.
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1">
                  <strong className="text-rose-400 block font-bold">۲. موارد عدم شمول حق انصراف و بازگشت وجه:</strong>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300 pr-1">
                    <li>
                      <strong>استفاده از خدمات دیجیتال:</strong> بر اساس بند (ج) ماده ۳۸ قانون تجارت الکترونیکی، در خدماتی که اجرای آنها بلافاصله با توافق مصرف‌کننده آغاز می‌شود و کاربر از امکانات VIP (نظیر سهمیه چت دکتر بینجر، ایجاد لیست‌های نامحدود یا بج کاربری) استفاده کرده است، امکان انصراف به دلیل تغییر سلیقه وجود ندارد.
                    </li>
                    <li>
                      <strong>پایان دوره مصرف:</strong> درخواست استرداد وجه پس از سپری شدن دوره اشتراک یا گذشت بیش از ۴۸ ساعت از زمان خرید، قابل پذیرش نمی‌باشد.
                    </li>
                  </ul>
                </div>

                <p className="text-[11px] text-neutral-400 pt-1">
                  <em>روش ثبت درخواست استرداد:</em> ارسال پیام به ایمیل <code className="text-[#ccff00]">support@binger.ir</code> به همراه شماره تماس حساب کاربری و شماره تراکنش پرداخت. بررسی ظرف حداکثر ۲۴ الی ۴۸ ساعت کاری انجام خواهد شد.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ماده ۴: قوانین محتوا و بخش دیدگاه‌ها */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <AlertTriangle className="text-[#ccff00]" size={20} />
            <span>ماده ۴: قوانین ارسال دیدگاه و رفتار کاربران</span>
          </h2>
          <div className="space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p>کاربران در زمان نگارش یادداشت‌ها و شرکت در تالارهای نقد اپیزودها موظف به رعایت اصول زیر هستند:</p>
            <ul className="list-disc list-inside space-y-1.5 pr-2">
              <li>
                <strong>احترام به عدم افشای داستان (Spoiler Shield):</strong> هرگونه متنی که اتفاقات کلیدی یا پایان داستان را فاش می‌کند باید حتماً با برچسب <em>«حاوی اسپویل»</em> علامت‌گذاری شود.
              </li>
              <li>
                <strong>رعایت نزاکت عمومی:</strong> انتشار پیام‌های حاوی فحاشی، توهین به قومیت‌ها، مقدسات یا اشخاص ثالث اکیداً ممنوع بوده و منجر به حذف نظر و در صورت تکرار، انسداد حساب می‌گردد.
              </li>
              <li>
                <strong>ممنوعیت تبلیغات تجاری و لینک‌های خارجی مخرب:</strong> قرار دادن لینک به وب‌سایت‌های غیرمجاز، فیشینگ یا تبلیغات فروش بدون هماهنگی ممنوع است.
              </li>
            </ul>
          </div>
        </section>

        {/* ماده ۵: تغییرات در شرایط و قانون حاکم */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="text-[#ccff00]" size={20} />
            <span>ماده ۵: قانون حاکم و حل و فصل اختلافات</span>
          </h2>
          <div className="space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p>
              این توافق‌نامه تابع کلیه قوانین موضوعه جمهوری اسلامی ایران، به ویژه قانون تجارت الکترونیکی، قانون جرایم رایانه‌ای و مقررات ناظر بر کسب‌وکارهای مجازی است.
            </p>
            <p>
              در صورت بروز هرگونه اختلاف، تلاش نخست طرفین بر پایه مذاکره مسالمت‌آمیز از طریق پشتیبانی بینجر خواهد بود و در صورت عدم حصول توافق، مراجع قضایی و داوری صلاحیت‌دار ایران مرجع رسیدگی نهایی خواهند بود.
            </p>
          </div>
        </section>

        {/* اطلاعات تماس حقوقی */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">ارتباط با پشتیبانی حقوقی و مالی بینجر</h3>
              <p className="text-neutral-400 mt-1">پاسخگویی به درخواست‌های فاکتور رسمی، انصراف و گزارش محتوای نامناسب</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-neutral-300 bg-black/60 px-3 py-2 rounded-xl border border-white/10">
              <Mail size={14} className="text-[#ccff00]" />
              <span>support@binger.ir</span>
            </div>
          </div>
        </section>

        {/* فوتر ناوبری صفحه */}
        <div className="border-t border-white/10 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors underline underline-offset-4">سیاست حریم خصوصی</Link>
            <Link href="/cookies" className="hover:text-white transition-colors underline underline-offset-4">سیاست کوکی‌ها</Link>
          </div>
          <span>© ۲۰۲۶ پلتفرم بینجر (Binger)</span>
        </div>
      </main>
    </div>
  );
}

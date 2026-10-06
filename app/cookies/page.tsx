import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, ArrowRight, ShieldCheck, CheckCircle2, XCircle, Info, Settings, Trash2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سیاست کوکی‌ها و حافظه مرورگر | بینجر (Binger)',
  description: 'شفافیت استفاده از کوکی‌ها، سشن‌ها و حافظه محلی در پلتفرم بینجر.',
};

export default function CookiePolicyPage() {
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
        {/* عنوان */}
        <div className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold">
            <Cookie size={14} />
            <span>شفافیت کامل در ذخیره‌سازی محلی</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            سیاست کوکی‌ها و حافظه مرورگر (Cookie Policy)
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            آخرین به‌روزرسانی: مهر ۱۴۰۵ (اکتبر ۲۰۲۶) • راهنمای شفاف نحوه استفاده بینجر از کوکی‌ها و LocalStorage
          </p>
        </div>

        {/* تعریف کوکی و فلسفه بینجر */}
        <section className="space-y-4 text-sm leading-relaxed text-neutral-300">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Info className="text-[#ccff00]" size={20} />
            <span>کوکی چیست و چرا بینجر از آن استفاده می‌کند؟</span>
          </h2>
          <p>
            کوکی‌ها (Cookies) فایل‌های متنی بسیار کوچکی هستند که توسط وب‌سایت در مرورگر دستگاه شما ذخیره می‌شوند تا وب‌سایت بتواند شما را در مراجعات بعدی به خاطر بسپارد. در وب مدرن علاوه بر کوکی‌ها، از تکنولوژی‌های <strong>LocalStorage</strong> و <strong>SessionStorage</strong> نیز برای ذخیره سریع تنظیمات محلی استفاده می‌شود.
          </p>
          <p>
            فلسفه فنی بینجر بر پایه <strong>حداقل‌سازی ردیابی و حداکثر بهره‌وری تجربه کاربری</strong> استوار است. ما از کوکی‌های تبلیغاتی مزاحم استفاده نمی‌کنیم و تمامی ذخیره‌سازی‌های محلی صرفاً برای عملکرد صحیح سامانه و تجربه روان شما طراحی شده‌اند.
          </p>
        </section>

        {/* جدول کوکی‌ها و سشن‌های فعال در بینجر */}
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="text-[#ccff00]" size={20} />
            <span>کوکی‌ها و ذخیره‌سازهای دقیق مورد استفاده در بینجر</span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-neutral-300 font-bold">
                  <th className="p-4">نام کلید / کوکی</th>
                  <th className="p-4">نوع</th>
                  <th className="p-4">مدت ماندگاری</th>
                  <th className="p-4">هدف و ضرورت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300">
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-mono font-bold text-white dir-ltr">sb-*-auth-token</td>
                  <td className="p-4">کوکی امن (Cookie)</td>
                  <td className="p-4">تا زمان خروج از حساب</td>
                  <td className="p-4"><strong>کاملاً ضروری:</strong> حفظ احراز هویت ورود شما به شکل رمزنگاری‌شده توسط سامانه Supabase جهت جلوگیری از سرقت حساب.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-mono font-bold text-white dir-ltr">binger_scroll_*</td>
                  <td className="p-4">SessionStorage</td>
                  <td className="p-4">تا زمان بستن تب مرورگر</td>
                  <td className="p-4"><strong>تجربه کاربری:</strong> به خاطر سپردن موقعیت اسکرول صفحه هنگام بازگشت از صفحه جزییات سریال به صفحه قبل تا صفحه از اول ریلود نشود.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-mono font-bold text-white dir-ltr">binger_cache_*</td>
                  <td className="p-4">SessionStorage</td>
                  <td className="p-4">تا زمان بستن تب مرورگر</td>
                  <td className="p-4"><strong>عملکرد:</strong> ذخیره موقت ساختار صفحات کاوش و داشبورد برای باز شدن آنی بدون نیاز به لودینگ دوباره.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-mono font-bold text-white dir-ltr">binger_cookie_consent</td>
                  <td className="p-4">LocalStorage</td>
                  <td className="p-4">دائمی (تا پاکسازی مرورگر)</td>
                  <td className="p-4"><strong>تنظیمات:</strong> ثبت تایید نمایش بنر آگاهی‌رسانی کوکی تا مجدداً روی صفحه ظاهر نشود.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* کوکی‌های شخص ثالث و تبلیغاتی */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <XCircle className="text-rose-400" size={16} />
              <span>عدم استفاده از کوکی‌های ردیاب تبلیغاتی (No Ad Tracking Cookies)</span>
            </h3>
            <p className="text-neutral-300">
              بینجر <strong>هیچ‌گونه کوکی ردیاب شخص ثالث تبلیغاتی</strong> (نظیر Google Analytics Advertising, Meta Pixel, Yandex Metrica یا شبکه‌های تبلیغات کلیکی) در سایت قرار نداده است. فعالیت‌های شما در بینجر برای نمایش آگهی در سایر سایت‌های اینترنتی ردگیری نمی‌شود.
            </p>
          </div>
        </section>

        {/* نحوه مدیریت و حذف کوکی‌ها در مرورگر */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="text-[#ccff00]" size={20} />
            <span>چگونه می‌توانید کوکی‌ها را مدیریت یا حذف کنید؟</span>
          </h2>
          <div className="space-y-3 text-sm text-neutral-300 leading-relaxed">
            <p>
              شما می‌توانید در هر زمان از طریق بخش تنظیمات مرورگر خود، کوکی‌ها و حافظه محلی سایت بینجر یا هر سایت دیگری را مسدود یا پاک کنید:
            </p>
            <ul className="list-disc list-inside space-y-2 pr-2 text-xs">
              <li>
                <strong>مرورگر Google Chrome:</strong> مراجعه به <span className="font-mono text-neutral-200">Settings &gt; Privacy and security &gt; Cookies and other site data</span>.
              </li>
              <li>
                <strong>مرورگر Safari (آیفون و مک):</strong> مراجعه به <span className="font-mono text-neutral-200">Preferences &gt; Privacy &gt; Manage Website Data</span>.
              </li>
              <li>
                <strong>مرورگر Firefox:</strong> مراجعه به <span className="font-mono text-neutral-200">Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data</span>.
              </li>
            </ul>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <strong>توجه فنی:</strong> از آنجا که کوکی‌های احراز هویت بینجر برای حفظ امنیت ورود شما الزامی هستند، در صورت غیرفعال‌سازی کلیه کوکی‌ها در مرورگر، پس از هر بار بستن صفحه از حساب کاربری خود خارج خواهید شد.
            </div>
          </div>
        </section>

        {/* فوتر ناوبری صفحه */}
        <div className="border-t border-white/10 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors underline underline-offset-4">سیاست حریم خصوصی</Link>
            <Link href="/terms" className="hover:text-white transition-colors underline underline-offset-4">قوانین و مقررات</Link>
          </div>
          <span>© ۲۰۲۶ پلتفرم بینجر (Binger)</span>
        </div>
      </main>
    </div>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Lock, Eye, Server, RefreshCw, Mail, Phone, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سیاست حفظ حریم خصوصی | بینجر (Binger)',
  description: 'سیاست حفظ حریم خصوصی، شفافیت جمع‌آوری داده‌ها و امنیت اطلاعات کاربران در پلتفرم بینجر.',
};

export default function PrivacyPolicyPage() {
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
        {/* عنوان و تاریخ به‌روزرسانی */}
        <div className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold">
            <ShieldCheck size={14} />
            <span>سند رسمی حفاظت از داده‌ها و حریم خصوصی</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            سیاست حفظ حریم خصوصی (Privacy Policy)
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            آخرین به‌روزرسانی: مهر ۱۴۰۵ (اکتبر ۲۰۲۶) • اعتبار برای تمامی کاربران وب‌سایت و اپلیکیشن بینجر (Binger)
          </p>
        </div>

        {/* مقدمه */}
        <section className="space-y-4 text-sm leading-relaxed text-neutral-300">
          <p>
            پلتفرم <strong>بینجر (Binger)</strong> به نشانی اینترنتی Binger.ir متعهد است که از اطلاعات خصوصی و داده‌های کاربران خود با بالاترین استانداردهای امنیتی و شفافیت کامل محافظت نماید. این سند بر اساس عملکرد واقعی پلتفرم تنظیم شده و مشخص می‌کند چه اطلاعاتی دریافت می‌شود، چگونه نگهداری شده و با چه سرویس‌هایی در تعامل است.
          </p>
          <p>
            استفاده شما از خدمات بینجر یا ورود با شماره موبایل به منزله مطالعه و موافقت با تمامی مفاد این سیاست‌نامه است.
          </p>
        </section>

        {/* ۱. چه اطلاعاتی را جمع‌آوری می‌کنیم؟ */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Eye className="text-[#ccff00]" size={20} />
            <span>۱. چه داده‌هایی جمع‌آوری می‌شوند؟</span>
          </h2>
          <div className="space-y-3 text-sm text-neutral-300 leading-relaxed">
            <p>
              بینجر بر اساس اصل <strong>«حداقل‌سازی داده‌ها» (Data Minimization)</strong> طراحی شده است؛ به این معنا که تنها اطلاعاتی که برای ارائه سرویس مدیریت سریال الزامی است ذخیره می‌گردد:
            </p>
            <ul className="list-disc list-inside space-y-2 pr-2 text-neutral-300">
              <li>
                <strong>شماره تلفن همراه:</strong> برای ثبت‌نام و ورود بدون نیاز به رمز عبور (ارسال کد یک‌بار مصرف OTP از طریق پیامک).
              </li>
              <li>
                <strong>اطلاعات حساب کاربری اختیاری:</strong> نام کاربری نمایشی، بیوگرافی کوتاه و عکس پروفایل (آواتار).
              </li>
              <li>
                <strong>فعالیت‌های سینمایی در سامانه:</strong> اپیزودهای دیده‌شده، وضعیت تماشای سریال‌ها (در حال تماشا، پایان‌یافته، قصد تماشا)، امتیازها، نقدهای متنی، واکنش‌ها و لیست‌های سفارشی ساخته‌شده توسط شما.
              </li>
              <li>
                <strong>اطلاعات فنی مرورگر:</strong> نوع مرورگر، سیستم‌عامل، و سوابق زمان لاگین جهت پیشگیری از سوءاستفاده‌های سایبری و حملات DDoS.
              </li>
              <li>
                <strong>داده‌های پرداخت (مشترکین VIP):</strong> تنها شناسه تراکنش (Track ID / Ref Number)، تاریخ و مبلغ در پایگاه داده ثبت می‌شود. <em>بینجر تحت هیچ شرایطی به شماره کارت، رمز دوم (CVV2) یا اطلاعات بانکی کاربران دسترسی ندارد و کلیه تراکنش‌ها در بستر شبکه شاپرک و درگاه‌های رسمی انجام می‌شود.</em>
              </li>
            </ul>
          </div>
        </section>

        {/* ۲. هدف از استفاده از داده‌ها */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Server className="text-[#ccff00]" size={20} />
            <span>۲. اهداف استفاده از اطلاعات</span>
          </h2>
          <div className="space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p>اطلاعات ذخیره‌شده صرفاً برای موارد زیر مورد استفاده قرار می‌گیرند:</p>
            <ul className="list-disc list-inside space-y-1.5 pr-2">
              <li>احراز هویت پیامکی امن و جلوگیری از ساخت حساب‌های غیرواقعی.</li>
              <li>همگام‌سازی لحظه‌ای سوابق تماشای سریال در تمامی دستگاه‌های متصل کاربر.</li>
              <li>محاسبه آمار شخصی‌سازی‌شده (مانند ساعت‌های تماشا، ژانرهای محبوب و سالنامه Binger Wrapped).</li>
              <li>ارائه پیشنهادات هوش مصنوعی بر اساس تاریخچه سلیقه و بدون افشای داستان (Spoiler-Free).</li>
              <li>ارسال اعلان‌های سیستمی و ضروری (مانند یادآوری پخش قسمت‌های جدید سریال‌ها در صورت تمایل کاربر).</li>
            </ul>
          </div>
        </section>

        {/* ۳. سرویس‌های شخص ثالث همکار */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ExternalLink className="text-[#ccff00]" size={20} />
            <span>۳. ارائه‌دهندگان خدمات شخص ثالث (Third-Party Providers)</span>
          </h2>
          <div className="space-y-3 text-sm text-neutral-300 leading-relaxed">
            <p>بینجر برای ارائه خدمات زیرساختی با شرکت‌ها و ارائه‌دهندگان معتبر زیر در تعامل است:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">پایگاه داده و احراز هویت (Supabase)</h3>
                <p className="text-xs text-neutral-400">میزبانی پایگاه داده امن PostgreSQL و زیرساخت ارسال کد تایید یک‌بار مصرف.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">اطلاعات فیلم و سریال (TMDB)</h3>
                <p className="text-xs text-neutral-400">دریافت پوسترها، اسامی بازیگران و مشخصات اپیزودها از طریق TMDB API. هیچ داده هویتی از کاربر به TMDB ارسال نمی‌شود.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">پرداخت الکترونیک (زیبال / شاپرک)</h3>
                <p className="text-xs text-neutral-400">پردازش پرداخت‌های ریالی اشتراک VIP تحت نظارت بانک مرکزی ایران.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">موتور هوش مصنوعی (Groq AI)</h3>
                <p className="text-xs text-neutral-400">پردازش متن پرامپت و حالات روحی در بخش دکتر بینجر بدون پیوست کردن هویت یا شماره موبایل کاربر.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">گیف‌های کامنت‌ها (Klipy)</h3>
                <p className="text-xs text-neutral-400">جستجوی گیف هنگام ارسال دیدگاه که صرفاً عبارت جستجو شده را دریافت می‌کند.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-white text-sm mb-1">فونت وزیرمتن (Self-Hosted)</h3>
                <p className="text-xs text-neutral-400">فونت برنامه مستقیماً از سرورهای بینجر لود می‌شود و هیچ درخواستی به سرورهای خارجی ارسال نمی‌گردد.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-400">
              <em>بینجر از هیچ اسکریپت ردیاب تبلیغاتی متفرقه نظیر فیس‌بوک پیکسل، گوگل ادز یا ترکر مخاطبان استفاده نمی‌کند.</em>
            </p>
          </div>
        </section>

        {/* ۴. امنیت، عدم فروش داده‌ها و حقوق کاربر */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Lock className="text-[#ccff00]" size={20} />
            <span>۴. امنیت اطلاعات و حقوق قانونی کاربر</span>
          </h2>
          <div className="space-y-3 text-sm text-neutral-300 leading-relaxed">
            <p>
              <strong>عدم واگذاری یا فروش داده‌ها:</strong> بینجر به هیچ عنوان شماره تماس، رفتار تماشا یا اطلاعات فردی کاربران را به شرکت‌های تبلیغاتی یا طرف‌های ثالث نمی‌فروشد و اجاره نمی‌دهد.
            </p>
            <p>
              <strong>حق دسترسی و حذف حساب کاربری:</strong> مطابق با استانداردهای حریم خصوصی، هر کاربر این حق را دارد که در هر زمان درخواست حذف کامل حساب کاربری و تمامی داده‌های ثبت‌شده مرتبط با خود (شامل لیست‌ها، تاریخچه و کامنت‌ها) را از طریق پشتیبانی ثبت نماید.
            </p>
            <p>
              <strong>رمزنگاری ارتباطات:</strong> تمامی تبادلات داده میان دستگاه کاربر و سرورهای بینجر توسط پروتکل امن SSL/TLS (رمزنگاری HTTPS) محافظت می‌شود.
            </p>
          </div>
        </section>

        {/* ۵. ارتباط با ما و پشتیبانی حریم خصوصی */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Mail className="text-[#ccff00]" size={20} />
            <span>۵. راه‌های تماس و مسئول حریم خصوصی</span>
          </h2>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-sm">
            <p className="text-neutral-300">
              در صورت داشتن هرگونه پرسش، ابهام یا درخواست پیرامون اطلاعات شخصی و حقوق حریم خصوصی، می‌توانید مستقیماً با تیم حقوقی و فنی بینجر در ارتباط باشید:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-neutral-300">
                <Mail size={14} className="text-[#ccff00]" />
                <span>ایمیل پشتیبانی: support@binger.ir</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[#ccff00] font-sans">تلگرام:</span>
                <span dir="ltr">@BingerSupport</span>
              </div>
            </div>
          </div>
        </section>

        {/* فوتر ناوبری صفحه */}
        <div className="border-t border-white/10 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors underline underline-offset-4">قوانین و مقررات</Link>
            <Link href="/cookies" className="hover:text-white transition-colors underline underline-offset-4">سیاست کوکی‌ها</Link>
          </div>
          <span>© ۲۰۲۶ پلتفرم بینجر (Binger)</span>
        </div>
      </main>
    </div>
  );
}

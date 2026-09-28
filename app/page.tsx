import React from 'react';
import { getSiteText } from '@/lib/settings';
import { verifyAdminSession } from '@/lib/adminAuth';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const [
    heroTitle,
    heroSubtitle,
    ctaText,
    footerDescription,
    footerCopyright,
    adminSession,
  ] = await Promise.all([
    getSiteText('home_hero_title', 'دستیار هوشمند خوره‌های سریال'),
    getSiteText(
      'home_hero_subtitle',
      'دیگه هرگز گم نکن کدوم اپیزود بودی! سریال‌هاتو با یک لمس تیک بزن، تقویم اختصاصی پخش داشته باش و با دستیار هوش مصنوعی دقیقاً طبق مودِ لحظه‌ات اثر بعدی رو پیدا کن.'
    ),
    getSiteText('home_cta_text', 'شروع رایگان در چند ثانیه'),
    getSiteText(
      'footer_description',
      'بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.'
    ),
    getSiteText(
      'footer_copyright',
      '© ۲۰۲۶ تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.'
    ),
    verifyAdminSession().catch(() => ({ authorized: false })),
  ]);

  const isAdmin = adminSession?.authorized === true;

  return (
    <HomePageClient
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      ctaText={ctaText}
      footerDescription={footerDescription}
      footerCopyright={footerCopyright}
      isAdmin={isAdmin}
    />
  );
}

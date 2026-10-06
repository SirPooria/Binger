import React from 'react';
import { getSiteText } from '@/lib/settings';
import { verifyAdminSession } from '@/lib/adminAuth';
import SubscriptionClient from './SubscriptionClient';

export const metadata = {
  title: 'خرید و ارتقای اشتراک VIP | بینجر Binger',
  description: 'دسترسی به آمار پیشرفته، سالنامه سینمایی Wrapped، لیست‌های نامحدود و هوش مصنوعی دکتر بینجر با اشتراک ویژه Binger VIP',
};

export default async function SubscriptionPage() {
  const [footerDesc, footerCopyright, adminSession] = await Promise.all([
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
    <SubscriptionClient
      footerDesc={footerDesc}
      footerCopyright={footerCopyright}
      isAdmin={isAdmin}
    />
  );
}
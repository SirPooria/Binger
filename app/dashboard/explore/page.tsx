import React from 'react';
import { getSiteText } from '@/lib/settings';
import { verifyAdminSession } from '@/lib/adminAuth';
import ExploreClient from './ExploreClient';

export const metadata = {
  title: 'کاوش و کشف سریال‌ها | Binger Explore',
  description: 'کاوش و کشف هوشمند محبوب‌ترین، جدیدترین و برترین سریال‌های جهان و ایران در بینجر.',
};

export default async function ExplorePage() {
  const [pageTitle, pageSubtitle, footerDesc, footerCopyright, adminSession] = await Promise.all([
    getSiteText('explore_page_title', 'کاوش و کشف هوشمند سریال‌ها'),
    getSiteText(
      'explore_page_subtitle',
      'جدیدترین، محبوب‌ترین و بهترین سریال‌های ایران و جهان به انتخاب بینجر'
    ),
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
    <ExploreClient
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      footerDesc={footerDesc}
      footerCopyright={footerCopyright}
      isAdmin={isAdmin}
    />
  );
}
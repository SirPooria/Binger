import type { Metadata } from 'next';
import VipLandingClient from './VipLandingClient';

export const metadata: Metadata = {
  title: 'اشتراک طلایی VIP | بینجر (Binger VIP)',
  description: 'ارتقای حساب کاربری به اشتراک ویژه Binger VIP. دسترسی به امکانات لوکس، نشان طلایی کاربری، نقدهای اختصاصی، سالنامه سینمایی و ساخت نامحدود لیست‌ها.',
  openGraph: {
    title: 'اشتراک طلایی VIP | بینجر (Binger VIP)',
    description: 'دسترسی نامحدود به تمامی امکانات اختصاصی، نقدهای منتقدین، نشان طلایی کاربری و آمار هوشمند تماشا در بینجر.',
    url: 'https://binger.ir/vip',
    siteName: 'Binger',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'اشتراک طلایی VIP | بینجر (Binger VIP)',
    description: 'ارتقای حساب کاربری به اشتراک ویژه Binger VIP با تخفیف سالانه و دو ماه رایگان.',
  },
};

export default function VipPage() {
  return <VipLandingClient />;
}

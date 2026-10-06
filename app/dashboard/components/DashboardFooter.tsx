"use client";

import React from 'react';
import Link from 'next/link';
import { Twitter, Instagram, Heart, Sparkles, BookOpen, Compass, Film, Feather, Crown } from 'lucide-react';
import EditableText from '@/app/components/EditableText';

export interface DashboardFooterProps {
  footerDesc?: string;
  footerCopyright?: string;
  isAdmin?: boolean;
}

export default function DashboardFooter({
  footerDesc,
  footerCopyright,
  isAdmin = false,
}: DashboardFooterProps) {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#080808]/90 backdrop-blur-xl relative z-10 font-['Vazirmatn']">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* ستون ۱: معرفی بینجر */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Logo.png" alt="Binger Logo" className="h-9 w-auto object-contain" />
              <span className="text-xl font-black text-white tracking-wide">
                Binger <span className="text-[#ccff00] text-sm font-normal">پلتفرم هوشمند سریال</span>
              </span>
            </div>

            <EditableText
              settingKey="footer_description"
              initialValue={footerDesc || 'بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.'}
              isAdmin={isAdmin}
              as="p"
              description="متن کوتاه معرفی در فوتر"
              className="text-gray-400 text-xs leading-relaxed max-w-md text-justify"
            />

            <div className="pt-2 flex items-center gap-2 text-xs text-amber-400 font-bold">
              <Crown size={14} className="animate-pulse" />
              <span>پشتیبانی VIP اختصاصی برای مشترکین ویژه</span>
            </div>
          </div>

          {/* ستون ۲: دسترسی سریع */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
              <Compass size={16} className="text-[#ccff00]" />
              <span>دسترسی سریع</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/dashboard" className="hover:text-[#ccff00] transition-colors">
                  داشبورد من
                </Link>
              </li>
              <li>
                <Link href="/dashboard/explore" className="hover:text-[#ccff00] transition-colors">
                  کاوش و کشف سریال‌ها
                </Link>
              </li>
              <li>
                <Link href="/dashboard/mood" className="hover:text-purple-400 transition-colors">
                  پیشنهاد هوشمند دکتر بینجر
                </Link>
              </li>
              <li>
                <Link href="/dashboard/subscription" className="hover:text-amber-400 transition-colors">
                  خرید و تمدید اشتراک VIP
                </Link>
              </li>
              <li>
                <Link href="/dashboard/custom-lists/explore" className="hover:text-[#ccff00] transition-colors">
                  کشف لیست‌های کاربران
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون ۳: بخش‌ها و شبکه‌های اجتماعی */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
              <BookOpen size={16} className="text-cyan-400" />
              <span>محتوا و ارتباطات</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 mb-5">
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  مجله و اخبار سینمایی
                </Link>
              </li>
              <li>
                <Link href="/dashboard/critics" className="hover:text-amber-300 transition-colors">
                  باشگاه منتقدین بینجر
                </Link>
              </li>
            </ul>

            <span className="text-[11px] font-bold text-gray-500 block mb-2">ما را دنبال کنید:</span>
            <div className="flex gap-3">
              <Link 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 bg-white/5 rounded-xl hover:bg-[#ccff00] hover:text-black text-gray-300 transition-all cursor-pointer"
                title="Twitter / X"
              >
                <Twitter size={16} />
              </Link>
              <Link 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 bg-white/5 rounded-xl hover:bg-gradient-to-tr hover:from-amber-500 hover:to-purple-600 hover:text-white text-gray-300 transition-all cursor-pointer"
                title="Instagram"
              >
                <Instagram size={16} />
              </Link>
            </div>
          </div>

        </div>

        {/* کپی رایت و نشان پایین فوتر */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <EditableText
            settingKey="footer_copyright"
            initialValue={footerCopyright || '© ۲۰۲۶ تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.'}
            isAdmin={isAdmin}
            as="p"
            description="متن کپی‌رایت انتهای صفحات"
            className="text-[11px] text-gray-500"
          />

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span>طراحی‌شده با</span>
            <Heart size={13} className="text-rose-500 fill-rose-500 animate-pulse" />
            <span>برای شیفتگان واقعی فیلم و سریال</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

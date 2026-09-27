"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Crown,
  Shield,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  MessageSquare,
  Edit3,
  MessageCircle,
  Newspaper,
  LineChart,
} from 'lucide-react';

interface AdminSidebarProps {
  userEmail?: string;
}

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const navLinks = [
    {
      name: 'داشبورد',
      labelEn: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'تحلیل عمیق',
      labelEn: 'Deep Analytics',
      href: '/admin/analytics',
      icon: LineChart,
      exact: false,
    },
    {
      name: 'مدیریت کاربران',
      labelEn: 'Users',
      href: '/admin/users',
      icon: Users,
      exact: false,
    },
    {
      name: 'مجله و بلاگ',
      labelEn: 'CMS & Blog',
      href: '/admin/cms',
      icon: Newspaper,
      exact: false,
    },
    {
      name: 'مدیریت نظرات',
      labelEn: 'Comments',
      href: '/admin/comments',
      icon: MessageCircle,
      exact: false,
    },
    {
      name: 'ویرایش محتوا',
      labelEn: 'Content Editor',
      href: '/admin/content',
      icon: Edit3,
      exact: false,
    },
    {
      name: 'لاگ پیامک‌ها',
      labelEn: 'SMS Logs',
      href: '/admin/sms',
      icon: MessageSquare,
      exact: false,
    },
    {
      name: 'مدیریت اشتراک ویژه',
      labelEn: 'VIP Management',
      href: '/admin/vip',
      icon: Crown,
      exact: false,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 sm:p-5 select-none">
      {/* Brand & Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ccff00] to-[#99cc00] flex items-center justify-center text-black shadow-lg shadow-[#ccff00]/10 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 fill-black stroke-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-wide">BINGER</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-gray-400">پنل کنترل و نظارت سیستم</p>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 px-3 uppercase">
            ناوبری اصلی
          </span>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpenMobile(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                  <span>{link.name}</span>
                </div>
                <span className={`text-[10px] font-mono ${isActive ? 'text-black/70' : 'text-gray-400'}`}>
                  {link.labelEn}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Exit */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        {/* User Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-[#ccff00]">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {userEmail || 'مدیر سیستم'}
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ccff00]" />
              سطح دسترسی: SuperAdmin
            </p>
          </div>
        </div>

        {/* Back to App */}
        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به بینجر</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Drawer Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpenMobile(true)}
            className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-white/5"
            aria-label="باز کردن منو"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-white">BINGER ADMIN</span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          <span>داشبورد</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 right-0 bottom-0 w-72 bg-[#0c0c0c] border-l border-white/10 z-50 transform transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-[#0c0c0c] border-l border-white/5 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}

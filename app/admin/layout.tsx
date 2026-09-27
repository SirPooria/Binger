import React from 'react';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/adminAuth';
import AdminSidebar from './components/AdminSidebar';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'پنل مدیریت | Binger Admin',
  description: 'سیستم جامع مدیریت و کنترل پلتفرم بینجر',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strict Server-Side Authorization Check
  const { authorized, user } = await verifyAdminSession();

  if (!authorized || !user) {
    redirect('/dashboard');
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#080808] text-white font-['Vazirmatn'] flex flex-col md:flex-row antialiased selection:bg-[#ccff00] selection:text-black">
      {/* Dark Sidebar */}
      <AdminSidebar userEmail={user.email} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-14 md:top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
            <span className="text-xs font-mono font-bold text-gray-300">
              Admin Session Active
            </span>
            <span className="hidden sm:inline-block text-gray-600">|</span>
            <span className="hidden sm:inline-block text-xs text-gray-400">
              دسترسی امن سطح ادمین
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Authorized</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { verifyAdminSession } from '@/lib/adminAuth';
import UsersTableClient, { AdminUserRecord } from './UsersTableClient';
import { Users, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'مدیریت کاربران | Binger Admin',
  description: 'فهرست و مشخصات کاربران ثبت‌شده در پلتفرم بینجر',
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const { authorized, supabase } = await verifyAdminSession();

  let users: AdminUserRecord[] = [];

  if (authorized && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, phone, role, is_vip, created_at, avatar_url')
        .order('created_at', { ascending: false });

      if (!error && data) {
        users = data as AdminUserRecord[];
      } else if (error) {
        console.error('Error querying profiles:', error);
      }
    } catch (err) {
      console.error('Unexpected error loading profiles for admin:', err);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/admin" className="hover:text-gray-300 transition">داشبورد ادمین</Link>
            <span>/</span>
            <span className="text-[#ccff00] font-medium">کاربران</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#ccff00]" />
            <span>مدیریت و فهرست کاربران</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-mono">
            Total: {users.length} Users
          </span>
        </div>
      </div>

      {/* Users Data Table with Client-Side Search and Filter */}
      <UsersTableClient initialUsers={users} />
    </div>
  );
}

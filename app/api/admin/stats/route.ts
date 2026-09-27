import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export async function GET() {
  const { authorized, supabase } = await verifyAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند.' }, { status: 403 });
  }

  try {
    const [usersRes, vipsRes, adminsRes, watchedRes, commentsRes, reactionsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_vip', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('watched').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
      supabase.from('comment_likes').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalVips: vipsRes.count || 0,
      totalAdmins: adminsRes.count || 0,
      totalWatched: watchedRes.count || 0,
      totalComments: commentsRes.count || 0,
      totalReactions: reactionsRes.count || 0,
    });
  } catch (error: unknown) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'خطا در دریافت آمار سیستم' }, { status: 500 });
  }
}

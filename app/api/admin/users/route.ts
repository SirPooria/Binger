import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { calculateSubscriptionDetails } from '@/lib/subscription';

export async function GET() {
  const { authorized, supabase } = await verifyAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند.' }, { status: 403 });
  }

  try {
    const [profilesRes, watchedRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('watched').select('user_id'),
    ]);

    const profiles = profilesRes.data || [];
    const watched = watchedRes.data || [];

    const watchedMap: Record<string, number> = {};
    watched.forEach((w) => {
      if (w.user_id) watchedMap[w.user_id] = (watchedMap[w.user_id] || 0) + 1;
    });

    const formatted = profiles.map((p) => {
      // Mask phone for general display: 0912***3456
      const rawPhone = p.phone || '';
      const maskedPhone = rawPhone.length >= 10
        ? rawPhone.slice(0, 4) + '***' + rawPhone.slice(-4)
        : rawPhone;

      const sub = calculateSubscriptionDetails(p);

      return {
        id: p.id,
        username: p.username || 'کاربر بینجر',
        avatar_url: p.avatar_url || '😎',
        role: p.role || 'user',
        is_vip: p.is_vip === true,
        created_at: p.created_at,
        phone: maskedPhone,
        watchedCount: watchedMap[p.id] || 0,
        days_remaining: sub.daysRemaining,
        formatted_days: sub.formattedDaysRemaining,
        subscription_status: sub.statusLabel,
      };
    });

    return NextResponse.json({ users: formatted });
  } catch (error: unknown) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست کاربران' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { z } from 'zod';

const ToggleRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  nextRole: z.enum(['user', 'vip', 'admin']),
});

export async function POST(request: NextRequest) {
  const { authorized, supabase } = await verifyAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = ToggleRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }

    const { targetUserId, nextRole } = parsed.data;
    const isVip = nextRole === 'vip';

    const { error } = await supabase
      .from('profiles')
      .update({
        role: nextRole,
        is_vip: isVip,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      targetUserId,
      role: nextRole,
      is_vip: isVip,
    });
  } catch (error: unknown) {
    console.error('Admin toggle role error:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی نقش کاربر' }, { status: 500 });
  }
}

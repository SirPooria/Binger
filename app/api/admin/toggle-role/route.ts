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
    const nowIso = new Date().toISOString();
    const vipUntil = isVip ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

    const updatePayload: Record<string, any> = {
      role: nextRole,
      is_vip: isVip,
      updated_at: nowIso,
      vip_until: vipUntil,
    };

    let { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId);

    if (error && error.message?.includes('vip_until')) {
      // Column vip_until does not exist in profiles table yet, update without it
      delete updatePayload.vip_until;
      const fallback = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', targetUserId);
      error = fallback.error;
    }

    if (error) throw error;

    // Also sync to auth user_metadata for client instant availability
    try {
      await supabase.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          vip_until: vipUntil,
          is_vip: isVip,
        },
      });
    } catch (authErr) {
      console.warn('Could not update auth user_metadata:', authErr);
    }

    return NextResponse.json({
      success: true,
      targetUserId,
      role: nextRole,
      is_vip: isVip,
      vip_until: vipUntil,
    });
  } catch (error: unknown) {
    console.error('Admin toggle role error:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی نقش کاربر' }, { status: 500 });
  }
}

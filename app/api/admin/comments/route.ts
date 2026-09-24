import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export async function GET() {
  const { authorized, supabase } = await verifyAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, user_id, show_id, episode_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (comments && comments.length > 0) {
      const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profMap = new Map<string, { username: string | null; avatar_url: string | null }>();
      (profiles || []).forEach((p) => {
        profMap.set(p.id, { username: p.username, avatar_url: p.avatar_url });
      });

      const formatted = comments.map((c) => ({
        ...c,
        authorName: profMap.get(c.user_id)?.username || 'کاربر بینجر',
        authorAvatar: profMap.get(c.user_id)?.avatar_url || '😎',
      }));

      return NextResponse.json({ comments: formatted });
    }

    return NextResponse.json({ comments: [] });
  } catch (error: unknown) {
    console.error('Admin comments GET error:', error);
    return NextResponse.json({ error: 'خطا در دریافت نظرات' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized, supabase } = await verifyAdminSession();
  if (!authorized) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const commentId = Number(idParam);

    if (!commentId || isNaN(commentId)) {
      return NextResponse.json({ error: 'شناسه نظر نامعتبر است' }, { status: 400 });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: commentId });
  } catch (error: unknown) {
    console.error('Admin comments DELETE error:', error);
    return NextResponse.json({ error: 'خطا در حذف نظر' }, { status: 500 });
  }
}

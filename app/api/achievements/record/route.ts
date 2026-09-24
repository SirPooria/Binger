import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const ALLOWED_EVENT_TYPES = [
  'easter_egg_found',
  'profile_shared',
  'show_shared',
  'randomizer_completed',
  'chronological_completed',
  'advocacy_click',
] as const;

const RecordEventSchema = z.object({
  eventType: z.enum(ALLOWED_EVENT_TYPES),
  showId: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'برای ثبت نشان افتخار باید وارد شوید' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RecordEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'اطلاعات رویداد نامعتبر است' }, { status: 400 });
    }

    const { eventType, showId, metadata } = parsed.data;

    // Call RPC or idempotent insert
    const { data, error } = await supabase.rpc('record_achievement_event', {
      p_event_type: eventType,
      p_show_id: showId || null,
      p_metadata: (metadata || {}) as Record<string, string>,
    });

    if (error) {
      // Fallback: direct check & insert if RPC is pending in database migration
      const { data: existing } = await supabase
        .from('achievement_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', eventType)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ success: true, recorded: false, reason: 'already_recorded' });
      }

      const { error: insertError } = await supabase
        .from('achievement_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          show_id: showId || null,
          metadata: (metadata || {}) as Record<string, string>,
        });

      if (insertError) {
        console.error('Achievement event insert error:', insertError);
        return NextResponse.json({ error: 'خطا در ثبت رویداد افتخار' }, { status: 500 });
      }

      return NextResponse.json({ success: true, recorded: true });
    }

    return NextResponse.json(data || { success: true, recorded: true });
  } catch (err: unknown) {
    console.error('Achievement record API error:', err);
    return NextResponse.json({ error: 'خطای سرور در ثبت رویداد' }, { status: 500 });
  }
}

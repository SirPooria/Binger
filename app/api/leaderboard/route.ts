import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  is_vip: boolean;
  score: number;
  rank: number;
  episodesCount: number;
  commentsCount: number;
  followersCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Attempt to call server RPC if available
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_global_leaderboard', {
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      const items: LeaderboardUser[] = rpcData.map((row) => ({
        id: row.user_id,
        username: row.username || 'کاربر بینجر',
        avatar_url: row.avatar_url || '😎',
        is_vip: Boolean(row.is_vip),
        score: Number(row.score) || 0,
        rank: Number(row.rank) || 0,
        episodesCount: Number(row.episodes_count) || 0,
        commentsCount: Number(row.comments_count) || 0,
        followersCount: Number(row.followers_count) || 0,
      }));

      // Get total users count for pagination
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const total = totalUsers || items.length;

      return NextResponse.json({
        items,
        pagination: {
          page,
          limit,
          totalUsers: total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // 2. Server-side fallback aggregation (strictly NO phone, NO email)
    const [profilesRes, watchedRes, commentsRes, followsRes] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url, is_vip, created_at'),
      supabase.from('watched').select('user_id'),
      supabase.from('comments').select('user_id'),
      supabase.from('follows').select('following_id'),
    ]);

    const profiles = profilesRes.data || [];
    const watched = watchedRes.data || [];
    const comments = commentsRes.data || [];
    const follows = followsRes.data || [];

    const watchedMap = new Map<string, number>();
    watched.forEach((w) => {
      if (w.user_id) watchedMap.set(w.user_id, (watchedMap.get(w.user_id) || 0) + 1);
    });

    const commentsMap = new Map<string, number>();
    comments.forEach((c) => {
      if (c.user_id) commentsMap.set(c.user_id, (commentsMap.get(c.user_id) || 0) + 1);
    });

    const followersMap = new Map<string, number>();
    follows.forEach((f) => {
      if (f.following_id) followersMap.set(f.following_id, (followersMap.get(f.following_id) || 0) + 1);
    });

    // Score calculation: Episode = 10 pts | Comment = 5 pts | Follower = 2 pts
    const allCalculated: LeaderboardUser[] = profiles.map((p) => {
      const eps = watchedMap.get(p.id) || 0;
      const cmts = commentsMap.get(p.id) || 0;
      const flws = followersMap.get(p.id) || 0;
      const score = (eps * 10) + (cmts * 5) + (flws * 2);

      return {
        id: p.id,
        username: p.username || 'کاربر بینجر',
        avatar_url: p.avatar_url || '😎',
        is_vip: p.is_vip === true,
        episodesCount: eps,
        commentsCount: cmts,
        followersCount: flws,
        score,
        rank: 0,
      };
    });

    // Sort by score descending
    allCalculated.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    // Assign 1-indexed ranks
    allCalculated.forEach((u, idx) => {
      u.rank = idx + 1;
    });

    const paginatedItems = allCalculated.slice(offset, offset + limit);

    let myRankData: LeaderboardUser | null = null;
    if (user) {
      myRankData = allCalculated.find((u) => u.id === user.id) || null;
    }

    return NextResponse.json({
      items: paginatedItems,
      myRankData,
      pagination: {
        page,
        limit,
        totalUsers: allCalculated.length,
        totalPages: Math.ceil(allCalculated.length / limit),
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: unknown) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری جدول امتیازات' }, { status: 500 });
  }
}

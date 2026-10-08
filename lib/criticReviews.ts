import { createClient } from '@/lib/supabase';
export * from './criticEligibility';
import {
  checkCriticEligibility,
  CRITIC_THRESHOLDS,
  CRITIC_PREFIX,
  encodeCriticReviewContent,
  decodeCriticReviewContent,
  type CriticReviewData,
  type CriticStatus,
} from './criticEligibility';

/**
 * Fetches user stats and checks critic eligibility from Supabase
 */
export async function fetchUserCriticStatus(userId: string): Promise<CriticStatus> {
  const supabase = createClient() as any;

  try {
    const [profileRes, watchedRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('is_vip, role').eq('id', userId).maybeSingle(),
      supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    const watchedCount = watchedRes.count || 0;
    const commentsCount = commentsRes.count || 0;

    return checkCriticEligibility(profile, watchedCount, commentsCount);
  } catch (err) {
    console.error('Error fetching user critic status:', err);
    return {
      isCritic: false,
      vipPassed: false,
      watchedPassed: false,
      commentsPassed: false,
      watchedCount: 0,
      commentsCount: 0,
      watchedThreshold: CRITIC_THRESHOLDS.WATCHED_EPISODES,
      commentsThreshold: CRITIC_THRESHOLDS.COMMENTS,
      watchedProgress: 0,
      commentsProgress: 0,
    };
  }
}

/**
 * Fetches all critic reviews for a specific show
 */
export async function fetchCriticReviewsForShow(showId: number | string): Promise<CriticReviewData[]> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, show_id, content, created_at')
      .eq('show_id', Number(showId))
      .is('episode_id', null)
      .like('content', `${CRITIC_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)));
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_vip, role')
        .in('id', userIds);
      profilesMap = new Map((profs || []).map((p: any) => [p.id, p]));
    }

    const reviews: CriticReviewData[] = [];

    for (const row of data) {
      const parsed = decodeCriticReviewContent(row.content);
      if (!parsed) continue;

      const profile = profilesMap.get(row.user_id);
      reviews.push({
        id: row.id,
        user_id: row.user_id,
        show_id: row.show_id,
        rating: parsed.rating,
        verdict: parsed.verdict,
        title: parsed.title,
        text: parsed.text,
        spoiler: parsed.spoiler,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          username: profile?.username || 'منتقد بینجر',
          avatar_url: profile?.avatar_url || '😎',
          is_vip: Boolean(profile?.is_vip || profile?.role === 'admin'),
          role: profile?.role,
          is_critic: true,
        },
      });
    }

    return reviews;
  } catch (err) {
    console.error('Error fetching show critic reviews:', err);
    return [];
  }
}

/**
 * Fetches all critic reviews published by a specific user
 */
export async function fetchCriticReviewsByUser(userId: string): Promise<CriticReviewData[]> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, show_id, content, created_at')
      .eq('user_id', userId)
      .is('episode_id', null)
      .like('content', `${CRITIC_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_vip, role')
      .eq('id', userId)
      .maybeSingle();

    const reviews: CriticReviewData[] = [];

    for (const row of data) {
      const parsed = decodeCriticReviewContent(row.content);
      if (!parsed) continue;

      reviews.push({
        id: row.id,
        user_id: row.user_id,
        show_id: row.show_id,
        rating: parsed.rating,
        verdict: parsed.verdict,
        title: parsed.title,
        text: parsed.text,
        spoiler: parsed.spoiler,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          username: profile?.username || 'منتقد بینجر',
          avatar_url: profile?.avatar_url || '😎',
          is_vip: Boolean(profile?.is_vip || profile?.role === 'admin'),
          role: profile?.role,
          is_critic: true,
        },
      });
    }

    return reviews;
  } catch (err) {
    console.error('Error fetching user critic reviews:', err);
    return [];
  }
}

/**
 * Fetches all recent critic reviews across the whole app
 */
export async function fetchRecentCriticReviews(limit = 20): Promise<CriticReviewData[]> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, show_id, content, created_at')
      .is('episode_id', null)
      .like('content', `${CRITIC_PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)));
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_vip, role')
        .in('id', userIds);
      profilesMap = new Map((profs || []).map((p: any) => [p.id, p]));
    }

    const reviews: CriticReviewData[] = [];

    for (const row of data) {
      const parsed = decodeCriticReviewContent(row.content);
      if (!parsed) continue;

      const profile = profilesMap.get(row.user_id);
      reviews.push({
        id: row.id,
        user_id: row.user_id,
        show_id: row.show_id,
        rating: parsed.rating,
        verdict: parsed.verdict,
        title: parsed.title,
        text: parsed.text,
        spoiler: parsed.spoiler,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          username: profile?.username || 'منتقد بینجر',
          avatar_url: profile?.avatar_url || '😎',
          is_vip: Boolean(profile?.is_vip || profile?.role === 'admin'),
          role: profile?.role,
          is_critic: true,
        },
      });
    }

    return reviews;
  } catch (err) {
    console.error('Error fetching recent critic reviews:', err);
    return [];
  }
}

/**
 * Publishes a new critic review
 */
export async function submitCriticReview(params: {
  userId: string;
  showId: number | string;
  rating: number;
  verdict: 'masterpiece' | 'recommended' | 'mixed' | 'not_recommended';
  title: string;
  text: string;
  spoiler?: boolean;
}): Promise<{ success: boolean; error?: string; review?: CriticReviewData }> {
  const supabase = createClient() as any;

  // 1. Verify Critic Eligibility
  const status = await fetchUserCriticStatus(params.userId);
  if (!status.isCritic) {
    return {
      success: false,
      error: 'شما هنوز واجد شرایط منتقد رسمی نیستید (نیاز به اشتراک VIP، بیش از ۱۰۰ نظر و بیش از ۳,۰۰۰ اپیزود تماشا شده).',
    };
  }

  // 2. Enforce one review per critic per show
  const { data: existingReviews } = await supabase
    .from('comments')
    .select('id')
    .eq('show_id', Number(params.showId))
    .eq('user_id', params.userId)
    .is('episode_id', null)
    .like('content', `${CRITIC_PREFIX}%`)
    .limit(1);

  if (existingReviews && existingReviews.length > 0) {
    return {
      success: false,
      error: 'شما قبلاً برای این سریال نقد ثبت کرده‌اید. هر منتقد فقط می‌تواند یک نقد برای هر سریال ثبت کند.',
    };
  }

  // 3. Encode Content
  const encoded = encodeCriticReviewContent({
    rating: Math.max(1, Math.min(10, params.rating)),
    verdict: params.verdict,
    title: params.title.trim(),
    text: params.text.trim(),
    spoiler: Boolean(params.spoiler),
  });

  // 3. Save into comments table with episode_id = null
  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        user_id: params.userId,
        show_id: Number(params.showId),
        episode_id: null,
        parent_id: null,
        content: encoded,
      },
    ])
    .select('id, user_id, show_id, content, created_at')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'خطا در ثبت نقد تخصصی منتقد',
    };
  }

  return {
    success: true,
    review: {
      id: data.id,
      user_id: data.user_id,
      show_id: data.show_id,
      rating: params.rating,
      verdict: params.verdict,
      title: params.title,
      text: params.text,
      spoiler: Boolean(params.spoiler),
      created_at: data.created_at,
    },
  };
}

/**
 * Deletes a critic review
 */
export async function deleteCriticReview(reviewId: number, userId: string): Promise<boolean> {
  const supabase = createClient() as any;
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Checks whether a specific user has already submitted a critic review for a show
 */
export async function hasUserReviewedShow(userId: string, showId: number | string): Promise<boolean> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id')
      .eq('show_id', Number(showId))
      .eq('user_id', userId)
      .is('episode_id', null)
      .like('content', `${CRITIC_PREFIX}%`)
      .limit(1);

    if (error || !data || data.length === 0) return false;
    return true;
  } catch (err) {
    console.error('Error checking existing user review:', err);
    return false;
  }
}

/**
 * Fetches all critic reviews for a specific movie
 */
export async function fetchCriticReviewsForMovie(movieId: number | string): Promise<CriticReviewData[]> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('movie_comments')
      .select('id, user_id, movie_id, content, created_at')
      .eq('movie_id', Number(movieId))
      .like('content', `${CRITIC_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)));
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_vip, role')
        .in('id', userIds);
      profilesMap = new Map((profs || []).map((p: any) => [p.id, p]));
    }

    const reviews: CriticReviewData[] = [];

    for (const row of data) {
      const parsed = decodeCriticReviewContent(row.content);
      if (!parsed) continue;

      const profile = profilesMap.get(row.user_id);
      reviews.push({
        id: row.id,
        user_id: row.user_id,
        show_id: row.movie_id,
        rating: parsed.rating,
        verdict: parsed.verdict,
        title: parsed.title,
        text: parsed.text,
        spoiler: parsed.spoiler,
        created_at: row.created_at,
        user: {
          id: row.user_id,
          username: profile?.username || 'منتقد بینجر',
          avatar_url: profile?.avatar_url || '😎',
          is_vip: Boolean(profile?.is_vip || profile?.role === 'admin'),
          role: profile?.role,
          is_critic: true,
        },
      });
    }

    return reviews;
  } catch (err) {
    console.error('Error fetching movie critic reviews:', err);
    return [];
  }
}

/**
 * Checks whether a user has submitted a critic review for a movie
 */
export async function hasUserReviewedMovie(userId: string, movieId: number | string): Promise<boolean> {
  const supabase = createClient() as any;

  try {
    const { data, error } = await supabase
      .from('movie_comments')
      .select('id')
      .eq('movie_id', Number(movieId))
      .eq('user_id', userId)
      .like('content', `${CRITIC_PREFIX}%`)
      .limit(1);

    if (error || !data || data.length === 0) return false;
    return true;
  } catch (err) {
    console.error('Error checking existing movie user review:', err);
    return false;
  }
}

/**
 * Submits a new critic review for a movie
 */
export async function submitMovieCriticReview(params: {
  userId: string;
  movieId: number | string;
  rating: number;
  verdict: 'masterpiece' | 'recommended' | 'mixed' | 'not_recommended';
  title: string;
  text: string;
  spoiler?: boolean;
}): Promise<{ success: boolean; error?: string; review?: CriticReviewData }> {
  const supabase = createClient() as any;

  // 1. Verify Critic Eligibility
  const status = await fetchUserCriticStatus(params.userId);
  if (!status.isCritic) {
    return {
      success: false,
      error: 'شما هنوز واجد شرایط منتقد رسمی نیستید (نیاز به اشتراک VIP، بیش از ۱۰۰ نظر و بیش از ۳,۰۰۰ اپیزود تماشا شده).',
    };
  }

  // 2. Enforce one review per critic per movie
  const hasReviewed = await hasUserReviewedMovie(params.userId, params.movieId);
  if (hasReviewed) {
    return {
      success: false,
      error: 'شما قبلاً برای این فیلم نقد ثبت کرده‌اید. هر منتقد فقط می‌تواند یک نقد برای هر فیلم ثبت کند.',
    };
  }

  // 3. Encode Content
  const encoded = encodeCriticReviewContent({
    rating: Math.max(1, Math.min(10, params.rating)),
    verdict: params.verdict,
    title: params.title.trim(),
    text: params.text.trim(),
    spoiler: Boolean(params.spoiler),
  });

  // 4. Save into movie_comments table
  const { data, error } = await supabase
    .from('movie_comments')
    .insert([
      {
        user_id: params.userId,
        movie_id: Number(params.movieId),
        content: encoded,
      },
    ])
    .select('id, user_id, movie_id, content, created_at')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'خطا در ثبت نقد تخصصی منتقد برای فیلم',
    };
  }

  return {
    success: true,
    review: {
      id: data.id,
      user_id: data.user_id,
      show_id: data.movie_id,
      rating: params.rating,
      verdict: params.verdict,
      title: params.title,
      text: params.text,
      spoiler: Boolean(params.spoiler),
      created_at: data.created_at,
    },
  };
}

/**
 * Deletes a movie critic review
 */
export async function deleteMovieCriticReview(reviewId: number, userId: string): Promise<boolean> {
  const supabase = createClient() as any;
  const { error } = await supabase
    .from('movie_comments')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);

  return !error;
}


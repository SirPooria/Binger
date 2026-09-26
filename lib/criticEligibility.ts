export interface CriticReviewData {
  id: number;
  user_id: string;
  show_id: number;
  rating: number; // 1 to 10
  verdict: 'masterpiece' | 'recommended' | 'mixed' | 'not_recommended';
  title: string;
  text: string;
  spoiler: boolean;
  created_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
    is_vip: boolean;
    role?: string;
    is_critic: boolean;
  };
}

export interface CriticStatus {
  isCritic: boolean;
  vipPassed: boolean;
  watchedPassed: boolean;
  commentsPassed: boolean;
  watchedCount: number;
  commentsCount: number;
  watchedThreshold: number;
  commentsThreshold: number;
  watchedProgress: number; // 0 to 100%
  commentsProgress: number; // 0 to 100%
}

export const CRITIC_THRESHOLDS = {
  WATCHED_EPISODES: 3000,
  COMMENTS: 100,
};

export const CRITIC_PREFIX = '__BINGER_CRITIC_REVIEW__:';

/**
 * Calculates whether a user satisfies all 3 criteria to become a Certified Critic:
 * 1. VIP Status (or Admin)
 * 2. > 100 Comments (bypassed for Admin / Dev test mode)
 * 3. > 3000 Episodes Watched (bypassed for Admin / Dev test mode)
 */
export function checkCriticEligibility(
  profile: { is_vip?: boolean | null; role?: string | null } | null | undefined,
  watchedCount: number,
  commentsCount: number
): CriticStatus {
  const isAdmin = profile?.role === 'admin';
  const hasLocalBypass = typeof window !== 'undefined' && 
    (localStorage.getItem('binger_critic_bypass') === 'true' || localStorage.getItem('binger_admin_mode') === 'true');
  const isPrivileged = isAdmin || hasLocalBypass;

  const vipPassed = Boolean(profile?.is_vip || isPrivileged);
  const watchedPassed = isPrivileged || watchedCount > CRITIC_THRESHOLDS.WATCHED_EPISODES;
  const commentsPassed = isPrivileged || commentsCount > CRITIC_THRESHOLDS.COMMENTS;
  const isCritic = isPrivileged || (vipPassed && watchedPassed && commentsPassed);

  const watchedProgress = isPrivileged ? 100 : Math.min(100, Math.round((watchedCount / CRITIC_THRESHOLDS.WATCHED_EPISODES) * 100));
  const commentsProgress = isPrivileged ? 100 : Math.min(100, Math.round((commentsCount / CRITIC_THRESHOLDS.COMMENTS) * 100));

  return {
    isCritic,
    vipPassed,
    watchedPassed,
    commentsPassed,
    watchedCount,
    commentsCount,
    watchedThreshold: CRITIC_THRESHOLDS.WATCHED_EPISODES,
    commentsThreshold: CRITIC_THRESHOLDS.COMMENTS,
    watchedProgress,
    commentsProgress,
  };
}

/**
 * Encodes review payload into content field
 */
export function encodeCriticReviewContent(payload: {
  rating: number;
  verdict: 'masterpiece' | 'recommended' | 'mixed' | 'not_recommended';
  title: string;
  text: string;
  spoiler: boolean;
}): string {
  return `${CRITIC_PREFIX}${JSON.stringify(payload)}`;
}

/**
 * Decodes review payload from content field
 */
export function decodeCriticReviewContent(content: string | null): {
  rating: number;
  verdict: 'masterpiece' | 'recommended' | 'mixed' | 'not_recommended';
  title: string;
  text: string;
  spoiler: boolean;
} | null {
  if (!content || !content.startsWith(CRITIC_PREFIX)) return null;
  try {
    const jsonStr = content.slice(CRITIC_PREFIX.length);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Checks whether a user can submit a review for a show given the existing reviews list.
 * Rules:
 * 1. User must be logged in
 * 2. User must be a certified critic
 * 3. User must NOT have an existing review for this show (strictly 1 review per critic per show)
 */
export function canUserSubmitReview(
  isCritic: boolean,
  userId: string | null | undefined,
  existingReviews: { user_id: string }[]
): { canSubmit: boolean; reason?: 'not_critic' | 'already_reviewed' | 'unauthenticated' } {
  if (!userId) {
    return { canSubmit: false, reason: 'unauthenticated' };
  }
  if (!isCritic) {
    return { canSubmit: false, reason: 'not_critic' };
  }
  const hasExisting = existingReviews.some((r) => r.user_id === userId);
  if (hasExisting) {
    return { canSubmit: false, reason: 'already_reviewed' };
  }
  return { canSubmit: true };
}


export interface AchievementBadge {
  id: string;
  title: string;
  icon: string;
  category: 'محتوا' | 'وفاداری' | 'چالشی' | 'اجتماعی';
  desc: string;
  threshold: number;
  type: string;
}

export interface AchievementUserStats {
  watchedRows: Array<{ show_id: number; episode_id?: number | null; created_at: string }>;
  watchedShows?: Array<{
    id: number;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    progress?: number;
    number_of_seasons?: number;
    genres?: Array<{ id: number; name?: string }>;
    status?: string;
    first_air_date?: string;
  }>;
  comments: Array<{ id: number; show_id: number | null; episode_id?: number | null; parent_id?: number | null; created_at: string }>;
  followingIds: string[];
  followerIds: string[];
  favoriteIds: number[];
  episodeRatings?: Array<{ rating: number; episode_id?: number; show_id?: number }>;
  commentLikeCount?: number;
  savedListCount?: number;
  eventTypes: string[];
  totalEpisodes?: number;
  followersCount?: number;
  followingCount?: number;
  commentsCount?: number;
  accountCreatedAt?: string;
}

export interface BadgeProgressResult {
  current: number;
  threshold: number;
  isUnlocked: boolean;
  progressPercent: number;
  percentage: number;
}

export const ALL_ACHIEVEMENTS: AchievementBadge[] = [
  // ۱. تعامل با محتوا و محصول
  { id: 'pilot_tester', title: 'The Pilot Tester', icon: '🧪', category: 'محتوا', desc: 'تماشای قسمت اول (پایلوت) از ۵ سریال مختلف بدون دراپ کردن.', threshold: 5, type: 'pilot' },
  { id: 'seasoned_finisher', title: 'Seasoned Finisher', icon: '🏁', category: 'محتوا', desc: 'تمام کردن کامل یک سریال که حداقل ۵ فصل دارد.', threshold: 1, type: 'completed_long' },
  { id: 'genre_nomad', title: 'Genre Nomad', icon: '🧭', category: 'محتوا', desc: 'ثبت تماشای سریال در ۵ ژانر کاملاً متفاوت در یک ماه.', threshold: 5, type: 'genres' },
  { id: 'the_perfectionist', title: 'The Perfectionist', icon: '⭐', category: 'محتوا', desc: 'امتیاز دادن به تک‌تک اپیزودهای یک فصل کامل.', threshold: 1, type: 'rated_season' },
  { id: 'early_adopter', title: 'Early Adopter', icon: '⚡', category: 'محتوا', desc: 'ثبت و نقد یک سریال جدید در ۴۸ ساعت اول انتشار جهانی آن.', threshold: 1, type: 'early_review' },
  { id: 'binge_pioneer', title: 'Binge Pioneer', icon: '⛏️', category: 'محتوا', desc: 'اضافه کردن سریالی به لیست تماشا که کمتر از ۱۰۰ نفر آن را می‌بینند.', threshold: 1, type: 'niche_show' },
  { id: 'cinematic_marathon', title: 'Cinematic Marathon', icon: '🏃', category: 'محتوا', desc: 'تماشای ۵ اپیزود از یک سریال در کمتر از ۲۴ ساعت.', threshold: 5, type: 'marathon' },
  { id: 'the_reviver', title: 'The Reviver', icon: '🔄', category: 'محتوا', desc: 'از سرگیری سریالی که بیش از ۶ ماه رها شده بوده است.', threshold: 1, type: 'revived' },

  // ۲. وفاداری و بازگشت کاربر
  { id: 'weekend_warrior', title: 'Weekend Warrior', icon: '⚔️', category: 'وفاداری', desc: 'ثبت تماشای حداقل یک اپیزود در ۴ آخر هفته متوالی.', threshold: 4, type: 'weekend' },
  { id: 'streak_7days', title: '7-Day Streak', icon: '🔥', category: 'وفاداری', desc: 'ثبت تماشا یا فعالیت در اپلیکیشن برای ۷ روز پشت سر هم.', threshold: 7, type: 'streak' },
  { id: 'night_owl', title: 'Night Owl', icon: '🦉', category: 'وفاداری', desc: 'ثبت تماشای ۵ اپیزود در بازه زمانی ۱۲ شب تا ۴ صبح.', threshold: 5, type: 'night_owl' },
  { id: 'monthly_ritual', title: 'Monthly Ritual', icon: '📅', category: 'وفاداری', desc: 'داشتن حداقل یک ثبت تماشا در هر ماه برای ۶ ماه متوالی.', threshold: 6, type: 'monthly' },
  { id: 'season_premiere_tracker', title: 'Season Premiere Tracker', icon: '🎯', category: 'وفاداری', desc: 'ثبت تماشای اولین اپیزود از فصل جدید سریال در ۲۴ ساعت اول.', threshold: 1, type: 'premiere' },
  { id: 'consistent_critic', title: 'Consistent Critic', icon: '✍️', category: 'وفاداری', desc: 'ثبت حداقل یک نقد یا کامنت در ۳ هفته پیاپی.', threshold: 3, type: 'critic_streak' },
  { id: 'morning_bird', title: 'Morning Bird', icon: '🌅', category: 'وفاداری', desc: 'ثبت تماشا بین ساعت ۵ تا ۸ صبح.', threshold: 1, type: 'morning_bird' },
  { id: 'loyal_viewer', title: 'The Loyal Viewer', icon: '🛡️', category: 'وفاداری', desc: 'تماشای یک سریال در حال پخش تا پایان فصل بدون وقفه طولانی.', threshold: 1, type: 'loyal' },
  { id: 'one_year_club', title: 'One Year Club', icon: '🎂', category: 'وفاداری', desc: 'عضویت و فعالیت مستمر به مدت ۵۲ هفته (یک سال تمام).', threshold: 365, type: 'account_age' },

  // ۳. گیمیفیکیشن و چالش‌های خاص
  { id: 'chronological_master', title: 'Chronological Master', icon: '⏳', category: 'چالشی', desc: 'تماشای آثار یک دنیای سینمایی بر اساس خط زمانی داستان.', threshold: 1, type: 'chronological' },
  { id: 'the_randomizer', title: 'The Randomizer', icon: '🎲', category: 'چالشی', desc: 'انتخاب یک عنوان تصادفی از آثار برتر (IMDb Top 250) و تماشای کامل آن.', threshold: 1, type: 'randomizer' },
  { id: 'top_1_percent', title: 'Top 1% Fan', icon: '🥇', category: 'چالشی', desc: 'قرار گرفتن جزو ۱ درصد سریع‌ترین کاربران در به پایان رساندن یک سریال.', threshold: 1, type: 'top_speed' },
  { id: 'trendsetter', title: 'Trendsetter', icon: '💎', category: 'چالشی', desc: 'نوشتن نقدی که بیش از ۲۰ لایک از دیگران دریافت کند.', threshold: 20, type: 'review_likes' },
  { id: 'easter_egg_hunter', title: 'Easter Egg Hunter', icon: '🥚', category: 'چالشی', desc: 'پیدا کردن یک ویژگی پنهان یا ایستر اگ در محیط اپلیکیشن.', threshold: 1, type: 'easter_egg' },
  { id: 'cult_leader', title: 'Cult Leader', icon: '🔮', category: 'چالشی', desc: '۵ فالوور سریالی را شروع کنند که شما به تازگی نقد کرده‌اید.', threshold: 5, type: 'cult' },
  { id: 'the_advocate', title: 'The Advocate', icon: '📢', category: 'چالشی', desc: 'به اشتراک‌گذاری پروفایل یا لیست تماشای بینجر در شبکه‌های اجتماعی.', threshold: 1, type: 'advocate' },
  { id: 'badge_of_honor', title: 'Badge of Honor', icon: '🎖️', category: 'چالشی', desc: 'دریافت تایید و ریپلای مثبت از یک کاربر سطح بالا در پلتفرم.', threshold: 1, type: 'honor' },

  // ۴. اثر شبکه‌ای و اجتماعی
  { id: 'matchmaker', title: 'Matchmaker', icon: '💞', category: 'اجتماعی', desc: 'افزودن همزمان یک سریال به لیست محبوب‌ها با کاربری که فالو دارید.', threshold: 1, type: 'matchmaker' },
  { id: 'first_follower', title: 'The First Follower', icon: '🤝', category: 'اجتماعی', desc: 'فالو کردن کاربری که دقیقاً همان روز در اپلیکیشن ثبت‌نام کرده است.', threshold: 1, type: 'first_follower' },
  { id: 'echo_chamber', title: 'Echo Chamber', icon: '🔊', category: 'اجتماعی', desc: 'تماشای سریالی توسط ۳ نفر از فالوورهایتان که به آن ۵ ستاره داده‌اید.', threshold: 3, type: 'echo' },
  { id: 'the_debater', title: 'The Debater', icon: '💬', category: 'اجتماعی', desc: 'شرکت در یک رشته کامنت با حداقل ۵ رفت‌وبرگشت بحث.', threshold: 5, type: 'debater' },
  { id: 'conversation_starter', title: 'Conversation Starter', icon: '💡', category: 'اجتماعی', desc: 'نوشتن نقدی که حداقل ۱۰ کامنت متفاوت دریافت کند.', threshold: 10, type: 'starter' },
  { id: 'squad_goals', title: 'Squad Goals', icon: '👥', category: 'اجتماعی', desc: 'ساختن یک لیست سفارشی که توسط ۵ کاربر دیگر ذخیره شود.', threshold: 5, type: 'squad' },
  { id: 'mutual_trust', title: 'Mutual Trust', icon: '🤲', category: 'اجتماعی', desc: 'فالو کردن متقابل با ۲۰ کاربر مختلف (دریافت ۲۰ فالوبک).', threshold: 20, type: 'mutual' },
  { id: 'the_scout', title: 'The Scout', icon: '🔭', category: 'اجتماعی', desc: 'معرفی زودهنگام سریالی که بعدها بین فالوورهایتان ترند شود.', threshold: 1, type: 'scout' },
  { id: 'community_pillar', title: 'Community Pillar', icon: '🏛️', category: 'اجتماعی', desc: 'رسیدن به ۱۰۰ فالوور واقعی به همراه ثبت حداقل ۵۰ نقد ارزشمند.', threshold: 100, type: 'pillar' },
  { id: 'viral_critic', title: 'Viral Critic', icon: '🚀', category: 'اجتماعی', desc: 'کلیک خوردن لینک نقد شما در خارج از اپلیکیشن بینجر.', threshold: 1, type: 'viral' },
];

export function getBadgeProgress(
  badge: AchievementBadge,
  stats: AchievementUserStats,
  userCreatedAt?: string | null
): BadgeProgressResult {
  let current = 0;
  const watchedRows = stats.watchedRows || [];
  const watchedDates = watchedRows
    .map((row) => new Date(row.created_at))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const uniqueDateKeys = Array.from(new Set(watchedDates.map(dateKey)));

  const longestConsecutiveRun = (keys: string[]) => {
    let longest = 0;
    let currentRun = 0;
    let previousTime = 0;
    keys.sort().forEach((key) => {
      const currentTime = new Date(`${key}T00:00:00Z`).getTime();
      if (currentTime - previousTime === 24 * 60 * 60 * 1000) currentRun += 1;
      else currentRun = 1;
      previousTime = currentTime;
      longest = Math.max(longest, currentRun);
    });
    return longest;
  };

  const longestConsecutiveNumbers = (values: number[]) => {
    const sortedValues = Array.from(new Set(values)).sort((a, b) => a - b);
    let longest = 0;
    let currentRun = 0;
    let previousValue: number | null = null;
    sortedValues.forEach((value) => {
      currentRun = previousValue !== null && value === previousValue + 1 ? currentRun + 1 : 1;
      previousValue = value;
      longest = Math.max(longest, currentRun);
    });
    return longest;
  };

  const watchedShows = stats.watchedShows || [];
  const totalEps = stats.totalEpisodes || watchedRows.length;

  switch (badge.type) {
    case 'pilot':
      current = watchedShows.length || new Set(watchedRows.map((r) => r.show_id)).size;
      break;

    case 'completed_long':
      current = watchedShows.filter((s) => (s.number_of_seasons || 1) >= 5 && (s.progress || 0) >= 100).length;
      break;

    case 'genres':
      current = new Set(watchedShows.flatMap((s) => (s.genres || []).map((g) => g.id))).size;
      break;

    case 'rated_season':
      current = (stats.episodeRatings?.length || 0) >= 10 ? 1 : 0;
      break;

    case 'early_review':
      current = (stats.comments || []).some((c) => {
        const show = watchedShows.find((s) => s.id === c.show_id);
        if (!show?.first_air_date || !c.created_at) return false;
        return new Date(c.created_at).getTime() - new Date(show.first_air_date).getTime() <= 48 * 60 * 60 * 1000;
      }) ? 1 : 0;
      break;

    case 'night_owl': {
      const nightWatched = watchedDates.filter((d) => {
        const hour = d.getHours();
        return hour >= 0 && hour < 4;
      }).length;
      current = nightWatched;
      break;
    }

    case 'morning_bird': {
      const morningWatched = watchedDates.filter((d) => {
        const hour = d.getHours();
        return hour >= 5 && hour < 8;
      }).length;
      current = morningWatched > 0 ? 1 : 0;
      break;
    }

    case 'marathon': {
      let maxMarathon = 0;
      const watchedByShow = new Map<number, number[]>();
      watchedRows.forEach((r) => {
        const times = watchedByShow.get(r.show_id) || [];
        times.push(new Date(r.created_at).getTime());
        watchedByShow.set(r.show_id, times);
      });
      watchedByShow.forEach((times) => {
        times.sort((a, b) => a - b);
        for (let i = 0; i < times.length; i++) {
          const countWithin24h = times.filter((t) => t >= times[i] && t - times[i] <= 24 * 60 * 60 * 1000).length;
          maxMarathon = Math.max(maxMarathon, countWithin24h);
        }
      });
      current = maxMarathon;
      break;
    }

    case 'easter_egg':
      current = (stats.eventTypes || []).includes('easter_egg_found') ? 1 : 0;
      break;

    case 'account_age': {
      const createdAt = userCreatedAt ? new Date(userCreatedAt).getTime() : Date.now();
      current = Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));
      break;
    }

    case 'weekend': {
      const weekendWeeks = watchedDates
        .filter((d) => [5, 6].includes(d.getDay()))
        .map((d) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()) / (7 * 24 * 60 * 60 * 1000)));
      current = longestConsecutiveNumbers(weekendWeeks);
      break;
    }

    case 'streak':
      current = longestConsecutiveRun(uniqueDateKeys);
      break;

    case 'monthly': {
      const monthIndexes = watchedDates.map((d) => d.getUTCFullYear() * 12 + d.getUTCMonth());
      current = longestConsecutiveNumbers(monthIndexes);
      break;
    }

    case 'loyal':
      current = watchedShows.filter((s) => (s.progress || 0) >= 100 && ['Returning Series', 'Ended', 'Canceled'].includes(s.status || '')).length;
      break;

    case 'advocate':
      current = (stats.eventTypes || []).some((e) => ['profile_shared', 'show_shared', 'advocacy_click'].includes(e)) ? 1 : 0;
      break;

    case 'pillar': {
      const fCount = stats.followersCount || stats.followerIds?.length || 0;
      const cCount = stats.commentsCount || stats.comments?.length || 0;
      current = Math.min(fCount, cCount);
      break;
    }

    case 'mutual':
      current = (stats.followingIds || []).filter((id) => (stats.followerIds || []).includes(id)).length;
      break;

    case 'debater':
    case 'starter':
      current = (stats.comments || []).filter((c) => c.parent_id !== null).length;
      break;

    case 'critic_streak': {
      const commentWeeks = Array.from(new Set((stats.comments || []).map((c) => {
        const d = new Date(c.created_at);
        const firstDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()));
        return firstDay.toISOString().slice(0, 10);
      })));
      current = longestConsecutiveRun(commentWeeks);
      break;
    }

    case 'review_likes':
      current = stats.commentLikeCount || 0;
      break;

    case 'squad':
      current = stats.savedListCount || 0;
      break;

    case 'matchmaker':
      current = stats.favoriteIds?.length ? Math.min(badge.threshold, stats.favoriteIds.length) : 0;
      break;

    case 'chronological':
      current = (stats.eventTypes || []).includes('chronological_completed') ? 1 : 0;
      break;

    case 'randomizer':
      current = (stats.eventTypes || []).includes('randomizer_completed') ? 1 : 0;
      break;

    default:
      current = totalEps >= badge.threshold ? badge.threshold : 0;
      break;
  }

  const isUnlocked = current >= badge.threshold;
  const progressPercent = Math.min(100, Math.round((current / badge.threshold) * 100));

  return {
    current,
    threshold: badge.threshold,
    isUnlocked,
    progressPercent,
    percentage: progressPercent,
  };
}

export const calculateBadgeProgress = getBadgeProgress;
export interface SubscriptionProfileInput {
  is_vip?: boolean | null;
  role?: string | null;
  vip_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: {
    vip_until?: string | null;
    subscription_plan?: string | null;
    [key: string]: any;
  } | null;
}

export interface SubscriptionStatus {
  isVip: boolean;
  isLifetime: boolean;
  isActive: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysRemaining: number;
  totalDays: number;
  percentRemaining: number;
  expirationDate: Date | null;
  formattedExpiration: string;
  formattedDaysRemaining: string;
  statusLabel: string;
  badgeText: string;
  badgeColor: 'gold' | 'warning' | 'expired' | 'free';
}

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianDigits(n: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

/**
 * فرمت تاریخ به تقویم شمسی جلالی
 */
export function formatPersianDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('fa-IR');
  }
}

/**
 * محاسبه وضعیت اشتراک ماهانه، روزهای باقی‌مانده و تاریخ انقضا
 */
export function calculateSubscriptionDetails(
  profile?: SubscriptionProfileInput | null,
  referenceNow: Date = new Date()
): SubscriptionStatus {
  const now = referenceNow.getTime();

  // ۱. بررسی نقش مدیر سیستم (اشتراک دائمی نامحدود)
  if (profile?.role === 'admin') {
    return {
      isVip: true,
      isLifetime: true,
      isActive: true,
      isExpiringSoon: false,
      isExpired: false,
      daysRemaining: 999,
      totalDays: 30,
      percentRemaining: 100,
      expirationDate: null,
      formattedExpiration: 'دائمی (بدون انقضا)',
      formattedDaysRemaining: 'نامحدود',
      statusLabel: 'اشتراک دائمی مدیر سیستم',
      badgeText: 'VIP دائمی 👑',
      badgeColor: 'gold',
    };
  }

  // ۲. بررسی وجود تاریخ انقضای صریح (از vip_until در پروفایل یا متادیتای کاربر)
  const explicitVipUntilStr = profile?.vip_until || profile?.user_metadata?.vip_until;
  if (explicitVipUntilStr) {
    const expiryDate = new Date(explicitVipUntilStr);
    const expiryTime = expiryDate.getTime();

    if (!isNaN(expiryTime)) {
      const remainingMs = expiryTime - now;
      const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
      const isActive = daysRemaining > 0;
      const isExpiringSoon = isActive && daysRemaining <= 5;
      const isExpired = !isActive;
      const percentRemaining = Math.min(100, Math.max(0, Math.round((daysRemaining / 30) * 100)));

      return {
        isVip: isActive,
        isLifetime: false,
        isActive,
        isExpiringSoon,
        isExpired,
        daysRemaining,
        totalDays: 30,
        percentRemaining,
        expirationDate: expiryDate,
        formattedExpiration: formatPersianDate(expiryDate),
        formattedDaysRemaining: `${toPersianDigits(daysRemaining)} روز`,
        statusLabel: isActive
          ? (isExpiringSoon ? 'اشتراک ماهانه رو به اتمام' : 'اشتراک ماهانه فعال')
          : 'اشتراک ماهانه منقضی شده',
        badgeText: isActive
          ? `${toPersianDigits(daysRemaining)} روز مانده`
          : 'منقضی شده',
        badgeColor: isActive ? (isExpiringSoon ? 'warning' : 'gold') : 'expired',
      };
    }
  }

  // ۳. کاربر علامت VIP دارد اما هنوز فیلد vip_until برایش در دیتابیس ست نشده (پلن ماهانه ۳۰ روزه)
  if (profile?.is_vip === true) {
    const cycleStartDate = profile.updated_at
      ? new Date(profile.updated_at)
      : profile.created_at
        ? new Date(profile.created_at)
        : new Date(now);

    const startTime = !isNaN(cycleStartDate.getTime()) ? cycleStartDate.getTime() : now;
    const initialExpiryTime = startTime + 30 * 24 * 60 * 60 * 1000;

    let expiryDate: Date;
    let daysRemaining: number;

    if (initialExpiryTime > now) {
      // در بازه اولیه ۳۰ روز از آخرین بروزرسانی / فعال‌سازی هستیم
      expiryDate = new Date(initialExpiryTime);
      daysRemaining = Math.max(1, Math.ceil((initialExpiryTime - now) / (1000 * 60 * 60 * 24)));
    } else {
      // اگر از ۳۰ روز گذشته ولی هنوز is_vip فعال است، سیکل ماهانه ۳۰ روزه چرخان را محاسبه می‌کنیم
      const msSinceStart = now - startTime;
      const cycleLengthMs = 30 * 24 * 60 * 60 * 1000;
      const currentCycleOffset = msSinceStart % cycleLengthMs;
      const msLeftInCycle = cycleLengthMs - currentCycleOffset;
      daysRemaining = Math.max(1, Math.ceil(msLeftInCycle / (1000 * 60 * 60 * 24)));
      expiryDate = new Date(now + msLeftInCycle);
    }

    const isExpiringSoon = daysRemaining <= 5;
    const percentRemaining = Math.min(100, Math.max(0, Math.round((daysRemaining / 30) * 100)));

    return {
      isVip: true,
      isLifetime: false,
      isActive: true,
      isExpiringSoon,
      isExpired: false,
      daysRemaining,
      totalDays: 30,
      percentRemaining,
      expirationDate: expiryDate,
      formattedExpiration: formatPersianDate(expiryDate),
      formattedDaysRemaining: `${toPersianDigits(daysRemaining)} روز`,
      statusLabel: isExpiringSoon ? 'اشتراک ماهانه رو به اتمام' : 'اشتراک ماهانه فعال',
      badgeText: `${toPersianDigits(daysRemaining)} روز مانده`,
      badgeColor: isExpiringSoon ? 'warning' : 'gold',
    };
  }

  // ۴. کاربر رایگان (Free)
  return {
    isVip: false,
    isLifetime: false,
    isActive: false,
    isExpiringSoon: false,
    isExpired: false,
    daysRemaining: 0,
    totalDays: 30,
    percentRemaining: 0,
    expirationDate: null,
    formattedExpiration: 'ندارد',
    formattedDaysRemaining: '۰ روز',
    statusLabel: 'حساب کاربری عادی',
    badgeText: 'ارتقا به VIP ✨',
    badgeColor: 'free',
  };
}

import React from 'react';
import { BadgeCheck, Feather, Award } from 'lucide-react';

export function VipCheckmark({ 
  size = 14, 
  className = "" 
}: { 
  size?: number; 
  className?: string; 
}) {
  return (
    <span 
      title="کاربر تایید شده VIP" 
      className={`inline-flex items-center justify-center shrink-0 text-sky-400 ${className}`}
    >
      <BadgeCheck 
        size={size} 
        className="fill-sky-400 text-black drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" 
      />
    </span>
  );
}

export function CriticBadge({
  size = 'sm',
  showLabel = true,
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  }[size];

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 13,
    lg: 16,
  }[size];

  return (
    <span
      title="منتقد رسمی بینجر (کاربر VIP با بیش از ۳,۰۰۰ اپیزود تماشا شده و بیش از ۱۰۰ نظر تخصصی)"
      className={`inline-flex items-center font-black rounded-full select-none shrink-0 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:border-amber-300 hover:shadow-[0_0_16px_rgba(245,158,11,0.4)] transition-all ${sizeClasses} ${className}`}
    >
      <Feather size={iconSizes} className="text-amber-400 fill-amber-400/40" />
      {showLabel && <span>منتقد رسمی</span>}
    </span>
  );
}

export interface VipUsernameProps {
  username?: string | null;
  isVip?: boolean | null;
  isCritic?: boolean | null;
  showCriticBadge?: boolean;
  className?: string;
  badgeSize?: number;
  children?: React.ReactNode;
}

export function VipUsername({
  username,
  isVip = false,
  isCritic = false,
  showCriticBadge = true,
  className = "",
  badgeSize = 14,
  children,
}: VipUsernameProps) {
  const isUserVip = Boolean(isVip);
  const isUserCritic = Boolean(isCritic);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold transition-colors ${
        isUserVip
          ? 'text-amber-400 drop-shadow-[0_1px_10px_rgba(251,191,36,0.35)]'
          : ''
      } ${className}`}
    >
      <span className="truncate">{username || children || 'کاربر بینجر'}</span>
      {isUserVip && <VipCheckmark size={badgeSize} />}
      {isUserCritic && showCriticBadge && (
        <CriticBadge size="xs" showLabel={false} />
      )}
    </span>
  );
}

export default VipUsername;

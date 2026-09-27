import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubscriptionDetails,
  toPersianDigits,
  formatPersianDate
} from '../../lib/subscription.ts';

test('Subscription - Persian digit conversion', () => {
  assert.equal(toPersianDigits(1234567890), '۱۲۳۴۵۶۷۸۹۰');
  assert.equal(toPersianDigits('24 روز'), '۲۴ روز');
});

test('Subscription - Admin user is lifetime unlimited', () => {
  const status = calculateSubscriptionDetails({
    role: 'admin',
    is_vip: true,
  });

  assert.equal(status.isLifetime, true);
  assert.equal(status.isActive, true);
  assert.equal(status.isVip, true);
  assert.equal(status.daysRemaining, 999);
  assert.equal(status.formattedExpiration, 'دائمی (بدون انقضا)');
  assert.equal(status.statusLabel, 'اشتراک دائمی مدیر سیستم');
});

test('Subscription - Explicit vip_until future date', () => {
  const referenceNow = new Date('2026-09-27T12:00:00Z');
  const vipUntil = new Date('2026-10-12T12:00:00Z').toISOString(); // 15 days later

  const status = calculateSubscriptionDetails(
    {
      role: 'user',
      is_vip: true,
      vip_until: vipUntil,
    },
    referenceNow
  );

  assert.equal(status.isActive, true);
  assert.equal(status.isLifetime, false);
  assert.equal(status.daysRemaining, 15);
  assert.equal(status.formattedDaysRemaining, '۱۵ روز');
  assert.equal(status.isExpiringSoon, false);
  assert.equal(status.isExpired, false);
});

test('Subscription - Expiring soon when daysRemaining <= 5', () => {
  const referenceNow = new Date('2026-09-27T12:00:00Z');
  const vipUntil = new Date('2026-09-30T12:00:00Z').toISOString(); // 3 days later

  const status = calculateSubscriptionDetails(
    {
      role: 'user',
      is_vip: true,
      vip_until: vipUntil,
    },
    referenceNow
  );

  assert.equal(status.isActive, true);
  assert.equal(status.daysRemaining, 3);
  assert.equal(status.isExpiringSoon, true);
  assert.equal(status.badgeColor, 'warning');
});

test('Subscription - Expired subscription when vip_until is in the past', () => {
  const referenceNow = new Date('2026-09-27T12:00:00Z');
  const vipUntil = new Date('2026-09-20T12:00:00Z').toISOString(); // 7 days ago

  const status = calculateSubscriptionDetails(
    {
      role: 'user',
      is_vip: false,
      vip_until: vipUntil,
    },
    referenceNow
  );

  assert.equal(status.isActive, false);
  assert.equal(status.isExpired, true);
  assert.equal(status.daysRemaining, 0);
  assert.equal(status.badgeColor, 'expired');
});

test('Subscription - Monthly plan fallback from created_at / updated_at', () => {
  const referenceNow = new Date('2026-09-27T12:00:00Z');
  const createdAt = new Date('2026-09-20T12:00:00Z').toISOString(); // 7 days ago

  const status = calculateSubscriptionDetails(
    {
      role: 'user',
      is_vip: true,
      created_at: createdAt,
    },
    referenceNow
  );

  assert.equal(status.isActive, true);
  assert.equal(status.isVip, true);
  // 30 days from Sept 20 is Oct 20. Diff from Sept 27 is 23 days.
  assert.equal(status.daysRemaining, 23);
  assert.equal(status.formattedDaysRemaining, '۲۳ روز');
});

test('Subscription - Free standard user', () => {
  const status = calculateSubscriptionDetails({
    role: 'user',
    is_vip: false,
  });

  assert.equal(status.isActive, false);
  assert.equal(status.isVip, false);
  assert.equal(status.daysRemaining, 0);
  assert.equal(status.badgeColor, 'free');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ACHIEVEMENTS, calculateBadgeProgress } from '../../lib/achievements.ts';

test('Achievements - 35 canonical badges defined', () => {
  assert.equal(ALL_ACHIEVEMENTS.length, 35);
  // Unique badge IDs
  const ids = new Set(ALL_ACHIEVEMENTS.map((b) => b.id));
  assert.equal(ids.size, 35);
});

test('Achievements - Progress for episode threshold badges', () => {
  const badge = ALL_ACHIEVEMENTS.find((b) => b.id === 'cinematic_marathon')!;
  assert.ok(badge);
  assert.equal(badge.threshold, 5);

  // 3 episodes within 24h
  const now = Date.now();
  const partialStats = {
    watchedRows: [
      { show_id: 100, created_at: new Date(now).toISOString() },
      { show_id: 100, created_at: new Date(now + 3600000).toISOString() },
      { show_id: 100, created_at: new Date(now + 7200000).toISOString() },
    ],
    comments: [],
    followingIds: [],
    followerIds: [],
    favoriteIds: [],
    eventTypes: [],
  };

  const progress = calculateBadgeProgress(badge, partialStats);
  assert.equal(progress.current, 3);
  assert.equal(progress.isUnlocked, false);
  assert.equal(progress.progressPercent, 60);

  // 5 episodes within 24h -> Unlocked
  const fullStats = {
    ...partialStats,
    watchedRows: [
      ...partialStats.watchedRows,
      { show_id: 100, created_at: new Date(now + 10800000).toISOString() },
      { show_id: 100, created_at: new Date(now + 14400000).toISOString() },
    ],
  };

  const fullProgress = calculateBadgeProgress(badge, fullStats);
  assert.equal(fullProgress.current, 5);
  assert.equal(fullProgress.isUnlocked, true);
  assert.equal(fullProgress.progressPercent, 100);
});

test('Achievements - Night owl badge calculation', () => {
  const badge = ALL_ACHIEVEMENTS.find((b) => b.id === 'night_owl')!;
  assert.ok(badge);
  assert.equal(badge.threshold, 5);

  const nightDate = new Date();
  nightDate.setHours(2, 30, 0, 0); // 02:30 AM is between 00:00 and 04:00

  // 5 night episodes
  const stats = {
    watchedRows: [
      { show_id: 1, created_at: new Date(nightDate.getTime()).toISOString() },
      { show_id: 1, created_at: new Date(nightDate.getTime() + 1000).toISOString() },
      { show_id: 1, created_at: new Date(nightDate.getTime() + 2000).toISOString() },
      { show_id: 1, created_at: new Date(nightDate.getTime() + 3000).toISOString() },
      { show_id: 1, created_at: new Date(nightDate.getTime() + 4000).toISOString() },
    ],
    comments: [],
    followingIds: [],
    followerIds: [],
    favoriteIds: [],
    eventTypes: [],
  };

  const progress = calculateBadgeProgress(badge, stats);
  assert.equal(progress.current, 5);
  assert.equal(progress.isUnlocked, true);
});

test('Achievements - Easter egg badge unlocked via eventTypes', () => {
  const badge = ALL_ACHIEVEMENTS.find((b) => b.id === 'easter_egg_hunter')!;
  assert.ok(badge);

  const withoutEvent = {
    watchedRows: [],
    comments: [],
    followingIds: [],
    followerIds: [],
    favoriteIds: [],
    eventTypes: [],
  };
  assert.equal(calculateBadgeProgress(badge, withoutEvent).isUnlocked, false);

  const withEvent = {
    ...withoutEvent,
    eventTypes: ['easter_egg_found'],
  };
  assert.equal(calculateBadgeProgress(badge, withEvent).isUnlocked, true);
});

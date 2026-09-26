import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FAVORITES, canAddToFavorites, sanitizeFavoritesList } from '../../lib/favoritesLimit.ts';

test('Favorites Limit - Constant is strictly 10', () => {
  assert.equal(MAX_FAVORITES, 10, 'Maximum favorites allowed must be exactly 10');
});

test('Favorites Limit - Allows adding when count is less than 10', () => {
  assert.equal(canAddToFavorites(0), true);
  assert.equal(canAddToFavorites(5), true);
  assert.equal(canAddToFavorites(9), true);
});

test('Favorites Limit - Blocks adding when count is 10 or more', () => {
  assert.equal(canAddToFavorites(10), false, 'Should block adding 11th show');
  assert.equal(canAddToFavorites(11), false, 'Should block adding beyond 10');
});

test('Favorites Limit - sanitizeFavoritesList enforces slice of at most 10 items', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const sanitized = sanitizeFavoritesList(ids);
  assert.equal(sanitized.length, 10);
  assert.deepEqual(sanitized, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

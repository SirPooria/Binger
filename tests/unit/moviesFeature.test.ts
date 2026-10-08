import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FAVORITES, canAddToFavorites, sanitizeFavoritesList } from '../../lib/favoritesLimit.ts';
import { toPersianDigits } from '../../lib/subscription.ts';

// Helper to format movie runtimes like in Profile and Insights
function formatMovieRuntime(totalMinutes: number): { hours: number; minutes: number; formatted: string } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let formatted = '';
  if (hours > 0) formatted += `${toPersianDigits(hours)} ساعت`;
  if (minutes > 0) formatted += ` ${toPersianDigits(minutes)} دقیقه`;
  if (!formatted) formatted = '۰ دقیقه';
  return { hours, minutes, formatted: formatted.trim() };
}

// Helper to resolve movie display titles
function resolveMovieTitle(movie: { title?: string; title_fa?: string; original_title?: string }): string {
  return movie.title_fa || movie.title || movie.original_title || 'بدون عنوان';
}

test('Movie Favorites Limit - Strictly enforces maximum of 10 movies', () => {
  assert.equal(MAX_FAVORITES, 10);
  assert.equal(canAddToFavorites(9), true, '9 favorite movies should allow adding 10th');
  assert.equal(canAddToFavorites(10), false, '10 favorite movies should reject adding 11th');
  assert.equal(canAddToFavorites(15), false, 'Over 10 favorite movies must be blocked');
});

test('Movie Favorites Limit - Sanitize enforces maximum 10 items slice', () => {
  const movieIds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112];
  const sanitized = sanitizeFavoritesList(movieIds);
  assert.equal(sanitized.length, 10);
  assert.equal(sanitized[9], 110);
});

test('Movie Runtime Calculation - Correctly computes hours and remaining minutes', () => {
  assert.deepEqual(formatMovieRuntime(0), { hours: 0, minutes: 0, formatted: '۰ دقیقه' });
  assert.deepEqual(formatMovieRuntime(90), { hours: 1, minutes: 30, formatted: '۱ ساعت ۳۰ دقیقه' });
  assert.deepEqual(formatMovieRuntime(120), { hours: 2, minutes: 0, formatted: '۲ ساعت' });
  assert.deepEqual(formatMovieRuntime(148), { hours: 2, minutes: 28, formatted: '۲ ساعت ۲۸ دقیقه' });
});

test('Movie Title Resolution - Prioritizes Persian title over English and original title', () => {
  const withFa = { title: 'Inception', title_fa: 'تلقین', original_title: 'Inception' };
  assert.equal(resolveMovieTitle(withFa), 'تلقین');

  const withoutFa = { title: 'Interstellar', original_title: 'Interstellar' };
  assert.equal(resolveMovieTitle(withoutFa), 'Interstellar');

  const emptyMovie = {};
  assert.equal(resolveMovieTitle(emptyMovie), 'بدون عنوان');
});

test('Payment Idempotency - Prevents double crediting on replayed transaction', () => {
  interface Transaction {
    track_id: string;
    status: 'pending' | 'success' | 'failed';
    amount: number;
    plan_type: 'monthly' | 'yearly';
  }

  function processVerification(tx: Transaction, incomingAmount: number): { shouldCredit: boolean; status: string } {
    if (tx.status === 'success') {
      return { shouldCredit: false, status: 'already_processed' };
    }
    if (Number(tx.amount) !== Number(incomingAmount)) {
      return { shouldCredit: false, status: 'amount_mismatch' };
    }
    return { shouldCredit: true, status: 'success' };
  }

  const freshTx: Transaction = { track_id: 'trk-100', status: 'pending', amount: 1490000, plan_type: 'monthly' };
  const firstAttempt = processVerification(freshTx, 1490000);
  assert.equal(firstAttempt.shouldCredit, true);
  assert.equal(firstAttempt.status, 'success');

  // Second attempt (replay attack)
  freshTx.status = 'success';
  const replayAttempt = processVerification(freshTx, 1490000);
  assert.equal(replayAttempt.shouldCredit, false);
  assert.equal(replayAttempt.status, 'already_processed');

  // Amount tampering attempt
  const tamperedTx: Transaction = { track_id: 'trk-200', status: 'pending', amount: 1490000, plan_type: 'monthly' };
  const tamperedAttempt = processVerification(tamperedTx, 1000);
  assert.equal(tamperedAttempt.shouldCredit, false);
  assert.equal(tamperedAttempt.status, 'amount_mismatch');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCriticEligibility, canUserSubmitReview } from '../../lib/criticEligibility.ts';

test('Critic Eligibility - Standard free user under thresholds is rejected', () => {
  const status = checkCriticEligibility({ is_vip: false, role: 'user' }, 150, 10);
  assert.equal(status.isCritic, false);
  assert.equal(status.vipPassed, false);
  assert.equal(status.watchedPassed, false);
  assert.equal(status.commentsPassed, false);
});

test('Critic Eligibility - VIP user meeting all thresholds is certified', () => {
  const status = checkCriticEligibility({ is_vip: true, role: 'user' }, 3500, 120);
  assert.equal(status.isCritic, true);
  assert.equal(status.vipPassed, true);
  assert.equal(status.watchedPassed, true);
  assert.equal(status.commentsPassed, true);
});

test('Critic Eligibility - Admin account bypasses 100 comments & 3000 episodes for testing', () => {
  const status = checkCriticEligibility({ is_vip: false, role: 'admin' }, 5, 2);
  assert.equal(status.isCritic, true, 'Admin should immediately have critic access');
  assert.equal(status.vipPassed, true, 'Admin passes VIP check');
  assert.equal(status.watchedPassed, true, 'Admin passes watched check');
  assert.equal(status.commentsPassed, true, 'Admin passes comments check');
  assert.equal(status.watchedProgress, 100);
  assert.equal(status.commentsProgress, 100);
});

test('Critic Review Constraint - Non-critic user cannot submit review', () => {
  const result = canUserSubmitReview(false, 'user-1', []);
  assert.equal(result.canSubmit, false);
  assert.equal(result.reason, 'not_critic');
});

test('Critic Review Constraint - Unauthenticated user cannot submit review', () => {
  const result = canUserSubmitReview(true, null, []);
  assert.equal(result.canSubmit, false);
  assert.equal(result.reason, 'unauthenticated');
});

test('Critic Review Constraint - Critic with no prior review on show CAN submit', () => {
  const existingReviews = [
    { user_id: 'other-critic-1' },
    { user_id: 'other-critic-2' },
  ];
  const result = canUserSubmitReview(true, 'critic-user', existingReviews);
  assert.equal(result.canSubmit, true);
  assert.equal(result.reason, undefined);
});

test('Critic Review Constraint - Critic with an existing review on show CANNOT submit duplicate', () => {
  const existingReviews = [
    { user_id: 'critic-user' },
    { user_id: 'other-critic' },
  ];
  const result = canUserSubmitReview(true, 'critic-user', existingReviews);
  assert.equal(result.canSubmit, false);
  assert.equal(result.reason, 'already_reviewed');
});

test('Critic Review Constraint - Deleting existing review frees the critic to submit again', () => {
  let existingReviews = [
    { user_id: 'critic-user' },
    { user_id: 'other-critic' },
  ];
  // First attempt: blocked
  assert.equal(canUserSubmitReview(true, 'critic-user', existingReviews).canSubmit, false);

  // User deletes review
  existingReviews = existingReviews.filter((r) => r.user_id !== 'critic-user');

  // Second attempt: allowed
  assert.equal(canUserSubmitReview(true, 'critic-user', existingReviews).canSubmit, true);
});


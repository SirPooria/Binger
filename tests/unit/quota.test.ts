import test from 'node:test';
import assert from 'node:assert/strict';

interface QuotaState {
  userId: string;
  requestCount: number;
  maxDaily: number;
  isVip: boolean;
}

class MockQuotaManager {
  private quotas: Map<string, QuotaState> = new Map();

  constructor(initialState: Record<string, Partial<QuotaState>>) {
    for (const [id, val] of Object.entries(initialState)) {
      this.quotas.set(id, {
        userId: id,
        requestCount: val.requestCount ?? 0,
        maxDaily: val.isVip ? Infinity : 5,
        isVip: val.isVip ?? false,
      });
    }
  }

  // Mimics consume_mood_ai_credit RPC
  consume(userId: string): { allowed: boolean; remaining: number | null } {
    const quota = this.quotas.get(userId);
    if (!quota) return { allowed: false, remaining: 0 };

    if (quota.isVip) {
      quota.requestCount += 1;
      return { allowed: true, remaining: null };
    }

    if (quota.requestCount >= quota.maxDaily) {
      return { allowed: false, remaining: 0 };
    }

    quota.requestCount += 1;
    return { allowed: true, remaining: quota.maxDaily - quota.requestCount };
  }

  // Mimics restore_mood_ai_credit RPC
  restore(userId: string): void {
    const quota = this.quotas.get(userId);
    if (quota && quota.requestCount > 0) {
      quota.requestCount -= 1;
    }
  }

  getCount(userId: string): number {
    return this.quotas.get(userId)?.requestCount ?? 0;
  }
}

test('Quota - Normal consumption decrements remaining count', () => {
  const qm = new MockQuotaManager({
    'user-free': { requestCount: 0, isVip: false },
  });

  const res1 = qm.consume('user-free');
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 4);
  assert.equal(qm.getCount('user-free'), 1);

  const res2 = qm.consume('user-free');
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 3);
  assert.equal(qm.getCount('user-free'), 2);
});

test('Quota - Daily limit enforcement blocks 6th request for free users', () => {
  const qm = new MockQuotaManager({
    'user-free': { requestCount: 5, isVip: false },
  });

  const res = qm.consume('user-free');
  assert.equal(res.allowed, false);
  assert.equal(res.remaining, 0);
  assert.equal(qm.getCount('user-free'), 5);
});

test('Quota - Rollback refund executes on AI failure so user is not penalized', async () => {
  const qm = new MockQuotaManager({
    'user-free': { requestCount: 2, isVip: false },
  });

  let quotaConsumed = false;
  try {
    const res = qm.consume('user-free');
    assert.equal(res.allowed, true);
    quotaConsumed = true;
    assert.equal(qm.getCount('user-free'), 3);

    // Simulate upstream LLM / external API timeout failure
    throw new Error('Groq upstream API timed out (504)');
  } catch (err: unknown) {
    if (quotaConsumed) {
      qm.restore('user-free');
    }
  }

  // After rollback, the user count is restored back to 2!
  assert.equal(qm.getCount('user-free'), 2);
});

test('Quota - VIP users have unlimited quota', () => {
  const qm = new MockQuotaManager({
    'user-vip': { requestCount: 100, isVip: true },
  });

  const res = qm.consume('user-vip');
  assert.equal(res.allowed, true);
  assert.equal(res.remaining, null);
  assert.equal(qm.getCount('user-vip'), 101);
});

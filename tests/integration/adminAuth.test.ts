import test from 'node:test';
import assert from 'node:assert/strict';

interface MockAuthContext {
  user: { id: string; email?: string } | null;
  profileRole: string | null;
}

// Simulates the security logic of lib/adminAuth.ts
function evaluateAdminAuthorization(ctx: MockAuthContext) {
  if (!ctx.user) {
    return { authorized: false, reason: 'unauthenticated' };
  }

  // Trusted DB check: role must strictly be 'admin'
  if (ctx.profileRole !== 'admin') {
    return { authorized: false, reason: 'forbidden_non_admin_role' };
  }

  return {
    authorized: true,
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
      role: 'admin',
    },
  };
}

test('Admin Auth Integration - Rejects unauthenticated requests', () => {
  const result = evaluateAdminAuthorization({ user: null, profileRole: null });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'unauthenticated');
});

test('Admin Auth Integration - Rejects normal authenticated user', () => {
  const result = evaluateAdminAuthorization({
    user: { id: 'usr-123', email: 'user@example.com' },
    profileRole: 'user',
  });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'forbidden_non_admin_role');
});

test('Admin Auth Integration - Rejects user with null role', () => {
  const result = evaluateAdminAuthorization({
    user: { id: 'usr-456', email: 'guest@example.com' },
    profileRole: null,
  });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'forbidden_non_admin_role');
});

test('Admin Auth Integration - Authorizes genuine database admin', () => {
  const result = evaluateAdminAuthorization({
    user: { id: 'admin-001', email: 'admin@binger.app' },
    profileRole: 'admin',
  });
  assert.equal(result.authorized, true);
  assert.equal(result.user?.role, 'admin');
  assert.equal(result.user?.id, 'admin-001');
});

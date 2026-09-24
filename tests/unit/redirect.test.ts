import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeInternalRedirectPath } from '../../lib/validation/redirect.ts';

test('Redirect Allowlist - Valid internal paths', () => {
  assert.equal(getSafeInternalRedirectPath('/dashboard'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/dashboard/settings'), '/dashboard/settings');
  assert.equal(getSafeInternalRedirectPath('/onboarding'), '/onboarding');
  assert.equal(getSafeInternalRedirectPath('/profile'), '/profile');
  assert.equal(getSafeInternalRedirectPath('/tv/1399'), '/tv/1399');
  assert.equal(getSafeInternalRedirectPath('/mood'), '/mood');
  assert.equal(getSafeInternalRedirectPath('/lists?category=drama'), '/lists?category=drama');
});

test('Redirect Allowlist - Blocks open redirect vectors to external domains', () => {
  // Protocol based
  assert.equal(getSafeInternalRedirectPath('https://attacker.com'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('http://attacker.com/dashboard'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('//attacker.com'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('///attacker.com'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/\\attacker.com'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('\\attacker.com'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('javascript:alert(1)'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('data:text/html,<script>alert(1)</script>'), '/dashboard');
});

test('Redirect Allowlist - Blocks non-allowlisted internal paths and path traversal', () => {
  assert.equal(getSafeInternalRedirectPath('/etc/passwd'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/api/admin/users'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/.env'), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/dashboard/../../secret'), '/dashboard');
});

test('Redirect Allowlist - Handles null, undefined, whitespace, and CRLF injection', () => {
  assert.equal(getSafeInternalRedirectPath(null), '/dashboard');
  assert.equal(getSafeInternalRedirectPath(undefined), '/dashboard');
  assert.equal(getSafeInternalRedirectPath(''), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('   '), '/dashboard');
  assert.equal(getSafeInternalRedirectPath('/dashboard\r\nSet-Cookie: evil=1'), '/dashboard');
});

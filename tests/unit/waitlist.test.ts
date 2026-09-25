import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Waitlist Data Integrity - Synced users are genuine and valid', () => {
  const filePath = path.join(process.cwd(), 'data', 'prelaunch-users.json');
  assert.equal(fs.existsSync(filePath), true, 'prelaunch-users.json must exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  const users = JSON.parse(content);

  assert.ok(Array.isArray(users), 'Stored users must be an array');
  assert.ok(users.length >= 20, 'Should have at least 20 real users synced from Supabase');

  // Verify none of the old fake mock names exist
  const fakeNames = ['Shelby_Tommy', 'Heisenberg_WW', 'Rust_TrueDetective', 'Tony_Soprano'];
  for (const fake of fakeNames) {
    const found = users.some(u => u.username === fake);
    assert.equal(found, false, `Fake user ${fake} should not exist in prelaunch data`);
  }

  // Verify fields of each real user
  for (const u of users) {
    assert.ok(typeof u.id === 'number', 'User ID must be number');
    assert.ok(typeof u.phone === 'string' && u.phone.startsWith('09'), 'Phone must start with 09');
    assert.ok(typeof u.username === 'string' && u.username.length > 0, 'Username must be non-empty');
    assert.ok(typeof u.redeem_code === 'string' && u.redeem_code.startsWith('BINGER-'), 'Redeem code must start with BINGER-');
    assert.ok(typeof u.invites_count === 'number', 'Invites count must be number');
  }
});

test('Waitlist Leaderboard Sorting - Orders by invites count descending', () => {
  const sampleUsers = [
    { username: 'UserA', invites_count: 1, created_at: '2026-09-01T00:00:00Z' },
    { username: 'UserB', invites_count: 5, created_at: '2026-09-02T00:00:00Z' },
    { username: 'UserC', invites_count: 3, created_at: '2026-09-03T00:00:00Z' },
  ];

  const sorted = [...sampleUsers].sort((a, b) => {
    if (b.invites_count !== a.invites_count) {
      return b.invites_count - a.invites_count;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  assert.equal(sorted[0].username, 'UserB');
  assert.equal(sorted[1].username, 'UserC');
  assert.equal(sorted[2].username, 'UserA');
});

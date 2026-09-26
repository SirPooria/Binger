import { test } from 'node:test';
import assert from 'node:assert';
import { getKnownSpinOffs, getShowSpinOffs } from '../../lib/spinOffs.ts';

test('SpinOffs - Breaking Bad (1396) returns Better Call Saul & Slippin Jimmy', () => {
  const spinOffs = getKnownSpinOffs(1396);
  assert.ok(spinOffs.length >= 2, 'Should have at least 2 spin-offs');
  
  const bcs = spinOffs.find(s => s.id === 60059);
  assert.ok(bcs, 'Better Call Saul should be present');
  assert.strictEqual(bcs?.name, 'Better Call Saul');
  assert.strictEqual(bcs?.relation, 'prequel');
});

test('SpinOffs - Better Call Saul (60059) identifies Breaking Bad as parent', () => {
  const spinOffs = getKnownSpinOffs(60059);
  const bb = spinOffs.find(s => s.id === 1396);
  assert.ok(bb, 'Breaking Bad should be present');
  assert.strictEqual(bb?.relation, 'parent');
  assert.strictEqual(bb?.relationLabel, 'سریال مادر (اصلی)');
});

test('SpinOffs - Game of Thrones (1399) returns House of the Dragon (94997)', () => {
  const spinOffs = getKnownSpinOffs(1399);
  const hotd = spinOffs.find(s => s.id === 94997);
  assert.ok(hotd, 'House of the Dragon should be present');
  assert.strictEqual(hotd?.name, 'House of the Dragon');
  assert.strictEqual(hotd?.relation, 'prequel');
});

test('SpinOffs - The Walking Dead (1402) returns all major spin-offs', () => {
  const spinOffs = getKnownSpinOffs(1402);
  const ftwd = spinOffs.find(s => s.id === 62286);
  const deadCity = spinOffs.find(s => s.id === 194583);
  const daryl = spinOffs.find(s => s.id === 211684);
  const onesWhoLive = spinOffs.find(s => s.id === 206586);

  assert.ok(ftwd, 'Fear the Walking Dead should be present');
  assert.ok(deadCity, 'Dead City should be present');
  assert.ok(daryl, 'Daryl Dixon should be present');
  assert.ok(onesWhoLive, 'The Ones Who Live should be present');
});

test('SpinOffs - Shows without spin-offs return empty array', async () => {
  // Chernobyl (87108), Dark (70523), Succession (76331), Severance (95396), Fleabag (67070)
  assert.deepStrictEqual(getKnownSpinOffs(87108), []);
  assert.deepStrictEqual(getKnownSpinOffs(70523), []);
  assert.deepStrictEqual(getKnownSpinOffs(76331), []);
  assert.deepStrictEqual(getKnownSpinOffs(95396), []);
  assert.deepStrictEqual(getKnownSpinOffs(67070), []);

  const asyncResult = await getShowSpinOffs(87108, 'Chernobyl');
  assert.deepStrictEqual(asyncResult, []);
});

test('SpinOffs - Dynamic fallback detects colon subtitle spin-offs from similar list', async () => {
  const fakeSimilar = [
    { id: 99901, name: 'Sample Show: The Next Chapter', poster_path: '/poster.jpg', vote_average: 8.2 },
    { id: 99902, name: 'Completely Unrelated Show', poster_path: '/unrelated.jpg', vote_average: 7.5 },
  ];

  const results = await getShowSpinOffs(88888, 'Sample Show', fakeSimilar);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].id, 99901);
  assert.strictEqual(results[0].name, 'Sample Show: The Next Chapter');
  assert.strictEqual(results[0].relationLabel, 'اسپین‌اف');
});

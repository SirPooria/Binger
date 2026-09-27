import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCommentWithGif, parseCommentContent } from '../../lib/klipyClient.ts';

test('Klipy formatCommentWithGif - Text and GIF combined', () => {
  const result = formatCommentWithGif('عالی بود این صحنه', 'https://static.klipy.com/ii/test.gif');
  assert.equal(result, 'عالی بود این صحنه\n\n[gif:https://static.klipy.com/ii/test.gif]');
});

test('Klipy formatCommentWithGif - GIF only', () => {
  const result = formatCommentWithGif('', 'https://static.klipy.com/ii/test.gif');
  assert.equal(result, '[gif:https://static.klipy.com/ii/test.gif]');
});

test('Klipy formatCommentWithGif - Text only', () => {
  const result = formatCommentWithGif('فقط متن بدون گیف', null);
  assert.equal(result, 'فقط متن بدون گیف');
});

test('Klipy parseCommentContent - [gif:URL] format', () => {
  const parsed = parseCommentContent('این سکانس فوق‌العاده بود!\n\n[gif:https://static.klipy.com/ii/abc/def.gif]');
  assert.equal(parsed.text, 'این سکانس فوق‌العاده بود!');
  assert.equal(parsed.gifUrl, 'https://static.klipy.com/ii/abc/def.gif');
});

test('Klipy parseCommentContent - GIF only format', () => {
  const parsed = parseCommentContent('[gif:https://static.klipy.com/ii/abc/def.gif]');
  assert.equal(parsed.text, '');
  assert.equal(parsed.gifUrl, 'https://static.klipy.com/ii/abc/def.gif');
});

test('Klipy parseCommentContent - Markdown image format ![GIF](URL)', () => {
  const parsed = parseCommentContent('پایانش عالی بود ![GIF](https://static.klipy.com/ii/abc/def.gif)');
  assert.equal(parsed.text, 'پایانش عالی بود');
  assert.equal(parsed.gifUrl, 'https://static.klipy.com/ii/abc/def.gif');
});

test('Klipy parseCommentContent - Standalone Klipy URL', () => {
  const parsed = parseCommentContent('https://static.klipy.com/ii/abc/def.gif');
  assert.equal(parsed.text, '');
  assert.equal(parsed.gifUrl, 'https://static.klipy.com/ii/abc/def.gif');
});

test('Klipy parseCommentContent - Pure plain text with no GIF', () => {
  const parsed = parseCommentContent('یک نظر کاملا متنی بدون هیچ گیفی');
  assert.equal(parsed.text, 'یک نظر کاملا متنی بدون هیچ گیفی');
  assert.equal(parsed.gifUrl, null);
});

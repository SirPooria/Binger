import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSlug, extractExcerpt } from '../../lib/slug.ts';

test('CMS Slug Formatting - Converts English text to clean hyphenated slug', () => {
  assert.equal(formatSlug('Top 10 Sci-Fi Shows of 2026!'), 'top-10-sci-fi-shows-of-2026');
  assert.equal(formatSlug('Breaking Bad: The Final Season'), 'breaking-bad-the-final-season');
});

test('CMS Slug Formatting - Fully supports Persian / Arabic unicode characters', () => {
  assert.equal(
    formatSlug('بررسی سریال بازی تاج و تخت - فصل هشتم'),
    'بررسی-سریال-بازی-تاج-و-تخت-فصل-هشتم'
  );
  assert.equal(
    formatSlug('بهترین فیلم‌های سال ۲۰۲۶ سینمای جهان'),
    'بهترین-فیلمهای-سال-۲۰۲۶-سینمای-جهان'
  );
});

test('CMS Slug Formatting - Collapses spaces, underscores, and consecutive hyphens', () => {
  assert.equal(formatSlug('  Hello   World___test---demo  '), 'hello-world-test-demo');
  assert.equal(formatSlug('---Leading and Trailing---'), 'leading-and-trailing');
});

test('CMS Slug Formatting - Handles empty and whitespace-only inputs gracefully', () => {
  assert.equal(formatSlug(''), '');
  assert.equal(formatSlug('   '), '');
  assert.equal(formatSlug('!@#$%^&*()'), '');
});

test('CMS Excerpt Extraction - Strips markdown headings, images, and formatting', () => {
  const md = '# تیتر اصلی\n\n![تصویر](https://example.com/img.png)\n\nاین یک **متن بسیار جذاب** درباره سریال است که باید خلاصه شود.';
  const excerpt = extractExcerpt(md, 50);
  assert.equal(excerpt.includes('#'), false);
  assert.equal(excerpt.includes('!['), false);
  assert.equal(excerpt.includes('**'), false);
  assert.equal(excerpt.includes('تیتر اصلی این یک متن بسیار جذاب'), true);
  assert.equal(excerpt.endsWith('...'), true);
});

test('CMS Excerpt Extraction - Short text is not truncated with ellipsis', () => {
  const short = 'متن کوتاه بدون کات';
  assert.equal(extractExcerpt(short, 100), 'متن کوتاه بدون کات');
});


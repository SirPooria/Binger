import test from 'node:test';
import assert from 'node:assert/strict';
import { validateIranPhoneNumber, convertToAsciiDigits } from '../../lib/validation/phone.ts';

test('Phone Validation - Persian and Arabic digit normalization', () => {
  assert.equal(convertToAsciiDigits('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(convertToAsciiDigits('٠٩١٢٣٤٥٦٧٨٩'), '09123456789');
  assert.equal(convertToAsciiDigits('۱۲۳۴۵'), '12345');
});

test('Phone Validation - Standard Iranian format (09xxxxxxxxx)', () => {
  const result = validateIranPhoneNumber('09123456789');
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedPhone, '09123456789');
  assert.equal(result.internationalFormat, '989123456789');
});

test('Phone Validation - Persian digits input', () => {
  const result = validateIranPhoneNumber('۰۹۳۵۱۲۳۴۵۶۷');
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedPhone, '09351234567');
  assert.equal(result.internationalFormat, '989351234567');
});

test('Phone Validation - International format with +98 or 0098', () => {
  const plus98 = validateIranPhoneNumber('+989123456789');
  assert.equal(plus98.isValid, true);
  assert.equal(plus98.normalizedPhone, '09123456789');
  assert.equal(plus98.internationalFormat, '989123456789');

  const doubleZero = validateIranPhoneNumber('00989123456789');
  assert.equal(doubleZero.isValid, true);
  assert.equal(doubleZero.normalizedPhone, '09123456789');

  const bare98 = validateIranPhoneNumber('989123456789');
  assert.equal(bare98.isValid, true);
  assert.equal(bare98.normalizedPhone, '09123456789');
});

test('Phone Validation - Number without leading zero (912...)', () => {
  const result = validateIranPhoneNumber('9123456789');
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedPhone, '09123456789');
});

test('Phone Validation - Invalid inputs rejected', () => {
  // Too short
  assert.equal(validateIranPhoneNumber('0912345').isValid, false);
  // Too long
  assert.equal(validateIranPhoneNumber('0912345678900').isValid, false);
  // Landline or invalid prefix
  assert.equal(validateIranPhoneNumber('02188888888').isValid, false);
  // Non-numeric garbage
  assert.equal(validateIranPhoneNumber('0912abc6789').isValid, false);
  // Null or empty
  assert.equal(validateIranPhoneNumber(null).isValid, false);
  assert.equal(validateIranPhoneNumber(undefined).isValid, false);
  assert.equal(validateIranPhoneNumber('').isValid, false);
});

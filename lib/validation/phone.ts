/**
 * Shared Iran mobile phone number validation and normalization.
 */

// Converts Persian and Arabic numerals to ASCII Latin digits
export function convertToAsciiDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone: string;      // Standard Iranian 11-digit format: 09123456789
  internationalFormat: string;  // E.164-compatible format: 989123456789
  error?: string;
}

// Valid prefixes for Iranian mobile operators: 090x, 091x, 092x, 093x, 099x
const IRAN_MOBILE_REGEX = /^09[0-9]{9}$/;

export function validateIranPhoneNumber(input: string | null | undefined): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalizedPhone: '',
      internationalFormat: '',
      error: 'شماره تماس الزامی است',
    };
  }

  // 1. Convert Persian/Arabic digits
  let cleaned = convertToAsciiDigits(input.trim());

  // 2. Remove all non-numeric characters except initial plus
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // 3. Normalize international prefix to 09...
  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }

  // If user entered 9123456789 without 0
  if (/^9[0-9]{9}$/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }

  // 4. Validate exact 11 digits starting with 09
  if (!IRAN_MOBILE_REGEX.test(cleaned)) {
    return {
      isValid: false,
      normalizedPhone: cleaned,
      internationalFormat: '',
      error: 'شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹',
    };
  }

  const international = '98' + cleaned.slice(1);

  return {
    isValid: true,
    normalizedPhone: cleaned,
    internationalFormat: international,
  };
}

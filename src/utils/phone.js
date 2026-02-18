import config from '../config/index.js';

/**
 * Normalizes a phone number to E.164 format required by WhatsApp API.
 * Examples:
 *   "0412-123-4567"  → "584121234567"
 *   "+58 412 1234567" → "584121234567"
 *   "412-1234567"    → "584121234567"
 */
export function normalizePhone(phone) {
  const countryCode = config.whatsapp.defaultCountryCode;

  let digits = phone.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits.replace('+', '');
  }

  if (digits.startsWith('00')) {
    return digits.slice(2);
  }

  if (digits.startsWith('0')) {
    return `${countryCode}${digits.slice(1)}`;
  }

  if (digits.startsWith(countryCode)) {
    return digits;
  }

  return `${countryCode}${digits}`;
}

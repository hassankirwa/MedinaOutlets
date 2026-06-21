export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidKenyaLocalPhone(value: string): boolean {
  return /^0\d{9}$/.test(normalizePhoneDigits(value));
}

export const phoneValidationMessage =
  "Enter a valid 10-digit phone number starting with 0 (e.g. 0712345678).";

export function sanitizePhoneInput(value: string): string {
  return normalizePhoneDigits(value).slice(0, 10);
}

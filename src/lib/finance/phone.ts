/**
 * Normalizes an international phone number for storage and WhatsApp links.
 * Store numbers in E.164 form, such as +919876543210.
 */
export function normalizeInternationalPhone(phone?: string | null): string | null {
  if (!phone) return null;

  const normalized = phone.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

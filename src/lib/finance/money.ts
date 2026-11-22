const MONEY_PATTERN = /^-?\d{1,3}(,?\d{3})*(\.\d{1,2})?$|^-?\d+(\.\d{1,2})?$/;

/**
 * Parses a rupee string (e.g. "1,234.5", "-0.05") into integer paise.
 * String-based only: no floating-point arithmetic on the input.
 * Returns null for invalid input.
 */
export function parseToPaise(value: string): number | null {
  if (!MONEY_PATTERN.test(value)) return null;

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [intPart, fracPart = ''] = unsigned.replace(/,/g, '').split('.');
  const frac = fracPart.padEnd(2, '0');

  const paise = Number(intPart) * 100 + Number(frac);
  return negative && paise !== 0 ? -paise : paise;
}

/**
 * Formats integer paise as a plain decimal rupee string using integer math only.
 * e.g. 12345 -> "123.45", -5 -> "-0.05", 0 -> "0.00"
 */
export function paiseToRupeString(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new RangeError(`paiseToRupeString expects an integer, got ${paise}`);
  }

  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const sign = paise < 0 ? '-' : '';

  return `${sign}${rupees}.${frac}`;
}

const INR_FORMATTER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

// Display only: converts paise to rupees via floating-point division; never use for stored or computed amounts.
export function formatINR(paise: number): string {
  return INR_FORMATTER.format(paise / 100);
}

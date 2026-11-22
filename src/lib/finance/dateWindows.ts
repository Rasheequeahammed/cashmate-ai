export const IST_TIME_ZONE = 'Asia/Kolkata';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface YearMonthDay {
  year: number;
  month: number;
  day: number;
}

function istParts(now: Date): YearMonthDay {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const read = (type: 'year' | 'month' | 'day'): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Missing ${type} part for IST date`);
    return Number(part.value);
  };

  return { year: read('year'), month: read('month'), day: read('day') };
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYmd(dateStr: string): YearMonthDay {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Adds an offset in days to a 'YYYY-MM-DD' date string.
 * Uses Date.UTC to ensure deterministic calendar arithmetic.
 */
export function addDaysIST(dateStr: string, days: number): string {
  const { year, month, day } = parseYmd(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Difference in days between two 'YYYY-MM-DD' strings (b - a).
 */
export function diffDays(dateStrA: string, dateStrB: string): number {
  const a = parseYmd(dateStrA);
  const b = parseYmd(dateStrB);
  const msA = Date.UTC(a.year, a.month - 1, a.day);
  const msB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((msB - msA) / (24 * 3600 * 1000));
}

/** Today's date in IST as 'YYYY-MM-DD'. */
export function todayIST(now: Date): string {
  const { year, month, day } = istParts(now);
  return formatYmd(year, month, day);
}

/** First and last day of the current IST month as 'YYYY-MM-DD'. */
export function currentMonthRange(now: Date): { start: string; end: string } {
  const { year, month } = istParts(now);
  return {
    start: formatYmd(year, month, 1),
    end: formatYmd(year, month, daysInMonth(year, month)),
  };
}

/** Six calendar months ending with the current IST month, oldest first. */
export function last6MonthsRanges(
  now: Date,
): Array<{ key: string; label: string; start: string; end: string }> {
  const current = istParts(now);
  let year = current.year;
  let month = current.month;

  const ranges: Array<{ key: string; label: string; start: string; end: string }> = [];
  for (let i = 0; i < 6; i++) {
    ranges.unshift({
      key: `${year}-${pad2(month)}`,
      label: `${MONTH_SHORT[month - 1]} ${pad2(year % 100)}`,
      start: formatYmd(year, month, 1),
      end: formatYmd(year, month, daysInMonth(year, month)),
    });

    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return ranges;
}

/** Extracts 'YYYY-MM' from an IST 'YYYY-MM-DD' string. */
export function monthKeyIST(dateStr: string): string {
  return dateStr.slice(0, 7);
}

import { describe, it, expect } from 'vitest';
import {
  todayIST,
  currentMonthRange,
  last6MonthsRanges,
  monthKeyIST,
} from './dateWindows';

describe('IST date boundaries', () => {
  it('rolls over to the next IST day at 18:30 UTC', () => {
    expect(todayIST(new Date('2025-03-31T19:00:00Z'))).toBe('2025-04-01');
    expect(todayIST(new Date('2025-03-31T18:00:00Z'))).toBe('2025-03-31');
  });

  it('returns the IST month range', () => {
    expect(currentMonthRange(new Date('2025-03-31T19:00:00Z'))).toEqual({
      start: '2025-04-01',
      end: '2025-04-30',
    });
  });

  it('handles leap-year February', () => {
    expect(
      currentMonthRange(new Date('2024-02-10T06:00:00Z')).end,
    ).toBe('2024-02-29');
  });

  it('returns six months ending with the current IST month', () => {
    const ranges = last6MonthsRanges(new Date('2025-04-01T00:00:00Z'));

    expect(ranges).toHaveLength(6);
    expect(ranges[0].key).toBe('2024-11');
    expect(ranges[5].key).toBe('2025-04');
  });

  it('extracts the month key from a date string', () => {
    expect(monthKeyIST('2025-04-15')).toBe('2025-04');
  });
});
import { describe, it, expect } from 'vitest';
import {
  calculateCashFlowForecast,
  projectScheduleOccurrences,
  formatShortDateLabel,
  type ForecastInvoice,
  type ForecastRecurringSchedule,
} from './forecast';

describe('formatShortDateLabel', () => {
  it('formats YYYY-MM-DD into DD MMM', () => {
    expect(formatShortDateLabel('2026-11-22')).toBe('22 Nov');
    expect(formatShortDateLabel('2026-01-05')).toBe('5 Jan');
  });
});

describe('projectScheduleOccurrences', () => {
  const TODAY = '2026-01-15';
  const HORIZON_90 = '2026-04-15';

  it('preserves the original day of month (Jan 31 -> Feb 28 -> Mar 31)', () => {
    const schedule: ForecastRecurringSchedule = {
      id: 'rec-1',
      description: 'Month End Software',
      category: 'Software',
      frequency: 'monthly',
      start_date: '2026-01-31',
      end_date: null,
      amount_paise: 500000,
      is_active: true,
    };

    const occurrences = projectScheduleOccurrences(schedule, TODAY, HORIZON_90);
    expect(occurrences).toEqual([
      '2026-01-31',
      '2026-02-28', // 2026 is non-leap
      '2026-03-31',
    ]);
  });

  it('preserves Feb 29 in leap year (2024)', () => {
    const leapSchedule: ForecastRecurringSchedule = {
      id: 'rec-leap',
      description: 'Leap Month End',
      category: 'Rent',
      frequency: 'monthly',
      start_date: '2024-01-31',
      end_date: null,
      amount_paise: 100000,
      is_active: true,
    };

    const occurrences = projectScheduleOccurrences(leapSchedule, '2024-02-01', '2024-04-01');
    expect(occurrences).toEqual([
      '2024-02-29', // Leap year 2024
      '2024-03-31',
    ]);
  });

  it('efficiently skips past start dates for historical schedules', () => {
    const oldSchedule: ForecastRecurringSchedule = {
      id: 'rec-old',
      description: 'Server Hosting',
      category: 'Software',
      frequency: 'monthly',
      start_date: '2020-05-15',
      end_date: null,
      amount_paise: 250000,
      is_active: true,
    };

    // Projection for 60 days starting 2026-11-01
    const occurrences = projectScheduleOccurrences(oldSchedule, '2026-11-01', '2026-12-31');
    expect(occurrences).toEqual([
      '2026-11-15',
      '2026-12-15',
    ]);
  });

  it('projects weekly schedules every 7 days', () => {
    const weeklySchedule: ForecastRecurringSchedule = {
      id: 'rec-weekly',
      description: 'Weekly Cleaning',
      category: 'Supplies',
      frequency: 'weekly',
      start_date: '2026-01-01',
      end_date: null,
      amount_paise: 100000,
      is_active: true,
    };

    const occurrences = projectScheduleOccurrences(weeklySchedule, '2026-01-15', '2026-02-05');
    // Start was 2026-01-01 (Thu). Occurrences: Jan 01, Jan 08, Jan 15, Jan 22, Jan 29, Feb 05
    expect(occurrences).toEqual([
      '2026-01-15',
      '2026-01-22',
      '2026-01-29',
      '2026-02-05',
    ]);
  });

  it('projects quarterly schedules every 3 months preserving original day', () => {
    const quarterlySchedule: ForecastRecurringSchedule = {
      id: 'rec-q',
      description: 'Quarterly Maintenance',
      category: 'Utilities',
      frequency: 'quarterly',
      start_date: '2025-08-31',
      end_date: null,
      amount_paise: 400000,
      is_active: true,
    };

    // From 2025-08-31:
    // +3m -> 2025-11-30 (Nov has 30 days)
    // +6m -> 2026-02-28 (Feb has 28 days)
    // +9m -> 2026-05-31 (May has 31 days)
    const occurrences = projectScheduleOccurrences(quarterlySchedule, '2025-11-01', '2026-06-01');
    expect(occurrences).toEqual([
      '2025-11-30',
      '2026-02-28',
      '2026-05-31',
    ]);
  });

  it('respects optional end_date', () => {
    const endingSchedule: ForecastRecurringSchedule = {
      id: 'rec-end',
      description: 'Temporary Consultant',
      category: 'Salaries',
      frequency: 'monthly',
      start_date: '2026-01-01',
      end_date: '2026-02-15',
      amount_paise: 500000,
      is_active: true,
    };

    const occurrences = projectScheduleOccurrences(endingSchedule, '2026-01-01', '2026-04-01');
    expect(occurrences).toEqual([
      '2026-01-01',
      '2026-02-01',
    ]);
  });

  it('returns empty array when is_active is false', () => {
    const inactiveSchedule: ForecastRecurringSchedule = {
      id: 'rec-inactive',
      description: 'Old Subscription',
      category: 'Software',
      frequency: 'monthly',
      start_date: '2026-01-01',
      end_date: null,
      amount_paise: 500000,
      is_active: false,
    };

    expect(projectScheduleOccurrences(inactiveSchedule, '2026-01-01', '2026-04-01')).toEqual([]);
  });
});

describe('calculateCashFlowForecast', () => {
  const TODAY = '2026-02-01';

  function createInvoice(overrides: Partial<ForecastInvoice> & { id: string }): ForecastInvoice {
    return {
      invoice_number: `INV-${overrides.id}`,
      customer_name: 'Customer A',
      status: 'sent',
      issue_date: '2026-01-15',
      due_date: '2026-02-10',
      total_paise: 100000,
      amount_paid_paise: 0,
      outstanding_paise: 100000,
      ...overrides,
    };
  }

  it('generates exact daily points: 31 for 30d, 61 for 60d, 91 for 90d', () => {
    const res30 = calculateCashFlowForecast({
      invoices: [],
      recurringExpenses: [],
      period: 30,
      todayOverride: TODAY,
    });
    expect(res30.points).toHaveLength(31);
    expect(res30.points[0].date).toBe(TODAY);
    expect(res30.points[30].date).toBe('2026-03-03');

    const res60 = calculateCashFlowForecast({
      invoices: [],
      recurringExpenses: [],
      period: 60,
      todayOverride: TODAY,
    });
    expect(res60.points).toHaveLength(61);

    const res90 = calculateCashFlowForecast({
      invoices: [],
      recurringExpenses: [],
      period: 90,
      todayOverride: TODAY,
    });
    expect(res90.points).toHaveLength(91);
  });

  it('excludes draft, paid, and >90-day overdue invoices', () => {
    const invoices: ForecastInvoice[] = [
      createInvoice({ id: 'draft-1', status: 'draft', due_date: '2026-02-05' }),
      createInvoice({ id: 'paid-1', status: 'paid', outstanding_paise: 0 }),
      // Overdue by 95 days (TODAY is 2026-02-01, 95 days ago is ~2025-10-29):
      createInvoice({ id: 'too-old', status: 'overdue', due_date: '2025-10-25', outstanding_paise: 50000 }),
      // Overdue by 20 days (<90d cutoff):
      createInvoice({ id: 'valid-overdue', status: 'overdue', due_date: '2026-01-12', outstanding_paise: 40000 }),
      // Due inside 30-day window:
      createInvoice({ id: 'upcoming', status: 'sent', due_date: '2026-02-15', outstanding_paise: 60000 }),
    ];

    const res = calculateCashFlowForecast({
      invoices,
      recurringExpenses: [],
      period: 30,
      todayOverride: TODAY,
    });

    expect(res.assumptions.excludedDraftInvoicesCount).toBe(1);
    expect(res.assumptions.excludedPaidInvoicesCount).toBe(1);
    expect(res.assumptions.excludedOverduePast90DaysCount).toBe(1);
    expect(res.assumptions.eligibleOverdueInvoicesCount).toBe(1);
    expect(res.assumptions.eligibleDueInWindowCount).toBe(1);
    expect(res.assumptions.eligibleInvoicesInWindowCount).toBe(2);

    // Overdue within 90 days mapped to Day 0 (TODAY)
    const day0 = res.points[0];
    expect(day0.inflowsPaise).toBe(40000);

    // Upcoming invoice on Feb 15
    const feb15Point = res.points.find((p) => p.date === '2026-02-15');
    expect(feb15Point?.inflowsPaise).toBe(60000);
  });

  it('counts only recurring schedules that have occurrences in the window', () => {
    const recurringExpenses: ForecastRecurringSchedule[] = [
      {
        id: 'rec-monthly',
        description: 'Monthly Cloud Host',
        category: 'Software',
        frequency: 'monthly',
        start_date: '2026-01-10',
        end_date: null,
        amount_paise: 20000,
        is_active: true,
      },
      {
        id: 'rec-distant',
        description: 'Annual Insurance (fires in Dec)',
        category: 'Other',
        frequency: 'annually',
        start_date: '2026-12-15',
        end_date: null,
        amount_paise: 100000,
        is_active: true,
      },
    ];

    const res = calculateCashFlowForecast({
      invoices: [],
      recurringExpenses,
      period: 30, // Feb 01 to Mar 03
      todayOverride: TODAY,
    });

    expect(res.assumptions.totalActiveRecurringSchedulesCount).toBe(2);
    expect(res.assumptions.recurringSchedulesWithOccurrencesCount).toBe(1); // Only monthly
    expect(res.assumptions.totalProjectedOccurrencesCount).toBe(1); // Feb 10
  });

  it('correctly accumulates running cash balance with opening balance', () => {
    const invoices: ForecastInvoice[] = [
      createInvoice({ id: 'inv-1', due_date: '2026-02-05', outstanding_paise: 50000 }), // +₹500 on Feb 05
    ];
    const recurringExpenses: ForecastRecurringSchedule[] = [
      {
        id: 'rec-1',
        description: 'Rent',
        category: 'Rent',
        frequency: 'monthly',
        start_date: '2026-02-10',
        end_date: null,
        amount_paise: 20000, // -₹200 on Feb 10
        is_active: true,
      },
    ];

    const openingBalancePaise = 100000; // ₹1,000 opening

    const res = calculateCashFlowForecast({
      invoices,
      recurringExpenses,
      period: 30,
      openingBalancePaise,
      todayOverride: TODAY,
    });

    expect(res.points[0].closingBalancePaise).toBe(100000); // Day 0: ₹1,000
    const feb5 = res.points.find((p) => p.date === '2026-02-05');
    expect(feb5?.closingBalancePaise).toBe(150000); // Day 4: ₹1,500
    const feb10 = res.points.find((p) => p.date === '2026-02-10');
    expect(feb10?.closingBalancePaise).toBe(130000); // Day 9: ₹1,300

    expect(res.metrics.openingBalancePaise).toBe(100000);
    expect(res.metrics.totalInflowsPaise).toBe(50000);
    expect(res.metrics.totalOutflowsPaise).toBe(20000);
    expect(res.metrics.netMovementPaise).toBe(30000);
    expect(res.metrics.endingBalancePaise).toBe(130000);
  });
});

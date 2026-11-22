import { describe, it, expect } from 'vitest';
import { simulateDelayedPayment } from './simulation';
import type { ForecastInvoice, ForecastRecurringSchedule } from './forecast';

describe('simulateDelayedPayment', () => {
  const TODAY = '2026-02-01';

  function createInvoice(overrides: Partial<ForecastInvoice> & { id: string }): ForecastInvoice {
    return {
      invoice_number: `INV-${overrides.id}`,
      customer_name: 'Customer Acme',
      status: 'sent',
      issue_date: '2026-01-15',
      due_date: '2026-02-10',
      total_paise: 100000,
      amount_paid_paise: 0,
      outstanding_paise: 100000,
      ...overrides,
    };
  }

  it('shifts expected inflow date by exactly 15 days within the horizon window', () => {
    // Invoice due on Feb 10 (+9 days from Feb 01).
    // Shifted by 15 days -> Feb 25 (+24 days from Feb 01).
    // Both are within the 30-day horizon (which ends on Mar 03).
    const invoices = [
      createInvoice({ id: 'inv-1', due_date: '2026-02-10', outstanding_paise: 50000 }),
    ];

    const result = simulateDelayedPayment({
      invoices,
      recurringExpenses: [],
      period: 30,
      openingBalancePaise: 10000,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-1',
        delayDays: 15,
      },
    });

    const { baseline, simulated, comparison } = result;

    expect(comparison.originalExpectedDate).toBe('2026-02-10');
    expect(comparison.simulatedPaymentDate).toBe('2026-02-25');
    expect(comparison.isExcludedFromSimulatedWindow).toBe(false);
    expect(comparison.isOverdueInBaseline).toBe(false);
    expect(comparison.delayedAmountPaise).toBe(50000);

    // Baseline: +500 on Feb 10.
    const feb10Base = baseline.points.find((p) => p.date === '2026-02-10');
    expect(feb10Base?.inflowsPaise).toBe(50000);
    expect(feb10Base?.closingBalancePaise).toBe(60000);

    // Simulated: 0 on Feb 10, +500 on Feb 25.
    const feb10Sim = simulated.points.find((p) => p.date === '2026-02-10');
    expect(feb10Sim?.inflowsPaise).toBe(0);
    expect(feb10Sim?.closingBalancePaise).toBe(10000);

    const feb25Sim = simulated.points.find((p) => p.date === '2026-02-25');
    expect(feb25Sim?.inflowsPaise).toBe(50000);
    expect(feb25Sim?.closingBalancePaise).toBe(60000);

    // Ending balance is identical because both fall within 30 days
    expect(comparison.deltaEndingBalancePaise).toBe(0);
    expect(comparison.simulatedEndingBalancePaise).toBe(comparison.baselineEndingBalancePaise);
  });

  it('excludes invoice entirely when 15-day delay pushes payment past horizon end', () => {
    // Horizon 30d ends on 2026-03-03.
    // Invoice due on Feb 20 (Day 19).
    // +15 days -> Mar 07 (Day 34, past Day 30).
    const invoices = [
      createInvoice({ id: 'inv-late', due_date: '2026-02-20', outstanding_paise: 80000 }),
    ];

    const result = simulateDelayedPayment({
      invoices,
      recurringExpenses: [],
      period: 30,
      openingBalancePaise: 20000,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-late',
        delayDays: 15,
      },
    });

    const { baseline, simulated, comparison } = result;

    expect(comparison.originalExpectedDate).toBe('2026-02-20');
    expect(comparison.simulatedPaymentDate).toBe('2026-03-07');
    expect(comparison.isExcludedFromSimulatedWindow).toBe(true);

    // Baseline included the 80000 paise
    expect(baseline.metrics.totalInflowsPaise).toBe(80000);
    expect(baseline.metrics.endingBalancePaise).toBe(100000); // 20k + 80k

    // Simulated excluded it entirely (not clamped to Day 30!)
    expect(simulated.metrics.totalInflowsPaise).toBe(0);
    expect(simulated.metrics.endingBalancePaise).toBe(20000); // 20k + 0
    expect(comparison.deltaEndingBalancePaise).toBe(-80000);

    // Check last day of simulation points
    const lastPoint = simulated.points[simulated.points.length - 1];
    expect(lastPoint.inflowsPaise).toBe(0);
    expect(lastPoint.closingBalancePaise).toBe(20000);
  });

  it('handles 15-day delay for an overdue invoice (mapped to today + 15 days)', () => {
    // Overdue invoice (due 2026-01-20, 12 days before TODAY 2026-02-01).
    // In baseline, it is expected on Day 0 (2026-02-01).
    // Simulated date must be today + 15 days -> 2026-02-16.
    const invoices = [
      createInvoice({ id: 'inv-overdue', due_date: '2026-01-20', status: 'overdue', outstanding_paise: 45000 }),
    ];

    const result = simulateDelayedPayment({
      invoices,
      recurringExpenses: [],
      period: 30,
      openingBalancePaise: 5000,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-overdue',
        delayDays: 15,
      },
    });

    const { baseline, simulated, comparison } = result;

    expect(comparison.isOverdueInBaseline).toBe(true);
    expect(comparison.originalExpectedDate).toBe(TODAY);
    expect(comparison.simulatedPaymentDate).toBe('2026-02-16');
    expect(comparison.isExcludedFromSimulatedWindow).toBe(false);

    // Baseline: inflow is on Day 0
    expect(baseline.points[0].inflowsPaise).toBe(45000);
    expect(baseline.points[0].closingBalancePaise).toBe(50000);

    // Simulated: Day 0 has 0 inflows, Day 15 (Feb 16) has 45000
    expect(simulated.points[0].inflowsPaise).toBe(0);
    expect(simulated.points[0].closingBalancePaise).toBe(5000);

    const feb16Sim = simulated.points.find((p) => p.date === '2026-02-16');
    expect(feb16Sim?.inflowsPaise).toBe(45000);
    expect(feb16Sim?.closingBalancePaise).toBe(50000);
  });

  it('detects a new deficit introduced by payment delay', () => {
    // Opening balance ₹100.
    // Inflow ₹1,000 originally expected on Feb 05.
    // Outflow ₹500 recurring on Feb 10.
    // Baseline: Feb 05: balance ₹1,100. Feb 10: balance ₹600. No deficit!
    // Simulated: Inflow delayed by 15 days to Feb 20.
    // On Feb 10, outflow ₹500 hits when balance is only ₹100 -> balance becomes -₹400 (Deficit!).
    const invoices = [
      createInvoice({ id: 'inv-key', due_date: '2026-02-05', outstanding_paise: 100000 }),
    ];
    const recurringExpenses: ForecastRecurringSchedule[] = [
      {
        id: 'rec-rent',
        description: 'Rent',
        category: 'Rent',
        frequency: 'monthly',
        start_date: '2026-02-10',
        end_date: null,
        amount_paise: 50000,
        is_active: true,
      },
    ];

    const result = simulateDelayedPayment({
      invoices,
      recurringExpenses,
      period: 30,
      openingBalancePaise: 10000,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-key',
        delayDays: 15,
      },
    });

    const { comparison } = result;
    expect(comparison.deficitAnalysis.status).toBe('new_deficit');
    expect(comparison.deficitAnalysis.hasBaselineDeficit).toBe(false);
    expect(comparison.deficitAnalysis.hasSimulatedDeficit).toBe(true);
    expect(comparison.deficitAnalysis.baselineLowestPaise).toBe(10000);
    expect(comparison.deficitAnalysis.simulatedLowestPaise).toBe(-40000);
    expect(comparison.deficitAnalysis.firstSimulatedDeficitDate).toBe('2026-02-10');
    expect(comparison.deficitAnalysis.firstSimulatedDeficitDayIndex).toBe(9);
  });

  it('detects worsened deficit when baseline already had a deficit', () => {
    // Opening balance -₹100 (already negative).
    // Inflow ₹500 due Feb 05 delayed to Feb 20.
    // Outflow ₹200 on Feb 07.
    // In baseline, balance went from -100 -> +400 on Feb 05 -> +200 on Feb 07. Lowest = -100.
    // In simulated, balance on Feb 07 drops to -100 - 200 = -300. Lowest = -300.
    const invoices = [
      createInvoice({ id: 'inv-worse', due_date: '2026-02-05', outstanding_paise: 50000 }),
    ];
    const recurringExpenses: ForecastRecurringSchedule[] = [
      {
        id: 'rec-util',
        description: 'Utilities',
        category: 'Utilities',
        frequency: 'monthly',
        start_date: '2026-02-07',
        end_date: null,
        amount_paise: 20000,
        is_active: true,
      },
    ];

    const result = simulateDelayedPayment({
      invoices,
      recurringExpenses,
      period: 30,
      openingBalancePaise: -10000,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-worse',
        delayDays: 15,
      },
    });

    expect(result.comparison.deficitAnalysis.status).toBe('worsened_deficit');
    expect(result.comparison.deficitAnalysis.hasBaselineDeficit).toBe(true);
    expect(result.comparison.deficitAnalysis.hasSimulatedDeficit).toBe(true);
    expect(result.comparison.deficitAnalysis.simulatedLowestPaise).toBeLessThan(
      result.comparison.deficitAnalysis.baselineLowestPaise,
    );
  });

  it('preserves immutability of original invoice array and objects', () => {
    const originalInvoice = createInvoice({
      id: 'inv-immut',
      due_date: '2026-02-10',
      outstanding_paise: 30000,
    });
    const invoices = [originalInvoice];
    const invoicesSnapshot = JSON.stringify(invoices);

    simulateDelayedPayment({
      invoices,
      recurringExpenses: [],
      period: 30,
      openingBalancePaise: 0,
      todayOverride: TODAY,
      scenario: {
        invoiceId: 'inv-immut',
        delayDays: 15,
      },
    });

    expect(JSON.stringify(invoices)).toBe(invoicesSnapshot);
    expect(originalInvoice.due_date).toBe('2026-02-10');
  });

  it('throws an error if the invoiceId is not found', () => {
    expect(() => {
      simulateDelayedPayment({
        invoices: [],
        recurringExpenses: [],
        period: 30,
        todayOverride: TODAY,
        scenario: {
          invoiceId: 'non-existent',
          delayDays: 15,
        },
      });
    }).toThrow('Invoice with id "non-existent" not found for simulation.');
  });
});

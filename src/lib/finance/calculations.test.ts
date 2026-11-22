import { describe, it, expect } from 'vitest';
import {
  type InvoiceRow,
  type PaymentRow,
  type ExpenseRow,
  isOverdue,
  receivablesPaise,
  overdueInvoices,
  recentInvoices,
  sumPaymentsInRange,
  sumExpensesInRange,
  netCashMovementPaise,
  monthlyRevenueExpensesSeries,
} from './calculations';

const TODAY = '2025-04-10';

function inv(p: Partial<InvoiceRow> & { id: string }): InvoiceRow {
  return {
    invoice_number: p.id.toUpperCase(),
    status: 'sent',
    issue_date: '2025-03-01',
    due_date: '2025-03-15',
    created_at: '2025-03-01T10:00:00Z',
    total_paise: 100000,
    amount_paid_paise: 0,
    outstanding_paise: 100000,
    ...p,
  };
}

describe('receivables and overdue', () => {
  it('excludes draft and paid invoices from receivables', () => {
    const invoices = [
      inv({ id: 'd', status: 'draft', outstanding_paise: 5000 }),
      inv({ id: 'p', status: 'paid', outstanding_paise: 0 }),
      inv({ id: 's', status: 'sent', outstanding_paise: 1000 }),
      inv({ id: 'pp', status: 'partially_paid', outstanding_paise: 2000 }),
      inv({ id: 'o', status: 'overdue', outstanding_paise: 3000 }),
    ];

    expect(receivablesPaise(invoices)).toBe(6000);
  });

  it('treats a past-due sent invoice as overdue despite its stored status', () => {
    expect(
      isOverdue(
        inv({ id: 'a', status: 'sent', due_date: '2025-04-01' }),
        TODAY,
      ),
    ).toBe(true);
  });

  it('does not treat a stored overdue invoice with a future due date as overdue', () => {
    expect(
      isOverdue(
        inv({ id: 'a', status: 'overdue', due_date: '2025-04-20' }),
        TODAY,
      ),
    ).toBe(false);
  });

  it('does not treat past-due drafts or paid invoices as overdue', () => {
    expect(
      isOverdue(
        inv({ id: 'a', status: 'draft', due_date: '2025-04-01' }),
        TODAY,
      ),
    ).toBe(false);

    expect(
      isOverdue(
        inv({
          id: 'b',
          status: 'paid',
          due_date: '2025-04-01',
          outstanding_paise: 0,
        }),
        TODAY,
      ),
    ).toBe(false);
  });

  it('sorts overdue by outstanding DESC, then due date ASC, limited to 5', () => {
    const invoices = [
      inv({ id: 'a', outstanding_paise: 500, due_date: '2025-04-01' }),
      inv({ id: 'b', outstanding_paise: 900, due_date: '2025-03-01' }),
      inv({ id: 'c', outstanding_paise: 900, due_date: '2025-02-01' }),
      inv({ id: 'd', outstanding_paise: 100, due_date: '2025-04-02' }),
      inv({ id: 'e', outstanding_paise: 700, due_date: '2025-04-03' }),
      inv({ id: 'f', outstanding_paise: 300, due_date: '2025-04-04' }),
      inv({ id: 'g', outstanding_paise: 1200, due_date: '2025-04-05' }),
    ];

    const ids = overdueInvoices(invoices, TODAY).map((i) => i.id);

    expect(ids).toEqual(['g', 'c', 'b', 'e', 'a']);
  });

  it('does not mutate the input when computing overdue', () => {
    const invoices = [
      inv({ id: 'a', outstanding_paise: 100, due_date: '2025-04-01' }),
      inv({ id: 'b', outstanding_paise: 900, due_date: '2025-04-01' }),
    ];

    const snapshot = JSON.parse(JSON.stringify(invoices));

    overdueInvoices(invoices, TODAY);

    expect(invoices).toEqual(snapshot);
  });
});

describe('recent invoices', () => {
  it('includes drafts, sorts by created_at DESC, and limits to 5', () => {
    const invoices = [
      inv({ id: 'i1', created_at: '2025-03-01T10:00:00Z' }),
      inv({ id: 'i2', created_at: '2025-03-02T10:00:00Z' }),
      inv({ id: 'i3', created_at: '2025-03-03T10:00:00Z' }),
      inv({ id: 'i4', created_at: '2025-03-04T10:00:00Z' }),
      inv({ id: 'i5', created_at: '2025-03-05T10:00:00Z' }),
      inv({ id: 'i6', status: 'draft', created_at: '2025-03-06T10:00:00Z' }),
    ];

    const snapshot = JSON.parse(JSON.stringify(invoices));

    const ids = recentInvoices(invoices).map((i) => i.id);

    expect(ids).toEqual(['i6', 'i5', 'i4', 'i3', 'i2']);
    expect(invoices).toEqual(snapshot);
  });
});

describe('range sums and cash movement', () => {
  const payments: PaymentRow[] = [
    { id: 'p1', amount_paise: 100, payment_date: '2025-04-01' },
    { id: 'p2', amount_paise: 200, payment_date: '2025-04-30' },
    { id: 'p3', amount_paise: 400, payment_date: '2025-05-01' },
    { id: 'p4', amount_paise: 800, payment_date: '2025-03-31' },
  ];

  const expenses: ExpenseRow[] = [
    { id: 'e1', amount_paise: 50, expense_date: '2025-04-01' },
    { id: 'e2', amount_paise: 70, expense_date: '2025-04-30' },
    { id: 'e3', amount_paise: 900, expense_date: '2025-05-01' },
  ];

  it('sums payments and expenses inclusively at both boundaries', () => {
    expect(
      sumPaymentsInRange(payments, '2025-04-01', '2025-04-30'),
    ).toBe(300);

    expect(
      sumExpensesInRange(expenses, '2025-04-01', '2025-04-30'),
    ).toBe(120);
  });

  it('computes net cash movement', () => {
    expect(netCashMovementPaise(500, 200)).toBe(300);
  });
});

describe('monthly revenue and expenses series', () => {
  it('buckets by month, zero-fills, keeps order, and ignores out-of-range rows', () => {
    const months = [
      { key: '2025-03', label: 'Mar 25' },
      { key: '2025-04', label: 'Apr 25' },
      { key: '2025-05', label: 'May 25' },
    ];

    const payments: PaymentRow[] = [
      { id: 'p1', amount_paise: 100, payment_date: '2025-04-02' },
      { id: 'p2', amount_paise: 50, payment_date: '2025-04-20' },
      { id: 'p3', amount_paise: 999, payment_date: '2025-06-01' },
    ];

    const expenses: ExpenseRow[] = [
      { id: 'e1', amount_paise: 30, expense_date: '2025-03-05' },
    ];

    const snapshot = JSON.parse(JSON.stringify({ payments, expenses }));

    expect(
      monthlyRevenueExpensesSeries(payments, expenses, months),
    ).toEqual([
      { key: '2025-03', label: 'Mar 25', revenuePaise: 0, expensesPaise: 30 },
      { key: '2025-04', label: 'Apr 25', revenuePaise: 150, expensesPaise: 0 },
      { key: '2025-05', label: 'May 25', revenuePaise: 0, expensesPaise: 0 },
    ]);

    expect({ payments, expenses }).toEqual(snapshot);
  });
});
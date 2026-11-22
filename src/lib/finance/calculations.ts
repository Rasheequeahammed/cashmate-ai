import { monthKeyIST } from './dateWindows';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue';

export const ISSUED_STATUSES: readonly InvoiceStatus[] = [
  'sent',
  'partially_paid',
  'overdue',
];

/**
 * All monetary amounts are integer paise.
 * Dates use IST YYYY-MM-DD strings.
 */

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  created_at: string;
  total_paise: number;
  amount_paid_paise: number;
  outstanding_paise: number;
}

export interface PaymentRow {
  id: string;
  amount_paise: number;
  payment_date: string;
}

export interface ExpenseRow {
  id: string;
  amount_paise: number;
  expense_date: string;
}

/**
 * Deterministic string comparison.
 * Avoids locale-dependent sorting.
 */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Checks whether an invoice has been issued
 * and still has an outstanding balance.
 */
function isIssued(inv: InvoiceRow): boolean {
  return (
    ISSUED_STATUSES.includes(inv.status) &&
    inv.outstanding_paise > 0
  );
}

/**
 * Determines overdue status dynamically.
 * Does not rely on the stored invoice status.
 */
export function isOverdue(
  inv: InvoiceRow,
  todayIST: string,
): boolean {
  return isIssued(inv) && inv.due_date < todayIST;
}

/**
 * Calculates total outstanding receivables.
 * Excludes drafts and paid invoices.
 */
export function receivablesPaise(
  invoices: readonly InvoiceRow[],
): number {
  let total = 0;

  for (const inv of invoices) {
    if (isIssued(inv)) {
      total += inv.outstanding_paise;
    }
  }

  return total;
}

/**
 * Returns the five most urgent overdue invoices.
 *
 * Sorting:
 * 1. Outstanding balance: highest first.
 * 2. Due date: earliest first.
 * 3. Invoice ID: deterministic tie-breaker.
 */
export function overdueInvoices(
  invoices: readonly InvoiceRow[],
  todayIST: string,
): InvoiceRow[] {
  return invoices
    .filter((inv) => isOverdue(inv, todayIST))
    .sort(
      (a, b) =>
        b.outstanding_paise - a.outstanding_paise ||
        compareStrings(a.due_date, b.due_date) ||
        compareStrings(a.id, b.id),
    )
    .slice(0, 5);
}

/**
 * Returns the five most recently created invoices.
 * Includes draft invoices.
 */
export function recentInvoices(
  invoices: readonly InvoiceRow[],
): InvoiceRow[] {
  return [...invoices]
    .sort((a, b) => {
      const timeDifference =
        Date.parse(b.created_at) -
        Date.parse(a.created_at);

      if (
        Number.isNaN(timeDifference) ||
        timeDifference === 0
      ) {
        return compareStrings(a.id, b.id);
      }

      return timeDifference;
    })
    .slice(0, 5);
}

/**
 * Sums payments within an inclusive date range.
 */
export function sumPaymentsInRange(
  payments: readonly PaymentRow[],
  start: string,
  end: string,
): number {
  let total = 0;

  for (const payment of payments) {
    if (
      payment.payment_date >= start &&
      payment.payment_date <= end
    ) {
      total += payment.amount_paise;
    }
  }

  return total;
}

/**
 * Sums expenses within an inclusive date range.
 */
export function sumExpensesInRange(
  expenses: readonly ExpenseRow[],
  start: string,
  end: string,
): number {
  let total = 0;

  for (const expense of expenses) {
    if (
      expense.expense_date >= start &&
      expense.expense_date <= end
    ) {
      total += expense.amount_paise;
    }
  }

  return total;
}

/**
 * Calculates monthly net cash movement.
 *
 * Net cash movement = Revenue - Expenses
 */
export function netCashMovementPaise(
  paymentsPaise: number,
  expensesPaise: number,
): number {
  return paymentsPaise - expensesPaise;
}

export interface MonthlySeriesPoint {
  key: string;
  label: string;
  revenuePaise: number;
  expensesPaise: number;
}

/**
 * Creates the six-month revenue-versus-expenses series.
 *
 * Groups payments and expenses by IST calendar month.
 * Months without transactions receive zero values.
 * Data outside the supplied month window is ignored.
 */
export function monthlyRevenueExpensesSeries(
  payments: readonly PaymentRow[],
  expenses: readonly ExpenseRow[],
  months: ReadonlyArray<{
    key: string;
    label: string;
  }>,
): MonthlySeriesPoint[] {
  const revenue = new Map<string, number>();
  const spend = new Map<string, number>();

  for (const payment of payments) {
    const key = monthKeyIST(payment.payment_date);

    revenue.set(
      key,
      (revenue.get(key) ?? 0) +
        payment.amount_paise,
    );
  }

  for (const expense of expenses) {
    const key = monthKeyIST(expense.expense_date);

    spend.set(
      key,
      (spend.get(key) ?? 0) +
        expense.amount_paise,
    );
  }

  return months.map((month) => ({
    key: month.key,
    label: month.label,
    revenuePaise: revenue.get(month.key) ?? 0,
    expensesPaise: spend.get(month.key) ?? 0,
  }));
}
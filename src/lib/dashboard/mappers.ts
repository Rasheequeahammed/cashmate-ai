import { parseToPaise } from "../finance/money";
import type {
  InvoiceRow,
  InvoiceStatus,
  PaymentRow,
  ExpenseRow,
} from "../finance/calculations";

export interface RawCustomerJoin {
  name?: string | null;
}

export interface RawInvoice {
  id: string;
  customer_id?: string | null;
  invoice_number?: string | null;
  status?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  outstanding_balance?: number | string | null;
  customer?: RawCustomerJoin | null;
  customers?: RawCustomerJoin | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface DashboardInvoiceRow extends InvoiceRow {
  customer_name: string;
  customer_phone: string | null;
}

export interface RawPayment {
  id: string;
  amount?: number | string | null;
  payment_date?: string | null;
}

export interface RawExpense {
  id: string;
  amount?: number | string | null;
  expense_date?: string | null;
}

const VALID_STATUSES = new Set<InvoiceStatus>([
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
]);

/**
 * Converts a numeric or string rupee amount into integer paise.
 * Returns 0 if input is null, undefined, or invalid.
 */
export function toPaise(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return 0;
    }
    return parseToPaise(value.toFixed(2)) ?? 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    return parseToPaise(trimmed) ?? 0;
  }

  return 0;
}

function normalizeStatus(status?: string | null): InvoiceStatus {
  if (status && VALID_STATUSES.has(status as InvoiceStatus)) {
    return status as InvoiceStatus;
  }
  return "draft";
}

/**
 * Maps a raw Supabase invoice row to the strongly-typed DashboardInvoiceRow.
 * Safely defaults missing customer names to "Customer name unavailable".
 */
export function mapInvoice(raw: RawInvoice): DashboardInvoiceRow {
  const customerName =
    raw.customer_name ??
    raw.customer?.name ??
    raw.customers?.name ??
    "Customer name unavailable";

  return {
    id: raw.id,
    invoice_number: raw.invoice_number ?? "",
    status: normalizeStatus(raw.status),
    issue_date: raw.issue_date ?? "",
    due_date: raw.due_date ?? "",
    created_at: raw.created_at ?? "",
    total_paise: toPaise(raw.total_amount),
    amount_paid_paise: toPaise(raw.amount_paid),
    outstanding_paise: toPaise(raw.outstanding_balance),
    customer_name: customerName,
    customer_phone: raw.customer_phone ?? null,
  };
}

/**
 * Maps an array of raw Supabase invoice rows.
 */
export function mapInvoices(rawList: RawInvoice[] = []): DashboardInvoiceRow[] {
  return rawList.map(mapInvoice);
}

/**
 * Maps a raw Supabase payment row to PaymentRow.
 */
export function mapPayment(raw: RawPayment): PaymentRow {
  return {
    id: raw.id,
    amount_paise: toPaise(raw.amount),
    payment_date: raw.payment_date ?? "",
  };
}

/**
 * Maps an array of raw Supabase payment rows.
 */
export function mapPayments(rawList: RawPayment[] = []): PaymentRow[] {
  return rawList.map(mapPayment);
}

/**
 * Maps a raw Supabase expense row to ExpenseRow.
 */
export function mapExpense(raw: RawExpense): ExpenseRow {
  return {
    id: raw.id,
    amount_paise: toPaise(raw.amount),
    expense_date: raw.expense_date ?? "",
  };
}

/**
 * Maps an array of raw Supabase expense rows.
 */
export function mapExpenses(rawList: RawExpense[] = []): ExpenseRow[] {
  return rawList.map(mapExpense);
}

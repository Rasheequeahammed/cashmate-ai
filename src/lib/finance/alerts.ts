import { diffDays } from "./dateWindows";

export type AlertSeverity = "overdue" | "due_today" | "upcoming";

export interface AlertableInvoice {
  id: string;
  invoice_number?: string | null;
  status?: string | null;
  due_date?: string | null;
  total_paise: number;
  amount_paid_paise?: number;
  outstanding_paise: number;
  customer_name?: string | null;
  customer_id?: string | null;
}

export interface InvoiceAlert {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  dueDate: string;
  totalPaise: number;
  amountPaidPaise: number;
  outstandingPaise: number;
  severity: AlertSeverity;
  daysOverdue?: number;
  daysUntilDue?: number;
  recommendedAction: string;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  overdue: 1,
  due_today: 2,
  upcoming: 3,
};

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Evaluates invoices against current IST date and returns sorted actionable alerts.
 * Excludes draft invoices and fully paid invoices.
 * Classifies eligible unpaid invoices into:
 * - Overdue (due_date < todayIST): "Chase this invoice today."
 * - Due Today (due_date === todayIST): "Follow up on payment today."
 * - Upcoming (due_date in next 1 to 3 days): "Prepare a payment follow-up."
 */
export function getInvoiceAlerts(
  invoices: readonly AlertableInvoice[],
  todayIST: string,
): InvoiceAlert[] {
  const alerts: InvoiceAlert[] = [];

  for (const inv of invoices) {
    // Exclude drafts
    if (inv.status === "draft") {
      continue;
    }

    // Exclude fully paid or invalid balances
    if (inv.status === "paid" || inv.outstanding_paise <= 0) {
      continue;
    }

    if (!inv.due_date) {
      continue;
    }

    let diff: number;
    try {
      diff = diffDays(todayIST, inv.due_date);
    } catch {
      continue;
    }

    const customerName = inv.customer_name?.trim() || "Customer name unavailable";
    const invoiceNumber = inv.invoice_number?.trim() || "Draft";
    const amountPaidPaise = inv.amount_paid_paise ?? Math.max(0, inv.total_paise - inv.outstanding_paise);

    if (diff < 0) {
      // Overdue
      const daysOverdue = Math.abs(diff);
      alerts.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber,
        customerId: inv.customer_id ?? undefined,
        customerName,
        dueDate: inv.due_date,
        totalPaise: inv.total_paise,
        amountPaidPaise,
        outstandingPaise: inv.outstanding_paise,
        severity: "overdue",
        daysOverdue,
        recommendedAction: "Chase this invoice today.",
      });
    } else if (diff === 0) {
      // Due Today
      alerts.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber,
        customerId: inv.customer_id ?? undefined,
        customerName,
        dueDate: inv.due_date,
        totalPaise: inv.total_paise,
        amountPaidPaise,
        outstandingPaise: inv.outstanding_paise,
        severity: "due_today",
        daysUntilDue: 0,
        recommendedAction: "Follow up on payment today.",
      });
    } else if (diff >= 1 && diff <= 3) {
      // Upcoming (next 3 days)
      alerts.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber,
        customerId: inv.customer_id ?? undefined,
        customerName,
        dueDate: inv.due_date,
        totalPaise: inv.total_paise,
        amountPaidPaise,
        outstandingPaise: inv.outstanding_paise,
        severity: "upcoming",
        daysUntilDue: diff,
        recommendedAction: "Prepare a payment follow-up.",
      });
    }
  }

  // Sorting
  return alerts.sort((a, b) => {
    // 1. Severity tier
    const orderA = SEVERITY_ORDER[a.severity];
    const orderB = SEVERITY_ORDER[b.severity];
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // 2. Specific tier logic
    if (a.severity === "overdue") {
      // Highest outstanding first
      if (b.outstandingPaise !== a.outstandingPaise) {
        return b.outstandingPaise - a.outstandingPaise;
      }
      // Earliest due date (longest overdue) first
      if (a.dueDate !== b.dueDate) {
        return compareStrings(a.dueDate, b.dueDate);
      }
    } else if (a.severity === "due_today") {
      // Highest outstanding first
      if (b.outstandingPaise !== a.outstandingPaise) {
        return b.outstandingPaise - a.outstandingPaise;
      }
    } else if (a.severity === "upcoming") {
      // Earliest due date first
      if (a.dueDate !== b.dueDate) {
        return compareStrings(a.dueDate, b.dueDate);
      }
      // Highest outstanding first
      if (b.outstandingPaise !== a.outstandingPaise) {
        return b.outstandingPaise - a.outstandingPaise;
      }
    }

    // Tie-breaker
    return compareStrings(a.invoiceNumber, b.invoiceNumber) || compareStrings(a.id, b.id);
  });
}

import { describe, it, expect } from "vitest";
import { getInvoiceAlerts, type AlertableInvoice } from "./alerts";

describe("getInvoiceAlerts", () => {
  const TODAY = "2026-11-22";

  it("identifies overdue invoices with outstanding balances", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-1",
        invoice_number: "INV-001",
        status: "sent",
        due_date: "2026-11-18",
        total_paise: 50000,
        amount_paid_paise: 0,
        outstanding_paise: 50000,
        customer_name: "Acme Corp",
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      invoiceId: "inv-1",
      invoiceNumber: "INV-001",
      customerName: "Acme Corp",
      dueDate: "2026-11-18",
      outstandingPaise: 50000,
      severity: "overdue",
      daysOverdue: 4,
      recommendedAction: "Chase this invoice today.",
    });
  });

  it("identifies invoices due today", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-2",
        invoice_number: "INV-002",
        status: "sent",
        due_date: "2026-11-22",
        total_paise: 75000,
        amount_paid_paise: 25000,
        outstanding_paise: 50000,
        customer_name: "Stark Industries",
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      invoiceId: "inv-2",
      invoiceNumber: "INV-002",
      customerName: "Stark Industries",
      dueDate: "2026-11-22",
      outstandingPaise: 50000,
      severity: "due_today",
      daysUntilDue: 0,
      recommendedAction: "Follow up on payment today.",
    });
  });

  it("identifies invoices due within 1 to 3 days as upcoming", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-3",
        invoice_number: "INV-003",
        status: "sent",
        due_date: "2026-11-23", // +1 day
        total_paise: 30000,
        outstanding_paise: 30000,
        customer_name: "Wayne Enterprises",
      },
      {
        id: "inv-4",
        invoice_number: "INV-004",
        status: "sent",
        due_date: "2026-11-25", // +3 days
        total_paise: 40000,
        outstanding_paise: 40000,
        customer_name: "Cyberdyne Systems",
      },
      {
        id: "inv-5",
        invoice_number: "INV-005",
        status: "sent",
        due_date: "2026-11-26", // +4 days (outside 3-day window)
        total_paise: 90000,
        outstanding_paise: 90000,
        customer_name: "Initech",
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.invoiceNumber)).toEqual(["INV-003", "INV-004"]);
    expect(alerts[0].severity).toBe("upcoming");
    expect(alerts[0].daysUntilDue).toBe(1);
    expect(alerts[0].recommendedAction).toBe("Prepare a payment follow-up.");
    expect(alerts[1].severity).toBe("upcoming");
    expect(alerts[1].daysUntilDue).toBe(3);
  });

  it("excludes draft invoices even if past due date", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-draft",
        invoice_number: "INV-DRAFT",
        status: "draft",
        due_date: "2026-11-10",
        total_paise: 100000,
        outstanding_paise: 100000,
        customer_name: "Draft Customer",
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(0);
  });

  it("excludes fully paid invoices", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-paid-1",
        invoice_number: "INV-PAID-1",
        status: "paid",
        due_date: "2026-11-10",
        total_paise: 50000,
        amount_paid_paise: 50000,
        outstanding_paise: 0,
        customer_name: "Paid Customer 1",
      },
      {
        id: "inv-paid-2",
        invoice_number: "INV-PAID-2",
        status: "sent", // Status not updated yet, but balance is 0
        due_date: "2026-11-15",
        total_paise: 50000,
        amount_paid_paise: 50000,
        outstanding_paise: 0,
        customer_name: "Paid Customer 2",
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(0);
  });

  it("sorts alerts by severity priority: overdue, due_today, upcoming", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "upc-1",
        invoice_number: "INV-UPC",
        status: "sent",
        due_date: "2026-11-23",
        total_paise: 100000,
        outstanding_paise: 100000,
      },
      {
        id: "today-1",
        invoice_number: "INV-TODAY",
        status: "sent",
        due_date: "2026-11-22",
        total_paise: 50000,
        outstanding_paise: 50000,
      },
      {
        id: "ovd-small",
        invoice_number: "INV-OVD-1",
        status: "sent",
        due_date: "2026-11-20",
        total_paise: 20000,
        outstanding_paise: 20000,
      },
      {
        id: "ovd-large",
        invoice_number: "INV-OVD-2",
        status: "sent",
        due_date: "2026-11-19",
        total_paise: 80000,
        outstanding_paise: 80000,
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts.map((a) => a.invoiceNumber)).toEqual([
      "INV-OVD-2", // Overdue: higher balance (80,000)
      "INV-OVD-1", // Overdue: lower balance (20,000)
      "INV-TODAY", // Due today
      "INV-UPC",   // Upcoming
    ]);
  });

  it("handles missing customer name gracefully", () => {
    const invoices: AlertableInvoice[] = [
      {
        id: "inv-anon",
        invoice_number: "INV-999",
        status: "sent",
        due_date: "2026-11-20",
        total_paise: 15000,
        outstanding_paise: 15000,
        customer_name: null,
      },
    ];

    const alerts = getInvoiceAlerts(invoices, TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].customerName).toBe("Customer name unavailable");
  });
});

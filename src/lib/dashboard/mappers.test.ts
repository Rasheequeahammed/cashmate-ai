import { describe, it, expect } from "vitest";
import {
  toPaise,
  mapInvoice,
  mapInvoices,
  mapPayment,
  mapPayments,
  mapExpense,
  mapExpenses,
  type RawInvoice,
  type RawPayment,
  type RawExpense,
} from "./mappers";

describe("toPaise conversion", () => {
  it("converts number rupees to integer paise", () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(100.5)).toBe(10050);
    expect(toPaise(0.05)).toBe(5);
    expect(toPaise(0)).toBe(0);
  });

  it("converts string rupees to integer paise", () => {
    expect(toPaise("1,234.50")).toBe(123450);
    expect(toPaise("500")).toBe(50000);
    expect(toPaise("0.75")).toBe(75);
    expect(toPaise("-25.50")).toBe(-2550);
  });

  it("handles null, undefined, and invalid values gracefully", () => {
    expect(toPaise(null)).toBe(0);
    expect(toPaise(undefined)).toBe(0);
    expect(toPaise("")).toBe(0);
    expect(toPaise("invalid")).toBe(0);
    expect(toPaise(Number.NaN)).toBe(0);
    expect(toPaise(Infinity)).toBe(0);
  });
});

describe("mapInvoice and mapInvoices", () => {
  it("correctly maps a complete raw invoice", () => {
    const raw: RawInvoice = {
      id: "inv-1",
      invoice_number: "INV-202611-001",
      status: "sent",
      issue_date: "2026-11-01",
      due_date: "2026-11-15",
      created_at: "2026-11-01T10:00:00Z",
      total_amount: 1500.5,
      amount_paid: 500,
      outstanding_balance: 1000.5,
      customer: { name: "Acme Corp" },
    };

    const mapped = mapInvoice(raw);

    expect(mapped.id).toBe("inv-1");
    expect(mapped.invoice_number).toBe("INV-202611-001");
    expect(mapped.status).toBe("sent");
    expect(mapped.issue_date).toBe("2026-11-01");
    expect(mapped.due_date).toBe("2026-11-15");
    expect(mapped.created_at).toBe("2026-11-01T10:00:00Z");
    expect(mapped.total_paise).toBe(150050);
    expect(mapped.amount_paid_paise).toBe(50000);
    expect(mapped.outstanding_paise).toBe(100050);
    expect(mapped.customer_name).toBe("Acme Corp");
  });

  it("resolves customer name from customers join or direct property", () => {
    const rawFromJoin: RawInvoice = {
      id: "inv-2",
      customers: { name: "Beta Ltd" },
    };
    expect(mapInvoice(rawFromJoin).customer_name).toBe("Beta Ltd");

    const rawDirect: RawInvoice = {
      id: "inv-3",
      customer_name: "Gamma LLC",
    };
    expect(mapInvoice(rawDirect).customer_name).toBe("Gamma LLC");
  });

  it("safely falls back to 'Customer name unavailable' when missing", () => {
    const rawNoCustomer: RawInvoice = {
      id: "inv-no-cust",
    };
    expect(mapInvoice(rawNoCustomer).customer_name).toBe(
      "Customer name unavailable",
    );
  });

  it("normalizes invalid or missing status to draft", () => {
    const raw: RawInvoice = {
      id: "inv-4",
      status: "unknown_status",
    };
    expect(mapInvoice(raw).status).toBe("draft");
  });

  it("maps multiple invoices", () => {
    const rawList: RawInvoice[] = [
      { id: "inv-1", total_amount: 100 },
      { id: "inv-2", total_amount: 200 },
    ];
    const mapped = mapInvoices(rawList);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].total_paise).toBe(10000);
    expect(mapped[1].total_paise).toBe(20000);
  });

  it("handles empty array or undefined in mapInvoices", () => {
    expect(mapInvoices([])).toEqual([]);
    expect(mapInvoices(undefined)).toEqual([]);
  });
});

describe("mapPayment and mapPayments", () => {
  it("correctly maps raw payment", () => {
    const raw: RawPayment = {
      id: "pay-1",
      amount: 750.25,
      payment_date: "2026-11-10",
    };
    const mapped = mapPayment(raw);
    expect(mapped.id).toBe("pay-1");
    expect(mapped.amount_paise).toBe(75025);
    expect(mapped.payment_date).toBe("2026-11-10");
  });

  it("maps multiple payments", () => {
    const rawList: RawPayment[] = [
      { id: "p1", amount: 100 },
      { id: "p2", amount: 200 },
    ];
    const mapped = mapPayments(rawList);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].amount_paise).toBe(10000);
    expect(mapped[1].amount_paise).toBe(20000);
  });
});

describe("mapExpense and mapExpenses", () => {
  it("correctly maps raw expense", () => {
    const raw: RawExpense = {
      id: "exp-1",
      amount: 320.5,
      expense_date: "2026-11-05",
    };
    const mapped = mapExpense(raw);
    expect(mapped.id).toBe("exp-1");
    expect(mapped.amount_paise).toBe(32050);
    expect(mapped.expense_date).toBe("2026-11-05");
  });

  it("maps multiple expenses", () => {
    const rawList: RawExpense[] = [
      { id: "e1", amount: 50 },
      { id: "e2", amount: 150 },
    ];
    const mapped = mapExpenses(rawList);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].amount_paise).toBe(5000);
    expect(mapped[1].amount_paise).toBe(15000);
  });
});

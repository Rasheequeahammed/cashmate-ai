import { describe, it, expect } from "vitest";
import { generatePaymentReminder, formatReadableDate } from "./reminders";

describe("formatReadableDate", () => {
  it("formats standard YYYY-MM-DD into readable string", () => {
    expect(formatReadableDate("2026-12-07")).toBe("December 7, 2026");
    expect(formatReadableDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns original string if format is invalid", () => {
    expect(formatReadableDate("invalid-date")).toBe("invalid-date");
    expect(formatReadableDate("")).toBe("");
  });
});

describe("generatePaymentReminder", () => {
  const TODAY = "2026-11-22";

  it("generates an overdue payment reminder with polite request", () => {
    const reminder = generatePaymentReminder({
      customerName: "Acme Enterprises",
      invoiceNumber: "INV-202611-001",
      outstandingPaise: 60000, // ₹600.00
      dueDate: "2026-11-15",
      todayIST: TODAY,
      businessName: "CASHMATE Services",
    });

    expect(reminder).toContain("Hello Acme Enterprises,");
    expect(reminder).toContain("regarding invoice INV-202611-001 for ₹600.00, which was due on November 15, 2026.");
    expect(reminder).toContain("We kindly request you to arrange the pending payment at your earliest convenience.");
    expect(reminder).toContain("Please let us know if you have already completed the payment.");
    expect(reminder).toContain("Thank you,\nCASHMATE Services");
  });

  it("generates a due-today payment reminder", () => {
    const reminder = generatePaymentReminder({
      customerName: "Wayne Enterprises",
      invoiceNumber: "INV-202611-005",
      outstandingPaise: 125050, // ₹1,250.50
      dueDate: "2026-11-22",
      todayIST: TODAY,
    });

    expect(reminder).toContain("Hello Wayne Enterprises,");
    expect(reminder).toContain("which is due today, November 22, 2026.");
    expect(reminder).toContain("We kindly request you to process the pending payment today.");
    expect(reminder).toContain("Thank you.");
  });

  it("generates an upcoming payment reminder", () => {
    const reminder = generatePaymentReminder({
      customerName: "Stark Industries",
      invoiceNumber: "INV-202611-010",
      outstandingPaise: 350000, // ₹3,500.00
      dueDate: "2026-11-25",
      todayIST: TODAY,
    });

    expect(reminder).toContain("Hello Stark Industries,");
    expect(reminder).toContain("which is due on November 25, 2026.");
    expect(reminder).toContain("We kindly request you to arrange the pending payment by the due date.");
  });

  it("uses outstanding amount, not original total", () => {
    // Total was ₹1,000 (100,000 paise), but outstanding is ₹250 (25,000 paise)
    const reminder = generatePaymentReminder({
      customerName: "Partial Payer",
      invoiceNumber: "INV-PARTIAL",
      outstandingPaise: 25000,
      dueDate: "2026-11-20",
      todayIST: TODAY,
    });

    expect(reminder).toContain("for ₹250.00");
    expect(reminder).not.toContain("1,000");
  });

  it("falls back to 'Valued Customer' when customer name is missing", () => {
    const reminder = generatePaymentReminder({
      customerName: null,
      invoiceNumber: "INV-ANON",
      outstandingPaise: 50000,
      dueDate: "2026-11-20",
      todayIST: TODAY,
    });

    expect(reminder).toContain("Hello Valued Customer,");
  });
});

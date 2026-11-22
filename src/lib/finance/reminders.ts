import { formatINR } from "./money";

export interface ReminderOptions {
  customerName?: string | null;
  invoiceNumber?: string | null;
  outstandingPaise: number;
  dueDate: string;
  todayIST?: string;
  businessName?: string | null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats a YYYY-MM-DD date string into a human-friendly format (e.g., "December 7, 2026").
 * Falls back to the raw string if parsing fails.
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    return dateStr ?? "";
  }

  const parts = dateStr.trim().split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
    }
  }

  return dateStr;
}

/**
 * Generates a polite, deterministic payment reminder message.
 * Strictly uses the actual outstanding amount (never the original total).
 * Customizes the tense and urgency based on whether the invoice is overdue,
 * due today, or upcoming.
 */
export function generatePaymentReminder({
  customerName,
  invoiceNumber,
  outstandingPaise,
  dueDate,
  todayIST,
  businessName,
}: ReminderOptions): string {
  const safeCustomer = customerName?.trim() || "Valued Customer";
  const safeInvoiceNumber = invoiceNumber?.trim() || "your pending invoice";
  const formattedAmount = formatINR(outstandingPaise);
  const formattedDueDate = formatReadableDate(dueDate);

  let timingSentence: string;
  let actionSentence: string;

  if (todayIST && dueDate < todayIST) {
    // Overdue
    timingSentence = `which was due on ${formattedDueDate}`;
    actionSentence =
      "We kindly request you to arrange the pending payment at your earliest convenience.";
  } else if (todayIST && dueDate === todayIST) {
    // Due today
    timingSentence = `which is due today, ${formattedDueDate}`;
    actionSentence =
      "We kindly request you to process the pending payment today.";
  } else {
    // Upcoming or future
    timingSentence = `which is due on ${formattedDueDate}`;
    actionSentence =
      "We kindly request you to arrange the pending payment by the due date.";
  }

  const senderSignoff = businessName?.trim()
    ? `\n\nThank you,\n${businessName.trim()}`
    : "\n\nThank you.";

  return [
    `Hello ${safeCustomer},`,
    "",
    `This is a friendly reminder regarding invoice ${safeInvoiceNumber} for ${formattedAmount}, ${timingSentence}.`,
    "",
    actionSentence,
    "",
    "Please let us know if you have already completed the payment.",
    senderSignoff,
  ].join("\n");
}

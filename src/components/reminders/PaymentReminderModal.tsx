import { useState, useEffect, useRef } from "react";
import { formatINR } from "../../lib/finance/money";
import { todayIST } from "../../lib/finance/dateWindows";
import { generatePaymentReminder, formatReadableDate } from "../../lib/finance/reminders";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Copy, Check, X, RotateCcw, AlertCircle, MessageCircle } from "lucide-react";
import { normalizeInternationalPhone } from "../../lib/finance/phone";

export interface ReminderInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  outstandingPaise: number;
  dueDate: string;
  businessName?: string | null;
}

export interface PaymentReminderModalProps {
  invoice: ReminderInvoiceData | null;
  onClose: () => void;
}

export function PaymentReminderModal({ invoice, onClose }: PaymentReminderModalProps) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const today = todayIST(new Date());

  // Initialize reminder text whenever the invoice changes
  useEffect(() => {
    if (invoice) {
      const initial = generatePaymentReminder({
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        outstandingPaise: invoice.outstandingPaise,
        dueDate: invoice.dueDate,
        todayIST: today,
        businessName: invoice.businessName,
      });
      setMessage(initial);
      setCopied(false);
      setCopyFeedback(null);
    }
  }, [invoice, today]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!invoice) return null;

  const isOverdue = invoice.dueDate < today;
  const isDueToday = invoice.dueDate === today;
  const whatsappNumber = normalizeInternationalPhone(invoice.customerPhone);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.slice(1)}?text=${encodeURIComponent(message)}`
    : null;

  async function handleCopy() {
    setCopyFeedback(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setCopyFeedback("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch {
      // Fallback below
    }

    // Fallback: select text in textarea and use execCommand
    try {
      if (textareaRef.current) {
        textareaRef.current.select();
        const success = document.execCommand("copy");
        if (success) {
          setCopied(true);
          setCopyFeedback("Copied to clipboard!");
          setTimeout(() => setCopied(false), 2500);
          return;
        }
      }
    } catch {
      // Fallback failed
    }

    // Manual copy fallback notice
    if (textareaRef.current) {
      textareaRef.current.select();
    }
    setCopyFeedback("Automatic copy unavailable. Text selected — press Ctrl+C / Cmd+C to copy.");
  }

  function handleReset() {
    if (!invoice) return;
    const initial = generatePaymentReminder({
      customerName: invoice.customerName,
      invoiceNumber: invoice.invoiceNumber,
      outstandingPaise: invoice.outstandingPaise,
      dueDate: invoice.dueDate,
      todayIST: today,
      businessName: invoice.businessName,
    });
    setMessage(initial);
    setCopied(false);
    setCopyFeedback("Reset to default template.");
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-xl bg-white shadow-2xl">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle id="reminder-modal-title" className="text-lg font-bold text-slate-900">
                  Payment Reminder
                </CardTitle>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                    isOverdue
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : isDueToday
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {isOverdue ? "Overdue" : isDueToday ? "Due Today" : "Upcoming"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Invoice <span className="font-semibold text-slate-700">{invoice.invoiceNumber}</span> for{" "}
                <span className="font-semibold text-slate-700">
                  {invoice.customerName || "Customer"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reminder modal"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400">Outstanding Balance: </span>
              <span className="font-semibold text-slate-900">
                {formatINR(invoice.outstandingPaise)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Due Date: </span>
              <span className="font-semibold text-slate-900">
                {formatReadableDate(invoice.dueDate)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reminder-message" className="text-xs font-semibold text-slate-700">
                Message Draft (Editable)
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition"
              >
                <RotateCcw className="h-3 w-3" />
                Reset template
              </button>
            </div>
            <textarea
              id="reminder-message"
              ref={textareaRef}
              rows={8}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setCopied(false);
                setCopyFeedback(null);
              }}
              className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              placeholder="Edit your reminder message here..."
            />
          </div>

          {/* Copy feedback */}
          {copyFeedback && (
            <p
              className={`text-xs ${
                copied ? "text-emerald-600 font-medium" : "text-amber-700"
              }`}
            >
              {copyFeedback}
            </p>
          )}

          {/* Security & Non-mutation notice */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 p-2.5 border border-amber-200/80 text-[11px] text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              WhatsApp opens with this draft filled in. Review it and tap Send in WhatsApp; CASHMATE AI does not send messages automatically.
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[40px] text-sm"
            >
              Close
            </Button>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp
              </a>
            )}
            <Button
              type="button"
              onClick={handleCopy}
              className={`w-full sm:w-auto min-h-[40px] text-sm text-white ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Reminder
                </>
              )}
            </Button>
          </div>
          {!whatsappUrl && (
            <p className="text-xs text-amber-700">
              Add the customer’s mobile number with its country code (for example, +91 98765 43210) on the Customers page to open this reminder in WhatsApp.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

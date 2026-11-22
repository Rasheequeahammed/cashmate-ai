import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { formatINR } from "../../lib/finance/money";
import { isOverdue } from "../../lib/finance/calculations";
import { todayIST } from "../../lib/finance/dateWindows";
import type { DashboardInvoiceRow } from "../../lib/dashboard/mappers";
import type { ReminderInvoiceData } from "../reminders/PaymentReminderModal";
import { MessageSquare } from "lucide-react";
import { cn } from "../../lib/utils";

export interface InvoiceListProps {
  title: string;
  invoices: DashboardInvoiceRow[];
  type: "recent" | "overdue";
  emptyMessage?: string;
  className?: string;
  onSelectReminder?: (invoice: ReminderInvoiceData) => void;
  businessName?: string;
}

export function InvoiceList({
  title,
  invoices,
  type,
  emptyMessage,
  className,
  onSelectReminder,
  businessName,
}: InvoiceListProps) {
  const today = useMemo(() => todayIST(new Date()), []);

  const defaultEmpty =
    type === "overdue"
      ? "No overdue invoices — all accounts are up to date."
      : "No invoices created yet.";

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            {title}
          </CardTitle>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {invoices.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {invoices.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            <p>{emptyMessage ?? defaultEmpty}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              // Dynamic overdue check per PRD and clarification
              const dynamicOverdue = isOverdue(inv, today);
              const effectiveStatus = dynamicOverdue ? "overdue" : inv.status;

              const statusBadgeStyles = {
                draft: "bg-slate-100 text-slate-700 border-slate-200",
                sent: "bg-blue-50 text-blue-700 border-blue-200",
                partially_paid: "bg-amber-50 text-amber-700 border-amber-200",
                paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                overdue: "bg-rose-50 text-rose-700 border-rose-200",
              }[effectiveStatus];

              const statusLabel = {
                draft: "Draft",
                sent: "Sent",
                partially_paid: "Partially Paid",
                paid: "Paid",
                overdue: "Overdue",
              }[effectiveStatus];

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">
                        {inv.invoice_number || "Draft Invoice"}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          statusBadgeStyles,
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {inv.customer_name || "Customer name unavailable"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {type === "overdue"
                        ? `Due: ${inv.due_date || "N/A"}`
                        : `Issued: ${inv.issue_date || "N/A"}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1.5 text-left sm:text-right">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {type === "overdue"
                          ? formatINR(inv.outstanding_paise)
                          : formatINR(inv.total_paise)}
                      </div>
                      {type === "overdue" &&
                        inv.outstanding_paise < inv.total_paise && (
                          <p className="text-xs text-slate-400">
                            Total: {formatINR(inv.total_paise)}
                          </p>
                        )}
                    </div>
                    {type === "overdue" && onSelectReminder && inv.outstanding_paise > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onSelectReminder({
                            invoiceId: inv.id,
                            invoiceNumber: inv.invoice_number,
                            customerName: inv.customer_name,
                            outstandingPaise: inv.outstanding_paise,
                            dueDate: inv.due_date,
                            businessName,
                          })
                        }
                        className="h-7 px-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Reminder
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

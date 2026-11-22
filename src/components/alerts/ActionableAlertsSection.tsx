import { useState, useMemo } from "react";
import { formatINR } from "../../lib/finance/money";
import { todayIST } from "../../lib/finance/dateWindows";
import { getInvoiceAlerts, type InvoiceAlert, type AlertSeverity } from "../../lib/finance/alerts";
import { formatReadableDate } from "../../lib/finance/reminders";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  AlertTriangle,
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { ReminderInvoiceData } from "../reminders/PaymentReminderModal";
import type { DashboardInvoiceRow } from "../../lib/dashboard/mappers";

export interface ActionableAlertsSectionProps {
  invoices: readonly DashboardInvoiceRow[];
  onSelectReminder: (invoice: ReminderInvoiceData) => void;
  businessName?: string;
  className?: string;
}

export function ActionableAlertsSection({
  invoices,
  onSelectReminder,
  businessName,
  className = "",
}: ActionableAlertsSectionProps) {
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");

  const today = useMemo(() => todayIST(new Date()), []);
  const allAlerts = useMemo(() => getInvoiceAlerts(invoices, today), [invoices, today]);

  const overdueCount = allAlerts.filter((a) => a.severity === "overdue").length;
  const dueTodayCount = allAlerts.filter((a) => a.severity === "due_today").length;
  const upcomingCount = allAlerts.filter((a) => a.severity === "upcoming").length;

  const filteredAlerts = useMemo(() => {
    if (filter === "all") return allAlerts;
    return allAlerts.filter((a) => a.severity === filter);
  }, [allAlerts, filter]);

  if (allAlerts.length === 0) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 ${className}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">No invoices need attention</p>
          <p className="text-xs text-slate-600">Your issued invoices are on schedule or fully paid.</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-slate-200 bg-white shadow-sm ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Actionable Invoice Alerts
                </CardTitle>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {allAlerts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Invoices requiring immediate chase or payment follow-up
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          {allAlerts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({allAlerts.length})
              </button>
              {overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("overdue")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    filter === "overdue"
                      ? "bg-rose-700 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  Overdue ({overdueCount})
                </button>
              )}
              {dueTodayCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("due_today")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    filter === "due_today"
                      ? "bg-amber-700 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  Due Today ({dueTodayCount})
                </button>
              )}
              {upcomingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("upcoming")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    filter === "upcoming"
                      ? "bg-indigo-700 text-white"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                  }`}
                >
                  Next 3 Days ({upcomingCount})
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            <p>No invoices matching the selected filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAlerts.map((alert: InvoiceAlert) => {
              const isOverdue = alert.severity === "overdue";
              const isDueToday = alert.severity === "due_today";

              const severityBadge = isOverdue ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue by {alert.daysOverdue} {alert.daysOverdue === 1 ? "day" : "days"}
                </span>
              ) : isDueToday ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  <Clock className="h-3 w-3" />
                  Due Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  <Calendar className="h-3 w-3" />
                  Due in {alert.daysUntilDue} {alert.daysUntilDue === 1 ? "day" : "days"}
                </span>
              );

              const actionColor = isOverdue
                ? "text-rose-700 bg-rose-50 border-rose-200"
                : isDueToday
                  ? "text-amber-800 bg-amber-50 border-amber-200"
                  : "text-indigo-700 bg-indigo-50 border-indigo-200";

              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {alert.invoiceNumber}
                      </span>
                      {severityBadge}
                    </div>

                    <p className="text-sm font-medium text-slate-700 truncate">
                      {alert.customerName}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500">
                      <span>Due: {formatReadableDate(alert.dueDate)}</span>
                      <span>
                        Balance:{" "}
                        <strong className="text-slate-900 font-semibold">
                          {formatINR(alert.outstandingPaise)}
                        </strong>
                      </span>
                    </div>

                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${actionColor}`}
                      >
                        <ChevronRight className="h-3 w-3" />
                        Recommended action: {alert.recommendedAction}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      size="sm"
                      onClick={() =>
                        onSelectReminder({
                          invoiceId: alert.invoiceId,
                          invoiceNumber: alert.invoiceNumber,
                          customerName: alert.customerName,
                          customerPhone: alert.customerPhone,
                          outstandingPaise: alert.outstandingPaise,
                          dueDate: alert.dueDate,
                          businessName,
                        })
                      }
                      className="min-h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Generate Reminder
                    </Button>
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

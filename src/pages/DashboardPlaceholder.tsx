import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { useDashboardData } from "../hooks/useDashboardData";
import { formatINR } from "../lib/finance/money";
import { KpiCard } from "../components/dashboard/KpiCard";
import { RevenueExpenseChart } from "../components/dashboard/RevenueExpenseChart";
import { InvoiceList } from "../components/dashboard/InvoiceList";
import { ActionableAlertsSection } from "../components/alerts/ActionableAlertsSection";
import { PaymentReminderModal, type ReminderInvoiceData } from "../components/reminders/PaymentReminderModal";
import { Navbar } from "../components/Navbar";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";

function getSignOutError(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : "Could not log out. Please try again.";
}

/**
 * DashboardPlaceholder (Main Dashboard View)
 *
 * Full financial dashboard displaying:
 * - Business and user profile header with navigation and logout
 * - 4 core financial KPI cards
 * - 6-month Revenue vs. Expenses chart
 * - 5 Recent invoices and 5 urgently overdue invoices
 */
export function DashboardPlaceholder() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();

  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedReminderInvoice, setSelectedReminderInvoice] = useState<ReminderInvoiceData | null>(null);

  const { data, isLoading, isError, error, refetch } = useDashboardData(
    business?.id,
  );

  async function handleLogout() {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setLogoutError(getSignOutError(err));
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  CASHMATE AI
                </span>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Dashboard
                </span>
              </div>
              {business && (
                <h1 className="mt-1 text-sm font-medium text-slate-600 sm:text-base">
                  {business.name}
                </h1>
              )}
            </div>

            <Navbar />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              {user?.email ?? ""}
            </span>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
              className="min-h-[44px] min-w-[44px] px-4 text-sm font-medium"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {logoutError && (
          <Alert variant="destructive">
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {business?.name ?? "Your business"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Financial overview
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              A clear view of money in, money out, and invoices that need attention.
            </p>
          </div>
          <Button
            onClick={() => navigate("/invoices")}
            className="min-h-[44px] self-start px-5 sm:self-auto"
          >
            Create invoice
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
              <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
            </div>
          </div>
        )}

        {/* Error State with Retry Button */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertDescription>
                {error?.message ?? "An error occurred while loading dashboard data."}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => refetch()}
              className="min-h-[44px] min-w-[44px] px-6 text-sm font-medium"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Success Data Content */}
        {!isLoading && !isError && data && (
          <>
            {/* KPI Cards Grid */}
            <section
              aria-label="Key Performance Indicators"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                label="Total Outstanding Receivables"
                value={formatINR(data.metrics.receivablesPaise)}
                tone="default"
                subtext="Total unpaid from issued invoices"
              />
              <KpiCard
                label="Revenue This Month"
                value={formatINR(data.metrics.revenueThisMonthPaise)}
                tone="positive"
                subtext="Payments received in current month"
              />
              <KpiCard
                label="Expenses This Month"
                value={formatINR(data.metrics.expensesThisMonthPaise)}
                tone="negative"
                subtext="Paid one-time expenses"
              />
              <KpiCard
                label="Net Cash Movement This Month"
                value={formatINR(data.metrics.netCashMovementPaise)}
                tone={
                  data.metrics.netCashMovementPaise >= 0
                    ? "positive"
                    : "negative"
                }
                subtext={
                  data.metrics.netCashMovementPaise >= 0
                    ? "Positive monthly cash flow"
                    : "Net monthly cash outflow"
                }
              />
            </section>

            {/* Actionable Invoice Alerts */}
            <section aria-label="Actionable Invoice Alerts">
              <ActionableAlertsSection
                invoices={data.invoices}
                onSelectReminder={setSelectedReminderInvoice}
                businessName={business?.name}
              />
            </section>

            {/* 6-Month Revenue vs Expenses Chart */}
            <section aria-label="Revenue vs Expenses Chart">
              <RevenueExpenseChart data={data.chartData} />
            </section>

            {/* Invoices: Recent & Overdue */}
            <section
              aria-label="Invoices Overview"
              className="grid grid-cols-1 gap-6 lg:grid-cols-2"
            >
              <InvoiceList
                title="Recent Invoices"
                invoices={data.recentInvoices}
                type="recent"
                emptyMessage="No recent invoices created."
              />
              <InvoiceList
                title="Urgent Overdue Invoices"
                invoices={data.overdueInvoices}
                type="overdue"
                emptyMessage="No overdue invoices — all accounts are up to date."
                onSelectReminder={setSelectedReminderInvoice}
                businessName={business?.name}
              />
            </section>

            {/* Payment Reminder Generator Modal */}
            <PaymentReminderModal
              invoice={selectedReminderInvoice}
              onClose={() => setSelectedReminderInvoice(null)}
            />
          </>
        )}
      </main>
    </div>
  );
}

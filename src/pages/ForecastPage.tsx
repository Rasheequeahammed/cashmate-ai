import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBusiness } from '../hooks/useBusiness';
import { useForecastData } from '../hooks/useForecastData';
import { Navbar } from '../components/Navbar';
import { formatINR, parseToPaise } from '../lib/finance/money';
import {
  calculateCashFlowForecast,
  type ForecastPeriod,
} from '../lib/finance/forecast';
import {
  simulateDelayedPayment,
  type DelayedPaymentScenario,
  type DelayedPaymentSimulationResult,
} from '../lib/finance/simulation';
import { todayIST, addDaysIST } from '../lib/finance/dateWindows';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastAssumptions } from '../components/forecast/ForecastAssumptions';
import { WhatIfSimulationControls } from '../components/forecast/WhatIfSimulationControls';
import { KpiCard } from '../components/dashboard/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';

export function ForecastPage() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const navigate = useNavigate();

  // Period state (30, 60, or 90 days)
  const [period, setPeriod] = useState<ForecastPeriod>(30);

  // Opening Cash Balance state (default "0")
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');

  // Simulation state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<DelayedPaymentScenario | null>(null);

  const { data, isLoading, isError, error, refetch } = useForecastData(business?.id);

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Parse opening balance into integer paise strictly once
  const openingBalancePaise = useMemo(() => {
    return parseToPaise(openingBalanceStr) ?? 0;
  }, [openingBalanceStr]);

  // Compute baseline forecast deterministically
  const forecast = useMemo(() => {
    if (!data) return null;
    return calculateCashFlowForecast({
      invoices: data.invoices,
      recurringExpenses: data.recurringExpenses,
      period,
      openingBalancePaise,
    });
  }, [data, period, openingBalancePaise]);

  // Filter eligible outstanding invoices for what-if simulation (sent, partially_paid, or overdue <90d)
  const eligibleInvoicesForSimulation = useMemo(() => {
    if (!data?.invoices) return [];
    const today = todayIST(new Date());
    const cutoff = addDaysIST(today, -90);
    return data.invoices.filter(
      (inv) =>
        inv.status !== 'draft' &&
        inv.status !== 'paid' &&
        inv.outstanding_paise > 0 &&
        inv.due_date >= cutoff,
    );
  }, [data?.invoices]);

  // Compute what-if simulation reactively when active
  const simulationResult = useMemo<DelayedPaymentSimulationResult | null>(() => {
    if (!data || !activeScenario) return null;
    try {
      return simulateDelayedPayment({
        invoices: data.invoices,
        recurringExpenses: data.recurringExpenses,
        period,
        openingBalancePaise,
        scenario: activeScenario,
      });
    } catch (err) {
      console.error('Failed to run simulation:', err);
      return null;
    }
  }, [data, activeScenario, period, openingBalancePaise]);

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
                  Forecast
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
            <span className="text-sm text-slate-600">{user?.email ?? ''}</span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="min-h-[44px] min-w-[44px] px-4 text-sm font-medium"
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Title and Controls Header */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Cash Flow Forecasting & What-If Simulation
            </h2>
            <p className="text-sm text-slate-500">
              Deterministic 30, 60, and 90-day cash projections with hypothetical scenario testing.
            </p>
          </div>

          {/* Controls: Horizon & Opening Balance */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Horizon Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">
                Forecast Period
              </Label>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                {([30, 60, 90] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`min-h-[36px] rounded-md px-3.5 text-xs font-medium transition-all ${
                      period === p
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Opening Balance Input */}
            <div className="space-y-1.5">
              <Label htmlFor="opening-balance" className="text-xs font-semibold uppercase text-slate-500">
                Opening Cash Balance (₹)
              </Label>
              <div className="relative">
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalanceStr}
                  onChange={(e) => setOpeningBalanceStr(e.target.value)}
                  placeholder="0.00"
                  className="h-9 w-36 text-sm font-medium"
                />
              </div>
            </div>
          </div>
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
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertDescription>
                {error?.message ?? 'An error occurred while loading forecast data.'}
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

        {/* Forecast Content */}
        {!isLoading && !isError && forecast && (
          <>
            {/* 4 Core Financial KPI Cards (Baseline) */}
            <section
              aria-label="Forecast Key Performance Indicators"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                label="Opening Cash Balance"
                value={formatINR(forecast.metrics.openingBalancePaise)}
                tone="default"
                subtext="Current cash balance seed"
              />
              <KpiCard
                label={`Projected Inflows (${period}d)`}
                value={`+${formatINR(forecast.metrics.totalInflowsPaise)}`}
                tone="positive"
                subtext={`${forecast.assumptions.eligibleInvoicesInWindowCount} eligible invoice balances`}
              />
              <KpiCard
                label={`Projected Outflows (${period}d)`}
                value={`-${formatINR(forecast.metrics.totalOutflowsPaise)}`}
                tone="negative"
                subtext={`${forecast.assumptions.totalProjectedOccurrencesCount} recurring expense events`}
              />
              <KpiCard
                label={`Projected Ending Balance`}
                value={formatINR(forecast.metrics.endingBalancePaise)}
                tone={forecast.metrics.endingBalancePaise >= 0 ? 'positive' : 'negative'}
                subtext={`Net movement: ${forecast.metrics.netMovementPaise >= 0 ? '+' : ''}${formatINR(forecast.metrics.netMovementPaise)}`}
              />
            </section>

            {/* What-If Financial Simulation Panel */}
            <section aria-label="What-If Financial Simulation">
              <WhatIfSimulationControls
                eligibleInvoices={eligibleInvoicesForSimulation}
                activeComparison={simulationResult?.comparison ?? null}
                selectedInvoiceId={selectedInvoiceId}
                onSelectInvoice={(id) => setSelectedInvoiceId(id)}
                onApplyDelaySimulation={(invoiceId, delayDays) => {
                  setActiveScenario({ invoiceId, delayDays });
                }}
                onClearSimulation={() => {
                  setActiveScenario(null);
                  setSelectedInvoiceId(null);
                }}
                period={period}
              />
            </section>

            {/* Daily Running Balance Curve (Dual-line when simulation active) */}
            <section aria-label="Forecast Chart">
              <ForecastChart
                points={forecast.points}
                period={period}
                simulatedPoints={simulationResult?.simulated.points}
                isSimulationActive={Boolean(simulationResult)}
                deficitAnalysis={simulationResult?.comparison.deficitAnalysis}
              />
            </section>

            {/* Assumptions & Disclosures Panel */}
            <section aria-label="Forecast Assumptions">
              <ForecastAssumptions assumptions={forecast.assumptions} />
            </section>

            {/* Expected Inflow Schedule (Eligible Invoices) */}
            <section aria-label="Expected Receivables Inflow Schedule">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Expected Inflow Breakdown ({forecast.eligibleInvoices.length} Invoices)
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        Invoices contributing expected cash inflows during this {period}-day baseline period.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {forecast.eligibleInvoices.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                      No eligible invoices expected to settle in this {period}-day period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-medium">Invoice #</th>
                            <th className="pb-2 font-medium">Customer</th>
                            <th className="pb-2 font-medium">Due Date</th>
                            <th className="pb-2 font-medium">Projected Inflow Date</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 text-right font-medium">Outstanding Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {forecast.eligibleInvoices.map(({ invoice, projectedDate, isOverdue }) => (
                            <tr key={invoice.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-medium text-slate-900">
                                {invoice.invoice_number}
                              </td>
                              <td className="py-2.5 text-slate-700">
                                {invoice.customer_name}
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {invoice.due_date}
                              </td>
                              <td className="py-2.5 font-medium">
                                {isOverdue ? (
                                  <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                    Today (Overdue)
                                  </span>
                                ) : (
                                  <span className="text-slate-900">{projectedDate}</span>
                                )}
                              </td>
                              <td className="py-2.5">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                  invoice.status === 'overdue'
                                    ? 'bg-rose-50 text-rose-700'
                                    : invoice.status === 'partially_paid'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {invoice.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-semibold text-emerald-700">
                                {formatINR(invoice.outstanding_paise)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

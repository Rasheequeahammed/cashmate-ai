import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { formatINR } from '../../lib/finance/money';
import type { ForecastInvoice } from '../../lib/finance/forecast';
import type { SimulationComparison } from '../../lib/finance/simulation';

export interface WhatIfSimulationControlsProps {
  eligibleInvoices: ForecastInvoice[];
  activeComparison: SimulationComparison | null;
  selectedInvoiceId: string | null;
  onSelectInvoice: (invoiceId: string) => void;
  onApplyDelaySimulation: (invoiceId: string, delayDays: number) => void;
  onClearSimulation: () => void;
  period: 30 | 60 | 90;
  className?: string;
}

export function WhatIfSimulationControls({
  eligibleInvoices,
  activeComparison,
  selectedInvoiceId,
  onSelectInvoice,
  onApplyDelaySimulation,
  onClearSimulation,
  period,
  className,
}: WhatIfSimulationControlsProps) {
  const isSimulationActive = Boolean(activeComparison);

  function handleSimulate() {
    if (!selectedInvoiceId) return;
    onApplyDelaySimulation(selectedInvoiceId, 15);
  }

  return (
    <Card className={`border-indigo-100 bg-white shadow-sm ${className ?? ''}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                What-If Simulation
              </span>
              <CardTitle className="text-lg font-bold text-slate-900">
                Customer Payment Delay Scenario
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Simulate cash flow impact if a key customer pays 15 calendar days late. Calculations remain strictly in-memory and do not alter real records.
            </CardDescription>
          </div>

          {isSimulationActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSimulation}
              className="border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset to Baseline Forecast
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Selection Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invoice-select" className="text-xs font-semibold uppercase text-slate-600">
              Select Outstanding Invoice to Delay
            </Label>
            <select
              id="invoice-select"
              value={selectedInvoiceId ?? ''}
              onChange={(e) => onSelectInvoice(e.target.value)}
              disabled={eligibleInvoices.length === 0}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="" disabled>
                {eligibleInvoices.length === 0
                  ? 'No eligible outstanding invoices available'
                  : '-- Choose an eligible invoice --'}
              </option>
              {eligibleInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.customer_name} ({formatINR(inv.outstanding_paise)} • Due: {inv.due_date})
                  {inv.status === 'overdue' ? ' [OVERDUE]' : ''}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            onClick={handleSimulate}
            disabled={!selectedInvoiceId || eligibleInvoices.length === 0}
            className={`min-h-[40px] px-5 text-xs font-semibold ${
              isSimulationActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSimulationActive ? 'Re-run 15-Day Delay' : 'Simulate 15-Day Delay'}
          </Button>
        </div>

        {/* Active Simulation Comparison Bar */}
        {activeComparison && (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            {/* 6 Required Comparison Fields Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {/* 1. Baseline Ending Balance */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Baseline Ending ({period}d)
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-900">
                  {formatINR(activeComparison.baselineEndingBalancePaise)}
                </span>
              </div>

              {/* 2. Simulated Ending Balance */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Simulated Ending ({period}d)
                </span>
                <span className={`mt-1 block text-sm font-bold ${
                  activeComparison.simulatedEndingBalancePaise >= 0 ? 'text-indigo-900' : 'text-rose-600'
                }`}>
                  {formatINR(activeComparison.simulatedEndingBalancePaise)}
                </span>
              </div>

              {/* 3. Balance Difference */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Ending Difference
                </span>
                <span className={`mt-1 block text-sm font-bold ${
                  activeComparison.deltaEndingBalancePaise < 0
                    ? 'text-rose-600'
                    : activeComparison.deltaEndingBalancePaise > 0
                      ? 'text-emerald-600'
                      : 'text-slate-700'
                }`}>
                  {activeComparison.deltaEndingBalancePaise > 0 ? '+' : ''}
                  {formatINR(activeComparison.deltaEndingBalancePaise)}
                </span>
              </div>

              {/* 4. Delayed Invoice Amount */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Delayed Invoice Amount
                </span>
                <span className="mt-1 block text-sm font-bold text-amber-700">
                  {formatINR(activeComparison.delayedAmountPaise)}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  {activeComparison.delayedInvoice.customer_name}
                </span>
              </div>

              {/* 5. Original Expected Date */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Original Expected Date
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-800">
                  {activeComparison.originalExpectedDate}
                </span>
                {activeComparison.isOverdueInBaseline && (
                  <span className="block text-[10px] font-semibold text-amber-700">
                    (Overdue mapped to Today)
                  </span>
                )}
              </div>

              {/* 6. Simulated Payment Date */}
              <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                <span className="block text-[11px] font-medium text-slate-500">
                  Simulated Payment Date
                </span>
                <span className="mt-1 block text-sm font-bold text-indigo-700">
                  {activeComparison.simulatedPaymentDate}
                </span>
                <span className="block text-[10px] text-slate-500">
                  (+15 calendar days)
                </span>
              </div>
            </div>

            {/* Out of Horizon Disclosure */}
            {activeComparison.isExcludedFromSimulatedWindow && (
              <Alert className="border-amber-300 bg-amber-100/70 text-amber-900">
                <div className="font-bold text-xs text-amber-950 mb-1">
                  Excluded from {period}-Day Forecast Horizon
                </div>
                <AlertDescription className="text-xs text-amber-900">
                  <strong>{activeComparison.delayedInvoice.customer_name}</strong> payment of{' '}
                  <strong>{formatINR(activeComparison.delayedAmountPaise)}</strong> is shifted to{' '}
                  <strong>{activeComparison.simulatedPaymentDate}</strong>, which falls past the selected{' '}
                  {period}-day forecast window. In accordance with PRD §5.9, this inflow is{' '}
                  <strong>completely excluded</strong> from this horizon and is not counted or clamped to the horizon boundary.
                </AlertDescription>
              </Alert>
            )}

            {/* Deficit Alert Notifications */}
            {activeComparison.deficitAnalysis.status === 'new_deficit' && (
              <Alert variant="destructive" className="border-rose-300 bg-rose-50 text-rose-900">
                <div className="font-bold text-xs text-rose-950 mb-1">
                  ⚠️ New Cash Deficit Projected
                </div>
                <AlertDescription className="text-xs text-rose-800">
                  Delaying this payment introduces a cash deficit starting on{' '}
                  <strong>{activeComparison.deficitAnalysis.firstSimulatedDeficitDate}</strong> (Day{' '}
                  {activeComparison.deficitAnalysis.firstSimulatedDeficitDayIndex}), reaching a projected low of{' '}
                  <strong>{formatINR(activeComparison.deficitAnalysis.simulatedLowestPaise)}</strong>.
                </AlertDescription>
              </Alert>
            )}

            {activeComparison.deficitAnalysis.status === 'worsened_deficit' && (
              <Alert variant="destructive" className="border-rose-300 bg-rose-50 text-rose-900">
                <div className="font-bold text-xs text-rose-950 mb-1">
                  ⚠️ Cash Deficit Worsened
                </div>
                <AlertDescription className="text-xs text-rose-800">
                  Delaying this payment worsens the existing projected cash deficit. Lowest balance drops from{' '}
                  <strong>{formatINR(activeComparison.deficitAnalysis.baselineLowestPaise)}</strong> down to{' '}
                  <strong>{formatINR(activeComparison.deficitAnalysis.simulatedLowestPaise)}</strong>.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { formatINR } from '../../lib/finance/money';
import type { ForecastAssumptionsSummary } from '../../lib/finance/forecast';

export interface ForecastAssumptionsProps {
  assumptions: ForecastAssumptionsSummary;
  className?: string;
}

export function ForecastAssumptions({ assumptions, className }: ForecastAssumptionsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          Forecast Assumptions & Accounting Rules
        </CardTitle>
        <p className="text-xs text-slate-500">
          Deterministic mathematical projections generated strictly according to PRD §5.8 rules.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-slate-600">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Opening balance */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-700">Opening Balance Seed</span>
            <span className="mt-1 block text-base font-bold text-slate-900">
              {formatINR(assumptions.openingBalancePaise)}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              User-specified cash starting point
            </span>
          </div>

          {/* Invoices included */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-700">Eligible Receivables</span>
            <span className="mt-1 block text-base font-bold text-emerald-700">
              {assumptions.eligibleInvoicesInWindowCount} invoices
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {assumptions.eligibleDueInWindowCount} due in window + {assumptions.eligibleOverdueInvoicesCount} overdue (&lt;90d)
            </span>
          </div>

          {/* Recurring schedules included */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="block font-medium text-slate-700">Recurring Outflow Schedules</span>
            <span className="mt-1 block text-base font-bold text-rose-700">
              {assumptions.recurringSchedulesWithOccurrencesCount} active schedules
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {assumptions.totalProjectedOccurrencesCount} events projected in this window
            </span>
          </div>
        </div>

        {/* Detailed audit trail of exclusions & rules */}
        <div className="space-y-2 rounded-lg border border-indigo-50 bg-indigo-50/50 p-3.5 text-slate-700">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-indigo-900">• Overdue Invoices Assumption:</span>
            <span>
              {assumptions.eligibleOverdueInvoicesCount} overdue invoice(s) within the last 90 days are assumed collectible and mapped to Day 0 (Today).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-indigo-900">• Outflow Separation Rule:</span>
            <span>
              Actual one-time expenses recorded in the system are excluded from future projections. Projections are driven strictly by forward recurring schedules.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-indigo-900">• Inactive & Uncollectible Exclusions:</span>
            <span>
              Excluded: {assumptions.excludedDraftInvoicesCount} draft invoice(s), {assumptions.excludedPaidInvoicesCount} settled invoice(s), and {assumptions.excludedOverduePast90DaysCount} invoice(s) overdue &gt;90 days (classified as uncollectible).
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

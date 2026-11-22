import {
  calculateCashFlowForecast,
  type ForecastPeriod,
  type ForecastInvoice,
  type ForecastRecurringSchedule,
  type ForecastResult,
} from './forecast';
import { todayIST, addDaysIST } from './dateWindows';

export interface DelayedPaymentScenario {
  invoiceId: string;
  delayDays: number;
}

export type DeficitStatus =
  | 'none'
  | 'new_deficit'
  | 'worsened_deficit'
  | 'unchanged_or_improved';

export interface DeficitAnalysis {
  status: DeficitStatus;
  baselineLowestPaise: number;
  simulatedLowestPaise: number;
  hasBaselineDeficit: boolean;
  hasSimulatedDeficit: boolean;
  firstSimulatedDeficitDate?: string;
  firstSimulatedDeficitDayIndex?: number;
}

export interface SimulationComparison {
  scenario: DelayedPaymentScenario;
  delayedInvoice: ForecastInvoice;
  originalExpectedDate: string;
  simulatedPaymentDate: string;
  isOverdueInBaseline: boolean;
  isExcludedFromSimulatedWindow: boolean;
  delayedAmountPaise: number;
  baselineEndingBalancePaise: number;
  simulatedEndingBalancePaise: number;
  deltaEndingBalancePaise: number;
  baselineNetMovementPaise: number;
  simulatedNetMovementPaise: number;
  deltaNetMovementPaise: number;
  deficitAnalysis: DeficitAnalysis;
}

export interface DelayedPaymentSimulationResult {
  baseline: ForecastResult;
  simulated: ForecastResult;
  comparison: SimulationComparison;
}

export interface SimulateDelayedPaymentOptions {
  invoices: readonly ForecastInvoice[];
  recurringExpenses: readonly ForecastRecurringSchedule[];
  period: ForecastPeriod;
  openingBalancePaise?: number;
  todayOverride?: string;
  scenario: DelayedPaymentScenario;
}

/**
 * Deterministically simulates the financial impact of delaying a customer payment.
 *
 * Safeguards:
 * 1. For overdue invoices, simulated payment date = today + delayDays.
 * 2. If the simulated payment date exceeds the horizon window, the inflow is excluded entirely.
 * 3. Does not mutate the original invoice array or objects.
 * 4. Categorizes deficit impact (none, new_deficit, worsened_deficit, unchanged_or_improved).
 */
export function simulateDelayedPayment(
  options: SimulateDelayedPaymentOptions,
): DelayedPaymentSimulationResult {
  const {
    invoices,
    recurringExpenses,
    period,
    openingBalancePaise = 0,
    todayOverride,
    scenario,
  } = options;

  const today = todayOverride ?? todayIST(new Date());
  const horizonEnd = addDaysIST(today, period);

  // Locate selected invoice
  const targetInvoice = invoices.find((inv) => inv.id === scenario.invoiceId);
  if (!targetInvoice) {
    throw new Error(`Invoice with id "${scenario.invoiceId}" not found for simulation.`);
  }

  // 1. Compute baseline forecast
  const baseline = calculateCashFlowForecast({
    invoices,
    recurringExpenses,
    period,
    openingBalancePaise,
    todayOverride: today,
  });

  // 2. Determine original expected date in baseline and simulated date
  const isOverdueInBaseline = targetInvoice.due_date < today;
  const originalExpectedDate = isOverdueInBaseline ? today : targetInvoice.due_date;
  const simulatedPaymentDate = addDaysIST(originalExpectedDate, scenario.delayDays);
  const isExcludedFromSimulatedWindow = simulatedPaymentDate > horizonEnd;

  // 3. Create modified invoices list (without mutating originals)
  const simulatedInvoices: ForecastInvoice[] = invoices.map((inv) => {
    if (inv.id !== scenario.invoiceId) {
      return inv;
    }
    return {
      ...inv,
      due_date: simulatedPaymentDate,
    };
  });

  // 4. Compute simulated forecast with identical parameters
  const simulated = calculateCashFlowForecast({
    invoices: simulatedInvoices,
    recurringExpenses,
    period,
    openingBalancePaise,
    todayOverride: today,
  });

  // 5. Analyze deficit conditions
  const baselineLowestPaise = baseline.metrics.lowestBalancePaise;
  const simulatedLowestPaise = simulated.metrics.lowestBalancePaise;
  const hasBaselineDeficit = baselineLowestPaise < 0;
  const hasSimulatedDeficit = simulatedLowestPaise < 0;

  let deficitStatus: DeficitStatus = 'none';

  if (!hasBaselineDeficit && !hasSimulatedDeficit) {
    deficitStatus = 'none';
  } else if (!hasBaselineDeficit && hasSimulatedDeficit) {
    deficitStatus = 'new_deficit';
  } else if (hasBaselineDeficit && hasSimulatedDeficit) {
    const firstBaseIdx = baseline.points.findIndex((p) => p.closingBalancePaise < 0);
    const firstSimIdx = simulated.points.findIndex((p) => p.closingBalancePaise < 0);

    if (simulatedLowestPaise < baselineLowestPaise || (firstSimIdx !== -1 && firstSimIdx < firstBaseIdx)) {
      deficitStatus = 'worsened_deficit';
    } else {
      deficitStatus = 'unchanged_or_improved';
    }
  } else {
    deficitStatus = 'unchanged_or_improved';
  }

  const firstDeficitPoint = simulated.points.find((p) => p.closingBalancePaise < 0);

  const deficitAnalysis: DeficitAnalysis = {
    status: deficitStatus,
    baselineLowestPaise,
    simulatedLowestPaise,
    hasBaselineDeficit,
    hasSimulatedDeficit,
    firstSimulatedDeficitDate: firstDeficitPoint?.date,
    firstSimulatedDeficitDayIndex: firstDeficitPoint?.dayIndex,
  };

  const comparison: SimulationComparison = {
    scenario,
    delayedInvoice: targetInvoice,
    originalExpectedDate,
    simulatedPaymentDate,
    isOverdueInBaseline,
    isExcludedFromSimulatedWindow,
    delayedAmountPaise: targetInvoice.outstanding_paise,
    baselineEndingBalancePaise: baseline.metrics.endingBalancePaise,
    simulatedEndingBalancePaise: simulated.metrics.endingBalancePaise,
    deltaEndingBalancePaise:
      simulated.metrics.endingBalancePaise - baseline.metrics.endingBalancePaise,
    baselineNetMovementPaise: baseline.metrics.netMovementPaise,
    simulatedNetMovementPaise: simulated.metrics.netMovementPaise,
    deltaNetMovementPaise:
      simulated.metrics.netMovementPaise - baseline.metrics.netMovementPaise,
    deficitAnalysis,
  };

  return {
    baseline,
    simulated,
    comparison,
  };
}

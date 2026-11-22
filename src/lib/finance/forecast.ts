import {
  todayIST,
  addDaysIST,
  diffDays,
  parseYmd,
  formatYmd,
  daysInMonth,
} from './dateWindows';

export type ForecastPeriod = 30 | 60 | 90;

export interface ForecastInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  issue_date: string;
  due_date: string;
  total_paise: number;
  amount_paid_paise: number;
  outstanding_paise: number;
}

export interface ForecastRecurringSchedule {
  id: string;
  description: string;
  category: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string | null;
  amount_paise: number;
  is_active: boolean;
}

export interface ForecastDailyPoint {
  date: string;
  label: string;
  dayIndex: number;
  inflowsPaise: number;
  outflowsPaise: number;
  netPaise: number;
  closingBalancePaise: number;
  balance: number;
  inflows: number;
  outflows: number;
}

export interface ForecastAssumptionsSummary {
  openingBalancePaise: number;
  eligibleInvoicesInWindowCount: number;
  eligibleOverdueInvoicesCount: number;
  eligibleDueInWindowCount: number;
  excludedDraftInvoicesCount: number;
  excludedPaidInvoicesCount: number;
  excludedOverduePast90DaysCount: number;
  recurringSchedulesWithOccurrencesCount: number;
  totalProjectedOccurrencesCount: number;
  totalActiveRecurringSchedulesCount: number;
  oneTimeExpensesExcluded: boolean;
  overdueAssumedCollectible: boolean;
}

export interface ForecastSummaryMetrics {
  openingBalancePaise: number;
  totalInflowsPaise: number;
  totalOutflowsPaise: number;
  netMovementPaise: number;
  endingBalancePaise: number;
  lowestBalancePaise: number;
  highestBalancePaise: number;
}

export interface ForecastResult {
  period: ForecastPeriod;
  startDate: string;
  endDate: string;
  points: ForecastDailyPoint[];
  metrics: ForecastSummaryMetrics;
  assumptions: ForecastAssumptionsSummary;
  eligibleInvoices: Array<{
    invoice: ForecastInvoice;
    projectedDate: string;
    isOverdue: boolean;
  }>;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatShortDateLabel(dateStr: string): string {
  const { month, day } = parseYmd(dateStr);
  return `${day} ${MONTH_SHORT[month - 1]}`;
}

/**
 * Projects all forward occurrences for an active recurring schedule
 * within [today, horizonEnd] while preserving the original day of month.
 *
 * Efficiently advances past historical occurrences in O(1) arithmetic.
 */
export function projectScheduleOccurrences(
  schedule: ForecastRecurringSchedule,
  today: string,
  horizonEnd: string,
): string[] {
  if (!schedule.is_active || schedule.amount_paise <= 0) {
    return [];
  }

  if (schedule.start_date > horizonEnd) {
    return [];
  }

  if (schedule.end_date && schedule.end_date < today) {
    return [];
  }

  const occurrences: string[] = [];
  const { year: origY, month: origM, day: origD } = parseYmd(schedule.start_date);

  if (schedule.frequency === 'weekly') {
    let curr = schedule.start_date;
    if (curr < today) {
      const daysPast = diffDays(curr, today);
      const skipWeeks = Math.floor(daysPast / 7);
      curr = addDaysIST(curr, skipWeeks * 7);
      if (curr < today) {
        curr = addDaysIST(curr, 7);
      }
    }

    while (curr <= horizonEnd) {
      if (schedule.end_date && curr > schedule.end_date) {
        break;
      }
      occurrences.push(curr);
      curr = addDaysIST(curr, 7);
    }
    return occurrences;
  }

  if (schedule.frequency === 'monthly') {
    const { year: todayY, month: todayM } = parseYmd(today);
    let step = 0;
    if (schedule.start_date < today) {
      const approxMonths = (todayY - origY) * 12 + (todayM - origM);
      step = Math.max(0, approxMonths - 1);
    }

    while (true) {
      const targetY = origY + Math.floor((origM - 1 + step) / 12);
      const targetM = ((origM - 1 + step) % 12) + 1;
      const targetD = Math.min(origD, daysInMonth(targetY, targetM));
      const dateStr = formatYmd(targetY, targetM, targetD);

      if (dateStr > horizonEnd) break;
      if (schedule.end_date && dateStr > schedule.end_date) break;

      if (dateStr >= today && dateStr >= schedule.start_date) {
        occurrences.push(dateStr);
      }
      step++;
    }
    return occurrences;
  }

  if (schedule.frequency === 'quarterly') {
    const { year: todayY, month: todayM } = parseYmd(today);
    let qStep = 0;
    if (schedule.start_date < today) {
      const approxMonths = (todayY - origY) * 12 + (todayM - origM);
      qStep = Math.max(0, Math.floor((approxMonths - 3) / 3));
    }

    while (true) {
      const monthOffset = qStep * 3;
      const targetY = origY + Math.floor((origM - 1 + monthOffset) / 12);
      const targetM = ((origM - 1 + monthOffset) % 12) + 1;
      const targetD = Math.min(origD, daysInMonth(targetY, targetM));
      const dateStr = formatYmd(targetY, targetM, targetD);

      if (dateStr > horizonEnd) break;
      if (schedule.end_date && dateStr > schedule.end_date) break;

      if (dateStr >= today && dateStr >= schedule.start_date) {
        occurrences.push(dateStr);
      }
      qStep++;
    }
    return occurrences;
  }

  if (schedule.frequency === 'annually') {
    const { year: todayY } = parseYmd(today);
    let yStep = 0;
    if (schedule.start_date < today) {
      yStep = Math.max(0, todayY - origY - 1);
    }

    while (true) {
      const targetY = origY + yStep;
      const targetM = origM;
      const targetD = Math.min(origD, daysInMonth(targetY, targetM));
      const dateStr = formatYmd(targetY, targetM, targetD);

      if (dateStr > horizonEnd) break;
      if (schedule.end_date && dateStr > schedule.end_date) break;

      if (dateStr >= today && dateStr >= schedule.start_date) {
        occurrences.push(dateStr);
      }
      yStep++;
    }
    return occurrences;
  }

  return occurrences;
}

export interface CalculateForecastOptions {
  invoices: readonly ForecastInvoice[];
  recurringExpenses: readonly ForecastRecurringSchedule[];
  period: ForecastPeriod;
  openingBalancePaise?: number;
  todayOverride?: string;
}

/**
 * Deterministically computes the cash flow forecast for 30, 60, or 90 days.
 *
 * - Day 0 is today, Day H is today + horizon.
 * - Total daily points generated: H + 1 (31, 61, or 91).
 * - All calculations operate strictly in integer paise.
 */
export function calculateCashFlowForecast(
  options: CalculateForecastOptions,
): ForecastResult {
  const {
    invoices,
    recurringExpenses,
    period,
    openingBalancePaise = 0,
    todayOverride,
  } = options;

  const today = todayOverride ?? todayIST(new Date());
  const horizonEnd = addDaysIST(today, period);
  const uncollectibleCutoff = addDaysIST(today, -90);

  // 1. Process Invoices (Expected Inflows)
  let excludedDraftInvoicesCount = 0;
  let excludedPaidInvoicesCount = 0;
  let excludedOverduePast90DaysCount = 0;
  let eligibleOverdueInvoicesCount = 0;
  let eligibleDueInWindowCount = 0;

  const eligibleInvoices: Array<{
    invoice: ForecastInvoice;
    projectedDate: string;
    isOverdue: boolean;
  }> = [];

  const inflowsByDate = new Map<string, number>();

  for (const inv of invoices) {
    if (inv.status === 'draft') {
      excludedDraftInvoicesCount++;
      continue;
    }

    if (inv.status === 'paid' || inv.outstanding_paise <= 0) {
      excludedPaidInvoicesCount++;
      continue;
    }

    // Invoice has remaining balance and is sent, partially_paid, or overdue
    if (inv.due_date < uncollectibleCutoff) {
      excludedOverduePast90DaysCount++;
      continue;
    }

    let projectedDate = inv.due_date;
    const isOverdue = inv.due_date < today;

    if (isOverdue) {
      // Overdue within 90 days: map to today (Day 0) as expected collection
      projectedDate = today;
      eligibleOverdueInvoicesCount++;
    } else if (inv.due_date <= horizonEnd) {
      eligibleDueInWindowCount++;
    } else {
      // Due beyond the horizon window: excluded from this window's inflows
      continue;
    }

    eligibleInvoices.push({
      invoice: inv,
      projectedDate,
      isOverdue,
    });

    const current = inflowsByDate.get(projectedDate) ?? 0;
    inflowsByDate.set(projectedDate, current + inv.outstanding_paise);
  }

  // 2. Process Recurring Expenses (Expected Outflows)
  const outflowsByDate = new Map<string, number>();
  let recurringSchedulesWithOccurrencesCount = 0;
  let totalProjectedOccurrencesCount = 0;
  let totalActiveRecurringSchedulesCount = 0;

  for (const schedule of recurringExpenses) {
    if (!schedule.is_active || schedule.amount_paise <= 0) {
      continue;
    }

    totalActiveRecurringSchedulesCount++;
    const occurrences = projectScheduleOccurrences(schedule, today, horizonEnd);

    if (occurrences.length > 0) {
      recurringSchedulesWithOccurrencesCount++;
      totalProjectedOccurrencesCount += occurrences.length;

      for (const occDate of occurrences) {
        const curr = outflowsByDate.get(occDate) ?? 0;
        outflowsByDate.set(occDate, curr + schedule.amount_paise);
      }
    }
  }

  // 3. Build Daily Data Points [Day 0 to Day period] (total H + 1 points)
  const points: ForecastDailyPoint[] = [];
  let runningBalance = openingBalancePaise;
  let totalInflowsPaise = 0;
  let totalOutflowsPaise = 0;
  let lowestBalancePaise = openingBalancePaise;
  let highestBalancePaise = openingBalancePaise;

  const totalDays = period; // 30, 60, or 90
  for (let dayIndex = 0; dayIndex <= totalDays; dayIndex++) {
    const date = addDaysIST(today, dayIndex);
    const dayInflows = inflowsByDate.get(date) ?? 0;
    const dayOutflows = outflowsByDate.get(date) ?? 0;
    const netPaise = dayInflows - dayOutflows;

    runningBalance += netPaise;
    totalInflowsPaise += dayInflows;
    totalOutflowsPaise += dayOutflows;

    if (runningBalance < lowestBalancePaise) {
      lowestBalancePaise = runningBalance;
    }
    if (runningBalance > highestBalancePaise) {
      highestBalancePaise = runningBalance;
    }

    points.push({
      date,
      label: formatShortDateLabel(date),
      dayIndex,
      inflowsPaise: dayInflows,
      outflowsPaise: dayOutflows,
      netPaise,
      closingBalancePaise: runningBalance,
      balance: runningBalance / 100,
      inflows: dayInflows / 100,
      outflows: dayOutflows / 100,
    });
  }

  const endingBalancePaise = points[points.length - 1]?.closingBalancePaise ?? openingBalancePaise;
  const netMovementPaise = totalInflowsPaise - totalOutflowsPaise;

  return {
    period,
    startDate: today,
    endDate: horizonEnd,
    points,
    metrics: {
      openingBalancePaise,
      totalInflowsPaise,
      totalOutflowsPaise,
      netMovementPaise,
      endingBalancePaise,
      lowestBalancePaise,
      highestBalancePaise,
    },
    assumptions: {
      openingBalancePaise,
      eligibleInvoicesInWindowCount: eligibleOverdueInvoicesCount + eligibleDueInWindowCount,
      eligibleOverdueInvoicesCount,
      eligibleDueInWindowCount,
      excludedDraftInvoicesCount,
      excludedPaidInvoicesCount,
      excludedOverduePast90DaysCount,
      recurringSchedulesWithOccurrencesCount,
      totalProjectedOccurrencesCount,
      totalActiveRecurringSchedulesCount,
      oneTimeExpensesExcluded: true,
      overdueAssumedCollectible: true,
    },
    eligibleInvoices,
  };
}

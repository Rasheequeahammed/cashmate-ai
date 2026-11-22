import { useQuery } from "@tanstack/react-query";
import { useBusiness } from "./useBusiness";
import { fetchDashboardRawData } from "../lib/dashboard/fetchers";
import {
  mapInvoices,
  mapPayments,
  mapExpenses,
  type DashboardInvoiceRow,
} from "../lib/dashboard/mappers";
import {
  todayIST,
  currentMonthRange,
  last6MonthsRanges,
} from "../lib/finance/dateWindows";
import {
  receivablesPaise,
  sumPaymentsInRange,
  sumExpensesInRange,
  netCashMovementPaise,
  monthlyRevenueExpensesSeries,
  recentInvoices,
  overdueInvoices,
  type MonthlySeriesPoint,
} from "../lib/finance/calculations";

export interface DashboardMetrics {
  receivablesPaise: number;
  revenueThisMonthPaise: number;
  expensesThisMonthPaise: number;
  netCashMovementPaise: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  chartData: MonthlySeriesPoint[];
  recentInvoices: DashboardInvoiceRow[];
  overdueInvoices: DashboardInvoiceRow[];
  invoices: DashboardInvoiceRow[];
}

export const dashboardKeys = {
  all: ["dashboard"] as const,
  detail: (businessId: string | undefined) => ["dashboard", businessId] as const,
};

/**
 * React Query hook providing aggregated dashboard financial data,
 * KPI metrics, 6-month chart series, and filtered invoice lists.
 */
export function useDashboardData(businessIdOverride?: string) {
  const { business } = useBusiness();
  const businessId = businessIdOverride ?? business?.id;

  return useQuery<DashboardData, Error>({
    queryKey: dashboardKeys.detail(businessId),
    queryFn: async (): Promise<DashboardData> => {
      if (!businessId) {
        throw new Error("No business ID provided for dashboard query");
      }

      const now = new Date();
      const today = todayIST(now);
      const currentMonth = currentMonthRange(now);
      const sixMonthRanges = last6MonthsRanges(now);
      const oldestMonthStart = sixMonthRanges[0]?.start;

      const raw = await fetchDashboardRawData(businessId, oldestMonthStart);

      const invoices = mapInvoices(raw.invoices);
      const payments = mapPayments(raw.payments);
      const expenses = mapExpenses(raw.expenses);

      const receivables = receivablesPaise(invoices);
      const revenueThisMonth = sumPaymentsInRange(
        payments,
        currentMonth.start,
        currentMonth.end,
      );
      const expensesThisMonth = sumExpensesInRange(
        expenses,
        currentMonth.start,
        currentMonth.end,
      );
      const netCash = netCashMovementPaise(revenueThisMonth, expensesThisMonth);
      const chartData = monthlyRevenueExpensesSeries(
        payments,
        expenses,
        sixMonthRanges,
      );
      const recent = recentInvoices(invoices) as DashboardInvoiceRow[];
      const overdue = overdueInvoices(invoices, today) as DashboardInvoiceRow[];

      return {
        metrics: {
          receivablesPaise: receivables,
          revenueThisMonthPaise: revenueThisMonth,
          expensesThisMonthPaise: expensesThisMonth,
          netCashMovementPaise: netCash,
        },
        chartData,
        recentInvoices: recent,
        overdueInvoices: overdue,
        invoices,
      };
    },
    enabled: Boolean(businessId),
  });
}

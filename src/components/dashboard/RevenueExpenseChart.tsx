import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { formatINR } from "../../lib/finance/money";
import type { MonthlySeriesPoint } from "../../lib/finance/calculations";

export interface RevenueExpenseChartProps {
  data: MonthlySeriesPoint[];
  className?: string;
}

function formatYAxisTick(value: number): string {
  if (value === 0) return "₹0";
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

export function RevenueExpenseChart({ data, className }: RevenueExpenseChartProps) {
  // Transform paise into rupees for bar heights
  const chartData = data.map((point) => ({
    key: point.key,
    label: point.label,
    revenue: point.revenuePaise / 100,
    expenses: point.expensesPaise / 100,
    revenuePaise: point.revenuePaise,
    expensesPaise: point.expensesPaise,
  }));

  const isEmpty =
    chartData.length === 0 ||
    chartData.every((d) => d.revenuePaise === 0 && d.expensesPaise === 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Revenue vs. Expenses
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Financial comparison across the last 6 calendar months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
            <p>No revenue or expense activity recorded for the last 6 months.</p>
          </div>
        ) : (
          <div className="h-72 w-full min-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={formatYAxisTick}
                />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === "number"
                      ? formatINR(Math.round(value * 100))
                      : String(value ?? ""),
                    name === "revenue" ? "Revenue" : "Expenses",
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.5rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "revenue" ? (
                      <span className="text-xs font-medium text-slate-700">Revenue</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-700">Expenses</span>
                    )
                  }
                  wrapperStyle={{ paddingTop: "8px" }}
                />
                <Bar
                  dataKey="revenue"
                  name="revenue"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="expenses"
                  name="expenses"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

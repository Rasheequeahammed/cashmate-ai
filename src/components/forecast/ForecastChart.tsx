import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatINR } from '../../lib/finance/money';
import type { ForecastDailyPoint, ForecastPeriod } from '../../lib/finance/forecast';
import type { DeficitAnalysis } from '../../lib/finance/simulation';

export interface ForecastChartProps {
  points: ForecastDailyPoint[];
  period: ForecastPeriod;
  simulatedPoints?: ForecastDailyPoint[];
  isSimulationActive?: boolean;
  deficitAnalysis?: DeficitAnalysis;
  className?: string;
}

interface MergedChartPoint {
  date: string;
  label: string;
  dayIndex: number;
  balance: number;
  closingBalancePaise: number;
  inflowsPaise: number;
  outflowsPaise: number;
  simulatedBalance?: number;
  simulatedClosingBalancePaise?: number;
  simulatedInflowsPaise?: number;
  deltaPaise?: number;
}

function formatYAxisTick(value: number): string {
  if (value === 0) return '₹0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}k`;
  return `${sign}₹${value}`;
}

export function ForecastChart({
  points,
  period,
  simulatedPoints,
  isSimulationActive = false,
  deficitAnalysis,
  className,
}: ForecastChartProps) {
  const interval = period === 30 ? 4 : period === 60 ? 8 : 12;

  // Merge baseline and simulated points if simulation is active
  const chartData = useMemo<MergedChartPoint[]>(() => {
    if (!isSimulationActive || !simulatedPoints) {
      return points.map((p) => ({
        date: p.date,
        label: p.label,
        dayIndex: p.dayIndex,
        balance: p.balance,
        closingBalancePaise: p.closingBalancePaise,
        inflowsPaise: p.inflowsPaise,
        outflowsPaise: p.outflowsPaise,
      }));
    }

    const simMap = new Map<string, ForecastDailyPoint>();
    for (const sp of simulatedPoints) {
      simMap.set(sp.date, sp);
    }

    return points.map((p) => {
      const sp = simMap.get(p.date);
      const simPaise = sp?.closingBalancePaise;
      return {
        date: p.date,
        label: p.label,
        dayIndex: p.dayIndex,
        balance: p.balance,
        closingBalancePaise: p.closingBalancePaise,
        inflowsPaise: p.inflowsPaise,
        outflowsPaise: p.outflowsPaise,
        simulatedBalance: sp?.balance,
        simulatedClosingBalancePaise: simPaise,
        simulatedInflowsPaise: sp?.inflowsPaise,
        deltaPaise: simPaise !== undefined ? simPaise - p.closingBalancePaise : undefined,
      };
    });
  }, [points, simulatedPoints, isSimulationActive]);

  const minBaselineBalance = Math.min(...points.map((p) => p.balance));
  const hasBaselineDeficit = minBaselineBalance < 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">
              {isSimulationActive
                ? `Baseline vs. Simulated Cash Flow Curve (${period} Days)`
                : `Projected Cash Flow Curve (${period} Days)`}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {isSimulationActive
                ? 'Dual-line comparison showing baseline forecast versus 15-day customer payment delay scenario'
                : 'Deterministic daily cash trajectory based on expected invoice receivables and recurring expenses'}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasBaselineDeficit && (
              <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                ⚠️ Baseline cash deficit projected
              </span>
            )}

            {isSimulationActive && deficitAnalysis?.status === 'new_deficit' && (
              <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                ⚠️ New simulation deficit introduced
              </span>
            )}

            {isSimulationActive && deficitAnalysis?.status === 'worsened_deficit' && (
              <span className="inline-flex items-center rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900">
                ⚠️ Simulation deficit worsened
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full min-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={interval}
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
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

              {isSimulationActive && (
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="plainline"
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                />
              )}

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload as MergedChartPoint;
                  const isSim = isSimulationActive && data.simulatedClosingBalancePaise !== undefined;

                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[220px]">
                      <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
                        {data.date} (Day {data.dayIndex})
                      </div>

                      {/* Baseline Balance */}
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600 font-medium">Baseline Balance:</span>
                        <span className={`font-semibold ${data.closingBalancePaise >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {formatINR(data.closingBalancePaise)}
                        </span>
                      </div>

                      {/* Simulated Balance */}
                      {isSim && data.simulatedClosingBalancePaise !== undefined && (
                        <>
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-800 font-medium">Simulated Balance:</span>
                            <span className={`font-semibold ${data.simulatedClosingBalancePaise >= 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                              {formatINR(data.simulatedClosingBalancePaise)}
                            </span>
                          </div>

                          {data.deltaPaise !== undefined && (
                            <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                              <span className="text-slate-500">Difference:</span>
                              <span className={`font-semibold ${
                                data.deltaPaise < 0
                                  ? 'text-rose-600'
                                  : data.deltaPaise > 0
                                    ? 'text-emerald-600'
                                    : 'text-slate-600'
                              }`}>
                                {data.deltaPaise > 0 ? '+' : ''}
                                {formatINR(data.deltaPaise)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Inflows & Outflows */}
                      {(data.inflowsPaise > 0 || (isSim && (data.simulatedInflowsPaise ?? 0) > 0)) && (
                        <div className="border-t border-slate-100 pt-1 space-y-0.5">
                          {data.inflowsPaise > 0 && (
                            <div className="flex justify-between gap-4 text-emerald-600">
                              <span>Baseline Inflow:</span>
                              <span className="font-semibold">+{formatINR(data.inflowsPaise)}</span>
                            </div>
                          )}
                          {isSim && (data.simulatedInflowsPaise ?? 0) > 0 && data.simulatedInflowsPaise !== data.inflowsPaise && (
                            <div className="flex justify-between gap-4 text-amber-700">
                              <span>Simulated Inflow:</span>
                              <span className="font-semibold">+{formatINR(data.simulatedInflowsPaise!)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {data.outflowsPaise > 0 && (
                        <div className="flex justify-between gap-4 text-rose-600">
                          <span>Projected Outflow:</span>
                          <span className="font-semibold">-{formatINR(data.outflowsPaise)}</span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              {/* Baseline Area */}
              <Area
                type="monotone"
                dataKey="balance"
                name="Baseline Forecast"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#balanceGradient)"
              />

              {/* Simulated Line/Area */}
              {isSimulationActive && (
                <Area
                  type="monotone"
                  dataKey="simulatedBalance"
                  name="Simulated (15-Day Delay)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  fill="none"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

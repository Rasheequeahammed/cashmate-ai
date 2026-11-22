import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

export type KpiTone = "default" | "positive" | "negative";

export interface KpiCardProps {
  label: string;
  value: string;
  tone?: KpiTone;
  subtext?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  tone = "default",
  subtext,
  className,
}: KpiCardProps) {
  const toneClasses = {
    default: "text-slate-900",
    positive: "text-emerald-600",
    negative: "text-rose-600",
  }[tone];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", toneClasses)}>
          {value}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-slate-400">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

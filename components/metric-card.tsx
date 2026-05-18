import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClasses = {
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: keyof typeof toneClasses;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            toneClasses[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-normal">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

import {
  AlertOctagon,
  ArrowUpRight,
  Database,
  Gauge,
  ServerCog,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { AuditStatusBadge, LicenseStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/server/prisma";
import { daysUntil, formatDate } from "@/lib/utils";

export async function DashboardOverview() {
  const [licenses, recentLogs, activeLicenses, failedAttempts, totalLogs] =
    await Promise.all([
      prisma.license.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.verificationLog.findMany({
        where: { NOT: { statusResult: "SUCCESS" } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.license.count({ where: { status: "ACTIVE" } }),
      prisma.verificationLog.count({ where: { NOT: { statusResult: "SUCCESS" } } }),
      prisma.verificationLog.count(),
    ]);

  const metricCards = [
    {
      label: "Active Licenses",
      value: String(activeLicenses),
      helper: "Licenses currently allowed to verify",
      icon: ServerCog,
      tone: "emerald",
    },
    {
      label: "Piracy Signals",
      value: String(failedAttempts),
      helper: "Rejected verification attempts",
      icon: AlertOctagon,
      tone: "rose",
    },
    {
      label: "Cache Signal",
      value: "Header",
      helper: "Returned as X-LEPS-Cache on verification",
      icon: Database,
      tone: "cyan",
    },
    {
      label: "Audit Logs",
      value: String(totalLogs),
      helper: "Persisted verification telemetry",
      icon: Gauge,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <Badge variant="info" className="mb-3">
            Vercel Edge / Redis Cache-Aside
          </Badge>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
            Licensing Control Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Single-tenant admin surface for strict PHP script license binding.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <div className="min-w-20">
            <div className="text-muted-foreground">Default TTL</div>
            <div className="mt-1 font-semibold">24h</div>
          </div>
          <div className="min-w-20">
            <div className="text-muted-foreground">Renewal</div>
            <div className="mt-1 font-semibold">+14d</div>
          </div>
          <div className="min-w-20">
            <div className="text-muted-foreground">Mode</div>
            <div className="mt-1 font-semibold text-emerald-300">Strict</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            helper={metric.helper}
            icon={metric.icon}
            tone={metric.tone as "emerald" | "rose" | "cyan" | "amber"}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>License Lifecycle</CardTitle>
                <CardDescription>
                  Current control queue and expiration pressure.
                </CardDescription>
              </div>
              <Gauge className="h-5 w-5 text-cyan-300" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {licenses.slice(0, 4).map((license) => (
              <div
                key={license.id}
                className="grid gap-3 rounded-md border border-border bg-slate-950/35 p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-medium">
                      {license.allowedDomain}
                    </div>
                    <LicenseStatusBadge status={license.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {license.allowedPath} / {license.telegramChatId}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm font-medium">
                    {daysUntil(license.expiresAt) > 0
                      ? `${daysUntil(license.expiresAt)} days`
                      : "Expired"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(license.expiresAt)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Redis Cache</CardTitle>
                  <CardDescription>Runtime behavior from verifier responses.</CardDescription>
                </div>
                <Database className="h-5 w-5 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border bg-slate-950/35 p-3">
                  <div className="text-muted-foreground">Cache key</div>
                  <div className="mt-1 text-xl font-semibold">lic:key</div>
                </div>
                <div className="rounded-md border border-border bg-slate-950/35 p-3">
                  <div className="text-muted-foreground">TTL</div>
                  <div className="mt-1 text-xl font-semibold">86,400s</div>
                </div>
              </div>
              <div className="rounded-md border border-border bg-slate-950/35 p-3 text-sm text-muted-foreground">
                Hit/miss is emitted per verification request via the
                X-LEPS-Cache response header.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Recent Risk</CardTitle>
                  <CardDescription>Latest failed verification traces.</CardDescription>
                </div>
                <AlertOctagon className="h-5 w-5 text-rose-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-slate-950/35 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {log.requestHost}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {log.requestIp} / {log.requestPath}
                    </div>
                  </div>
                  <AuditStatusBadge status={log.statusResult} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            icon: ServerCog,
            title: "API Guardrail",
            value: "60 req/min",
            caption: "Public verifier envelope",
          },
          {
            icon: ArrowUpRight,
            title: "Graceful Cache",
            value: "Ready",
            caption: "Redis-first continuity state",
          },
          {
            icon: AlertOctagon,
            title: "Mismatch Lock",
            value: "4 params",
            caption: "Domain, path, bot token, chat id",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <Icon className="h-5 w-5 text-cyan-300" />
              <div className="mt-4 text-sm text-muted-foreground">
                {item.title}
              </div>
              <div className="mt-1 text-2xl font-semibold">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {item.caption}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

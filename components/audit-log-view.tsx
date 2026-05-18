"use client";

import * as React from "react";
import { AlertTriangle, Filter, Search } from "lucide-react";

import { AuditStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type AuditStatus =
  | "SUCCESS"
  | "MISMATCH_DOMAIN"
  | "MISMATCH_PATH"
  | "MISMATCH_TELEGRAM"
  | "SUSPENDED"
  | "EXPIRED";

type AuditFilter = "ALL" | AuditStatus;

type AuditLog = {
  id: string;
  requestIp: string;
  requestHost: string;
  requestPath: string;
  statusResult: AuditStatus | string;
  createdAt: string;
  license: {
    licenseKey: string;
    allowedDomain: string;
  };
};

export function AuditLogView() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<AuditFilter>("ALL");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadLogs() {
      setError(null);
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set("q", query.trim());
      }

      if (filter !== "ALL") {
        params.set("status", filter);
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load audit logs.");
        return;
      }

      const data = (await response.json()) as { logs: AuditLog[] };
      setLogs(data.logs);
    }

    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [filter, query]);

  const filteredLogs = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesFilter = filter === "ALL" || log.statusResult === filter;
      const matchesQuery =
        normalized.length === 0 ||
        log.license.licenseKey.toLowerCase().includes(normalized) ||
        log.requestHost.toLowerCase().includes(normalized) ||
        log.requestIp.toLowerCase().includes(normalized) ||
        log.requestPath.toLowerCase().includes(normalized);

      return matchesFilter && matchesQuery;
    });
  }, [filter, logs, query]);

  const failedCount = logs.filter(
    (log) => log.statusResult !== "SUCCESS",
  ).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <Badge variant="warning" className="mb-3">
            Verification Telemetry
          </Badge>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
            Audit Logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Verification traces for successful checks, mismatch attempts, and
            lifecycle blocks.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <div className="min-w-24">
            <div className="text-muted-foreground">Failures</div>
            <div className="mt-1 font-semibold text-rose-300">
              {failedCount}
            </div>
          </div>
          <div className="min-w-24">
            <div className="text-muted-foreground">Successes</div>
            <div className="mt-1 font-semibold text-emerald-300">
              {logs.length - failedCount}
            </div>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <CardTitle>Request Timeline</CardTitle>
              <CardDescription>
                Host, path, IP, and status result from verifier payloads.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search host, path, IP, license key"
                  className="pl-9"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as AuditFilter)}
              >
                <SelectTrigger className="sm:w-48" aria-label="Audit result filter">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Results</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="MISMATCH_DOMAIN">MISMATCH_DOMAIN</SelectItem>
                  <SelectItem value="MISMATCH_PATH">MISMATCH_PATH</SelectItem>
                  <SelectItem value="MISMATCH_TELEGRAM">
                    MISMATCH_TELEGRAM
                  </SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Result</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <AuditStatusBadge status={log.statusResult} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.license.licenseKey}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.requestHost}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.requestPath}
                    </TableCell>
                    <TableCell>{log.requestIp}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-300" />
          <div>
            <div className="font-medium text-rose-100">Intrusion Signal</div>
            <div className="mt-1 text-sm text-rose-100/75">
              invoiceguard-clone.app attempted to reuse a bound license against
              a different absolute domain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

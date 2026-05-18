"use client";

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Copy,
  Edit,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { LicenseStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysUntil, formatDate } from "@/lib/utils";

type LicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

type License = {
  id: string;
  licenseKey: string;
  allowedDomain: string;
  allowedPath: string;
  telegramBotToken: string;
  telegramChatId: string;
  status: LicenseStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    logs: number;
  };
};

type LicenseFormState = {
  allowedDomain: string;
  allowedPath: string;
  telegramBotToken: string;
  telegramChatId: string;
  status: LicenseStatus;
  expiresAt: string;
};

const emptyForm = (): LicenseFormState => ({
  allowedDomain: "",
  allowedPath: "/",
  telegramBotToken: "",
  telegramChatId: "",
  status: "ACTIVE",
  expiresAt: toDateInput(addDays(new Date(), 14)),
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: string | Date) {
  return new Date(date).toISOString().slice(0, 10);
}

function fromDateInput(value: string) {
  return new Date(`${value}T23:59:59.000Z`).toISOString();
}

function maskToken(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

export function LicenseManagement() {
  const [licenses, setLicenses] = React.useState<License[]>([]);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | LicenseStatus>(
    "ALL",
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editingLicense, setEditingLicense] = React.useState<License | null>(
    null,
  );
  const [form, setForm] = React.useState<LicenseFormState>(emptyForm);

  const loadLicenses = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/admin/licenses", {
      cache: "no-store",
    });

    if (!response.ok) {
      setError("Unable to load licenses.");
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { licenses: License[] };
    setLicenses(data.licenses);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    void loadLicenses();
  }, [loadLicenses]);

  const filteredLicenses = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return licenses.filter((license) => {
      const matchesStatus =
        statusFilter === "ALL" || license.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        license.allowedDomain.toLowerCase().includes(normalizedQuery) ||
        license.telegramChatId.toLowerCase().includes(normalizedQuery) ||
        license.licenseKey.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [licenses, query, statusFilter]);

  const toggleStatus = React.useCallback(
    async (id: string, checked: boolean) => {
      const nextStatus = checked ? "ACTIVE" : "SUSPENDED";
      const previous = licenses;

      setLicenses((current) =>
        current.map((license) =>
          license.id === id
            ? {
                ...license,
                status: nextStatus,
              }
            : license,
        ),
      );

      const response = await fetch(`/api/admin/licenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        setLicenses(previous);
        setError("Unable to update license status.");
      }
    },
    [licenses],
  );

  const extendLicense = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/licenses/${id}/extend`, {
      method: "POST",
    });

    if (!response.ok) {
      setError("Unable to extend license.");
      return;
    }

    const data = (await response.json()) as { license: License };
    setLicenses((current) =>
      current.map((license) =>
        license.id === id
          ? { ...license, ...data.license }
          : license,
      ),
    );
  }, []);

  const purgeCache = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/licenses/${id}/purge-cache`, {
      method: "POST",
    });

    if (!response.ok) {
      setError("Unable to purge cache.");
      return;
    }

    setLicenses((current) =>
      current.map((license) =>
        license.id === id ? { ...license } : license,
      ),
    );
  }, []);

  const deleteLicense = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/licenses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Unable to delete license.");
      return;
    }

    setLicenses((current) => current.filter((license) => license.id !== id));
  }, []);

  const startCreate = () => {
    setEditingLicense(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const startEdit = React.useCallback((license: License) => {
    setEditingLicense(license);
    setForm({
      allowedDomain: license.allowedDomain,
      allowedPath: license.allowedPath,
      telegramBotToken: license.telegramBotToken,
      telegramChatId: license.telegramChatId,
      status: license.status,
      expiresAt: toDateInput(license.expiresAt),
    });
    setDialogOpen(true);
  }, []);

  const columns = React.useMemo<ColumnDef<License>[]>(
    () => [
      {
        accessorKey: "licenseKey",
        header: "License",
        cell: ({ row }) => {
          const license = row.original;
          return (
            <div className="min-w-[170px]">
              <div className="max-w-[170px] truncate font-mono text-xs text-foreground">
                {license.licenseKey}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <LicenseStatusBadge status={license.status} />
                {(license._count?.logs ?? 0) > 0 ? (
                  <Badge
                    variant={(license._count?.logs ?? 0) > 4 ? "danger" : "warning"}
                  >
                    {license._count?.logs ?? 0} logs
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "allowedDomain",
        header: "Binding",
        cell: ({ row }) => {
          const license = row.original;
          return (
            <div className="min-w-[160px]">
              <div className="max-w-[160px] truncate font-medium">
                {license.allowedDomain}
              </div>
              <div className="mt-1 max-w-[160px] truncate text-sm text-muted-foreground">
                {license.allowedPath}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "telegramChatId",
        header: "Telegram",
        cell: ({ row }) => {
          const license = row.original;
          return (
            <div className="min-w-[155px]">
              <div className="max-w-[155px] truncate font-medium">
                {license.telegramChatId}
              </div>
              <div className="mt-1 max-w-[155px] truncate font-mono text-xs text-muted-foreground">
                {maskToken(license.telegramBotToken)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => {
          const license = row.original;
          const remaining = daysUntil(license.expiresAt);

          return (
            <div className="min-w-[108px]">
              <div className="font-medium">{formatDate(license.expiresAt)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {remaining > 0 ? `${remaining} days left` : "Expired"}
              </div>
            </div>
          );
        },
      },
      {
        id: "controls",
        header: "Controls",
        cell: ({ row }) => {
          const license = row.original;
          const checked = license.status === "ACTIVE";

          return (
            <div className="flex min-w-[134px] items-center gap-2">
              <Switch
                checked={checked}
                aria-label={`Toggle ${license.allowedDomain}`}
                onCheckedChange={(value) => toggleStatus(license.id, value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => extendLicense(license.id)}
              >
                <RotateCcw className="h-4 w-4" />
                +14d
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      navigator.clipboard.writeText(license.licenseKey)
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy key
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startEdit(license)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => purgeCache(license.id)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Purge cache
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-rose-300 focus:text-rose-200"
                    onClick={() => deleteLicense(license.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [deleteLicense, extendLicense, purgeCache, startEdit, toggleStatus],
  );

  const table = useReactTable({
    data: filteredLicenses,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (editingLicense) {
      const response = await fetch(`/api/admin/licenses/${editingLicense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: fromDateInput(form.expiresAt),
        }),
      });

      if (!response.ok) {
        setError("Unable to save license.");
        return;
      }

      const data = (await response.json()) as { license: License };
      setLicenses((current) =>
        current.map((license) =>
          license.id === editingLicense.id
            ? { ...license, ...data.license }
            : license,
        ),
      );
    } else {
      const response = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: fromDateInput(form.expiresAt),
        }),
      });

      if (!response.ok) {
        setError("Unable to create license.");
        return;
      }

      const data = (await response.json()) as { license: License };
      setLicenses((current) => [
        { ...data.license, _count: { logs: 0 } },
        ...current,
      ]);
    }

    setDialogOpen(false);
  }

  if (isLoading) {
    return <LicenseManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <Badge variant="info" className="mb-3">
            Backend API / PostgreSQL
          </Badge>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
            License Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Search domains, audit chat bindings, suspend keys, and renew access.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New License
        </Button>
      </section>
      {error ? (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <CardTitle>Strict Bindings</CardTitle>
              <CardDescription>
                Absolute domain, script path, bot token, and chat ID.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search domain, chat ID, license key"
                  className="pl-9"
                />
              </div>
              <Tabs
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "ALL" | LicenseStatus)
                }
              >
                <TabsList>
                  <TabsTrigger value="ALL">All</TabsTrigger>
                  <TabsTrigger value="ACTIVE">Active</TabsTrigger>
                  <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
                  <TabsTrigger value="EXPIRED">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No licenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredLicenses.length} license
              {filteredLicenses.length === 1 ? "" : "s"} visible
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={submitForm} className="space-y-5">
            <DialogHeader>
              <DialogTitle>
                {editingLicense ? "Edit License" : "Create License"}
              </DialogTitle>
              <DialogDescription>
                {editingLicense
                  ? editingLicense.licenseKey
                  : "A cryptographic key will be generated automatically."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={form.allowedDomain}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowedDomain: event.target.value,
                    }))
                  }
                  placeholder="targetdomain.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="path">Path</Label>
                <Input
                  id="path"
                  value={form.allowedPath}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowedPath: event.target.value,
                    }))
                  }
                  placeholder="/app/cron"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bot-token">Telegram Bot Token</Label>
                <Input
                  id="bot-token"
                  value={form.telegramBotToken}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      telegramBotToken: event.target.value,
                    }))
                  }
                  placeholder="718293812:AAH..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-id">Telegram Chat ID</Label>
                <Input
                  id="chat-id"
                  value={form.telegramChatId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      telegramChatId: event.target.value,
                    }))
                  }
                  placeholder="88291029"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires At</Label>
                <Input
                  id="expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as LicenseStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingLicense ? "Save Changes" : "Create License"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LicenseManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-5 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

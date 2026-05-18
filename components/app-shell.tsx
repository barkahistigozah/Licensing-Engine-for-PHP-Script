"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  ShieldCheck,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Licenses",
    href: "/dashboard/licenses",
    icon: ShieldCheck,
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: ClipboardList,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  async function handleSignOut() {
    await signOut();
    setMobileNavOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-slate-950/70 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-normal">LEPS</div>
              <div className="text-xs text-muted-foreground">License Admin</div>
            </div>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    isActive &&
                      "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4">
            <div className="rounded-lg border border-border bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-emerald-300" />
                Edge Health
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <div className="text-foreground">24h</div>
                  Redis TTL
                </div>
                <div>
                  <div className="text-foreground">60/min</div>
                  Rate limit
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Open mobile navigation"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">LEPS Admin</div>
                <div className="truncate text-xs text-muted-foreground">
                  Ultra-strict license binding
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
            <Button variant="outline" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "bg-transparent hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/75"
            aria-label="Close mobile navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border bg-slate-950 shadow-2xl">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-normal">
                    LEPS
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    License Admin
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close mobile navigation"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      isActive &&
                        "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-4">
              <div className="mb-3 rounded-lg border border-border bg-slate-900/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-emerald-300" />
                  Edge Health
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="text-foreground">24h</div>
                    Redis TTL
                  </div>
                  <div>
                    <div className="text-foreground">60/min</div>
                    Rate limit
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

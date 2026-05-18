import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

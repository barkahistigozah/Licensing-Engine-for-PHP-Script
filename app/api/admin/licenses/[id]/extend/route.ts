import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { json, unauthorized } from "@/lib/server/http";
import { getLicenseCacheKey } from "@/lib/server/license";
import { prisma } from "@/lib/server/prisma";
import { deleteCache } from "@/lib/server/redis";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const { id } = await context.params;
  const current = await prisma.license.findUnique({ where: { id } });

  if (!current) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const baseDate =
    current.expiresAt.getTime() > Date.now() ? current.expiresAt : new Date();
  const expiresAt = new Date(baseDate);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);

  const license = await prisma.license.update({
    where: { id },
    data: {
      expiresAt,
      status: current.status === "EXPIRED" ? "ACTIVE" : current.status,
    },
  });

  await deleteCache(getLicenseCacheKey(current.licenseKey));

  return json({ license });
}

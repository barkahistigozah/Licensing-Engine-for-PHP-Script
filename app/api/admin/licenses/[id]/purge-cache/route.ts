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
  const license = await prisma.license.findUnique({ where: { id } });

  if (!license) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await deleteCache(getLicenseCacheKey(license.licenseKey));

  return json({
    message: "License cache purged.",
    cacheKey: getLicenseCacheKey(license.licenseKey),
  });
}

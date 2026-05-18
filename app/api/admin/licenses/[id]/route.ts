import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { deleteCache } from "@/lib/server/redis";
import { getLicenseCacheKey } from "@/lib/server/license";
import { json, unauthorized, validationError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { updateLicenseSchema } from "@/lib/server/schemas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const { id } = await context.params;
  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });

  if (!license) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return json({ license });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const input = updateLicenseSchema.parse(await request.json());
    const current = await prisma.license.findUnique({ where: { id } });

    if (!current) {
      return json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const license = await prisma.license.update({
      where: { id },
      data: input,
    });

    await deleteCache(getLicenseCacheKey(current.licenseKey));
    await deleteCache(getLicenseCacheKey(license.licenseKey));

    return json({ license });
  } catch (error) {
    return validationError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const { id } = await context.params;
  const current = await prisma.license.findUnique({ where: { id } });

  if (!current) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.license.delete({ where: { id } });
  await deleteCache(getLicenseCacheKey(current.licenseKey));

  return json({ message: "License deleted." });
}

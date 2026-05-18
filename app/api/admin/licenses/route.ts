import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { deleteCache } from "@/lib/server/redis";
import { generateLicenseKey, getLicenseCacheKey } from "@/lib/server/license";
import { json, unauthorized, validationError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { createLicenseSchema, licenseQuerySchema } from "@/lib/server/schemas";

function defaultExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);
  return expiresAt;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const query = licenseQuerySchema.parse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
  });

  const licenses = await prisma.license.findMany({
    where: {
      ...(query.status && query.status !== "ALL"
        ? { status: query.status }
        : {}),
      ...(query.q
        ? {
            OR: [
              { allowedDomain: { contains: query.q } },
              { telegramChatId: { contains: query.q } },
              { licenseKey: { contains: query.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          logs: true,
        },
      },
    },
  });

  return json({ licenses });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  try {
    const input = createLicenseSchema.parse(await request.json());
    const license = await prisma.license.create({
      data: {
        licenseKey: generateLicenseKey(),
        allowedDomain: input.allowedDomain,
        allowedPath: input.allowedPath,
        telegramBotToken: input.telegramBotToken,
        telegramChatId: input.telegramChatId,
        status: input.status,
        expiresAt: input.expiresAt ?? defaultExpiry(),
      },
    });

    await deleteCache(getLicenseCacheKey(license.licenseKey));

    return json({ license }, { status: 201 });
  } catch (error) {
    return validationError(error);
  }
}

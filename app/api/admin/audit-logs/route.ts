import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { json, unauthorized } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim();

  const logs = await prisma.verificationLog.findMany({
    where: {
      ...(status && status !== "ALL" ? { statusResult: status } : {}),
      ...(q
        ? {
            OR: [
              { requestHost: { contains: q } },
              { requestPath: { contains: q } },
              { requestIp: { contains: q } },
              { license: { licenseKey: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      license: {
        select: {
          licenseKey: true,
          allowedDomain: true,
        },
      },
    },
  });

  return json({ logs });
}

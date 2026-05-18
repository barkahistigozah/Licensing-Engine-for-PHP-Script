import { requireAdmin } from "@/lib/server/auth";
import { json, unauthorized } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return unauthorized();
  }

  const [activeLicenses, failedAttempts, totalLogs, successfulLogs] =
    await Promise.all([
      prisma.license.count({ where: { status: "ACTIVE" } }),
      prisma.verificationLog.count({
        where: {
          NOT: { statusResult: "SUCCESS" },
        },
      }),
      prisma.verificationLog.count(),
      prisma.verificationLog.count({ where: { statusResult: "SUCCESS" } }),
    ]);

  return json({
    activeLicenses,
    failedAttempts,
    successRate: totalLogs > 0 ? Math.round((successfulLogs / totalLogs) * 100) : 0,
    totalLogs,
  });
}

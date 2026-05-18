import { NextRequest } from "next/server";

import {
  createLicenseSignature,
  evaluateLicense,
  getLicenseCacheKey,
  hydrateCacheRecord,
  toCacheRecord,
  type LicenseCacheRecord,
} from "@/lib/server/license";
import { getClientIp, json, validationError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { deleteCache, getCache, rateLimit, setCache } from "@/lib/server/redis";
import { verifyLicenseSchema } from "@/lib/server/schemas";

const CACHE_TTL_SECONDS = 60 * 60 * 24;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

function apiResponse(
  data: unknown,
  init?: ResponseInit & {
    cacheStatus?: "HIT" | "MISS" | "BYPASS";
    rateLimitRemaining?: number;
  },
) {
  return json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(init?.cacheStatus ? { "X-LEPS-Cache": init.cacheStatus } : {}),
      ...(typeof init?.rateLimitRemaining === "number"
        ? { "X-RateLimit-Remaining": String(init.rateLimitRemaining) }
        : {}),
      ...init?.headers,
    },
  });
}

async function writeVerificationLog(data: {
  licenseId: string;
  requestIp: string;
  requestHost: string;
  requestPath: string;
  statusResult: string;
}) {
  try {
    await prisma.verificationLog.create({
      data,
    });
  } catch {
    // Verification must stay available for cached licenses even if DB logging fails.
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const limit = await rateLimit(`verify:${clientIp}`, 60, 60);

  if (!limit.allowed) {
    return apiResponse(
      {
        status: "RATE_LIMITED",
        error_code: "ERR_RATE_LIMITED",
        message: "Too many verification requests.",
      },
      {
        status: 429,
        cacheStatus: "BYPASS",
        rateLimitRemaining: limit.remaining,
      },
    );
  }

  try {
    const input = verifyLicenseSchema.parse(await request.json());
    const cacheKey = getLicenseCacheKey(input.license_key);
    let record = await getCache<LicenseCacheRecord>(cacheKey);
    let cacheStatus: "HIT" | "MISS" = "HIT";

    if (record) {
      record = hydrateCacheRecord(record);
    } else {
      cacheStatus = "MISS";
      let license = null;

      try {
        license = await prisma.license.findUnique({
          where: { licenseKey: input.license_key },
        });
      } catch {
        return apiResponse(
          {
            status: "UNAVAILABLE",
            error_code: "ERR_LICENSE_STORE_UNAVAILABLE",
            message:
              "The license store is temporarily unavailable and no cache entry exists.",
            cache: cacheStatus,
          },
          {
            status: 503,
            cacheStatus,
            rateLimitRemaining: limit.remaining,
          },
        );
      }

      if (!license) {
        return apiResponse(
          {
            status: "INVALID",
            error_code: "ERR_LICENSE_NOT_FOUND",
            message: "The license key is not registered.",
            cache: cacheStatus,
          },
          {
            status: 403,
            cacheStatus,
            rateLimitRemaining: limit.remaining,
          },
        );
      }

      record = toCacheRecord(license);
      await setCache(cacheKey, record, CACHE_TTL_SECONDS);
    }

    const statusResult = evaluateLicense(record, input);

    await writeVerificationLog({
      licenseId: record.id,
      requestIp: clientIp,
      requestHost: input.domain,
      requestPath: input.request_path,
      statusResult,
    });

    if (statusResult === "SUCCESS") {
      return apiResponse(
        {
          status: "VALID",
          message: "Authorization granted.",
          expires_at: new Date(record.expiresAt).toISOString(),
          signature: await createLicenseSignature(record),
          cache: cacheStatus,
        },
        {
          cacheStatus,
          rateLimitRemaining: limit.remaining,
        },
      );
    }

    if (statusResult === "SUSPENDED") {
      await deleteCache(cacheKey);

      return apiResponse(
        {
          status: "SUSPENDED",
          error_code: "ERR_LICENSE_REVOKED",
          message: "This license key has been manually suspended due to terms violation.",
          cache: cacheStatus,
        },
        {
          status: 403,
          cacheStatus,
          rateLimitRemaining: limit.remaining,
        },
      );
    }

    if (statusResult === "EXPIRED") {
      await deleteCache(cacheKey);

      return apiResponse(
        {
          status: "EXPIRED",
          error_code: "ERR_LICENSE_EXPIRED",
          message: "This license key has expired.",
          cache: cacheStatus,
        },
        {
          status: 403,
          cacheStatus,
          rateLimitRemaining: limit.remaining,
        },
      );
    }

    return apiResponse(
      {
        status: "INVALID",
        error_code:
          statusResult === "MISMATCH_TELEGRAM"
            ? "ERR_TELEGRAM_BINDING_MISMATCH"
            : "ERR_DOMAIN_PATH_MISMATCH",
        message:
          "The license configuration is locked to another absolute domain/subfolder or Telegram binding.",
        cache: cacheStatus,
      },
      {
        status: 403,
        cacheStatus,
        rateLimitRemaining: limit.remaining,
      },
    );
  } catch (error) {
    const response = validationError(error);

    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }
}

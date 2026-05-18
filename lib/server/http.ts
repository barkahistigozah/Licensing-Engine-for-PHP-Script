import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function unauthorized() {
  return json(
    {
      error: "UNAUTHORIZED",
      message: "Admin session is required.",
    },
    { status: 401 },
  );
}

export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      {
        error: "VALIDATION_ERROR",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  return json(
    {
      error: "BAD_REQUEST",
      message: "Invalid request payload.",
    },
    { status: 400 },
  );
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

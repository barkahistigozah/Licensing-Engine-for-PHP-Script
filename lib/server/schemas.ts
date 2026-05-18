import { z } from "zod";

const statusSchema = z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]);

const domainSchema = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .transform((value) =>
    value
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .toLowerCase(),
  )
  .pipe(
    z
      .string()
      .regex(
        /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/,
        "Use an absolute domain host without protocol or path.",
      ),
  );

const pathSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform((value) => {
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, "") : "/";
  });

export const createLicenseSchema = z.object({
  allowedDomain: domainSchema,
  allowedPath: pathSchema,
  telegramBotToken: z.string().trim().min(10).max(255),
  telegramChatId: z.string().trim().min(1).max(80),
  status: statusSchema.default("ACTIVE"),
  expiresAt: z.coerce.date().optional(),
});

export const updateLicenseSchema = createLicenseSchema.partial();

export const licenseQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: statusSchema.or(z.literal("ALL")).optional(),
});

export const verifyLicenseSchema = z.object({
  license_key: z.string().trim().regex(/^lic_[a-f0-9]{16,64}$/i),
  domain: domainSchema,
  request_path: pathSchema,
  telegram_bot_token: z.string().trim().min(10).max(255),
  telegram_chat_id: z.string().trim().min(1).max(80),
});

export type LicenseStatus = z.infer<typeof statusSchema>;

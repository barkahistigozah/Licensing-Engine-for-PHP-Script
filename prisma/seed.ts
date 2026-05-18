import { LicenseStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const now = new Date();

async function main() {
  process.env.LEPS_ALLOW_SIGNUP = "true";
  const { auth } = await import("@/lib/auth");

  const email = process.env.ADMIN_EMAIL ?? "admin@leps.local";
  const name = process.env.ADMIN_NAME ?? "Admin";
  const password = process.env.ADMIN_PASSWORD ?? "superadmin123";
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });
  }

  const licenses = [
    {
      licenseKey: "lic_9f83b27c51a04e3ab11c33f2",
      allowedDomain: "orbitpay.id",
      allowedPath: "/modules/telegram_bot",
      telegramBotToken: "718293812:AAH38xJkl921zP_wM192skdW",
      telegramChatId: "88291029",
      status: LicenseStatus.ACTIVE,
      expiresAt: addDays(now, 14),
    },
    {
      licenseKey: "lic_c3d4ac61cf5d49d6824d92aa",
      allowedDomain: "vendorhub.co",
      allowedPath: "/app/cron",
      telegramBotToken: "913882201:AAH_c0v6fQd2masked",
      telegramChatId: "-10021870019",
      status: LicenseStatus.ACTIVE,
      expiresAt: addDays(now, 16),
    },
    {
      licenseKey: "lic_511de66dfd88415bb470e2e0",
      allowedDomain: "invoiceguard.app",
      allowedPath: "/cron",
      telegramBotToken: "604829441:AAE_securemasked",
      telegramChatId: "518280144",
      status: LicenseStatus.SUSPENDED,
      expiresAt: addDays(now, 7),
    },
    {
      licenseKey: "lic_0b46b0bf4ad44f6da3c328e9",
      allowedDomain: "kiosku.net",
      allowedPath: "/",
      telegramBotToken: "771904221:AAF_masked",
      telegramChatId: "10098028",
      status: LicenseStatus.EXPIRED,
      expiresAt: addDays(now, -4),
    },
  ];

  for (const license of licenses) {
    await prisma.license.upsert({
      where: { licenseKey: license.licenseKey },
      update: license,
      create: license,
    });
  }

  const seededLicenses = await prisma.license.findMany({
    where: {
      licenseKey: {
        in: licenses.map((license) => license.licenseKey),
      },
    },
  });

  await prisma.verificationLog.deleteMany({
    where: {
      licenseId: {
        in: seededLicenses.map((license) => license.id),
      },
    },
  });

  const seededLicense = seededLicenses.find(
    (license) => license.licenseKey === "lic_511de66dfd88415bb470e2e0",
  );

  if (!seededLicense) {
    throw new Error("Seeded suspended license was not found.");
  }

  await prisma.verificationLog.createMany({
    data: [
      {
        licenseId: seededLicense.id,
        requestIp: "45.77.23.19",
        requestHost: "invoiceguard-clone.app",
        requestPath: "/cron",
        statusResult: "MISMATCH_DOMAIN",
      },
      {
        licenseId: seededLicense.id,
        requestIp: "182.253.19.7",
        requestHost: "invoiceguard.app",
        requestPath: "/cron",
        statusResult: "SUSPENDED",
      },
    ],
  });

  console.log(`Seeded admin "${email}" and ${licenses.length} licenses.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/server/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.LEPS_ALLOW_SIGNUP !== "true",
    minPasswordLength: 4,
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  plugins: [nextCookies()],
});

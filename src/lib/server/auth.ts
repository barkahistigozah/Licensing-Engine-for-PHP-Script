import { prismaAdapter } from '@better-auth/prisma-adapter'
import { betterAuth } from 'better-auth'
import { prisma } from './prisma'

const authUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173'
export const MIN_PASSWORD_LENGTH =
  process.env.NODE_ENV === 'production' ? 12 : 8
export const SIGNUP_DISABLED = true as const

export const isAdminEmail = (
  email: string | undefined,
  configuredEmail = process.env.ADMIN_EMAIL
) =>
  Boolean(
    email &&
    configuredEmail &&
    email.trim().toLowerCase() === configuredEmail.trim().toLowerCase()
  )

export const auth = betterAuth({
  baseURL: authUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: SIGNUP_DISABLED,
    minPasswordLength: MIN_PASSWORD_LENGTH
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: 'database',
    modelName: 'rateLimit',
    customRules: { '/sign-in/email': { window: 10, max: 3 } }
  },
  trustedOrigins: [authUrl, 'http://127.0.0.1:5173', 'http://127.0.0.1:4173']
})

export async function getAdminSession(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  return isAdminEmail(session?.user.email) ? session : null
}

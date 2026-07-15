import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { MIN_PASSWORD_LENGTH } from '../src/lib/server/auth'
import { prisma } from '../src/lib/server/prisma'

async function main() {
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < MIN_PASSWORD_LENGTH)
    throw new Error(
      `ADMIN_PASSWORD must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    )

  const email = (process.env.ADMIN_EMAIL ?? 'admin@leps.local').toLowerCase()
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const passwordHash = await hashPassword(password)

  await prisma.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email } })) return
    const id = randomUUID()
    const now = new Date()
    await tx.user.create({
      data: {
        id,
        email,
        name,
        emailVerified: true,
        createdAt: now,
        updatedAt: now
      }
    })
    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: id,
        providerId: 'credential',
        userId: id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now
      }
    })
  })

  console.log(`Admin ready: ${email}`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed.')
  process.exit(1)
})

// ~/server/utils/db.ts - V1.0 - Inicialização do Prisma Client (Singleton para HMR)
import { PrismaClient } from '@prisma/client'

/**
 * Em ambiente de desenvolvimento, criamos o client no escopo global
 * para evitar múltiplas instâncias quando o Nuxt reinicia em HMR (Hot Module Replacement).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // opcional: logs do prisma
    log: ['query', 'info', 'warn', 'error'], 
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
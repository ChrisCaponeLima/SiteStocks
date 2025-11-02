// /server/utils/prisma.ts - V1.0 - Criação do Prisma Client Singleton
import { PrismaClient } from '@prisma/client'

// Previne a criação de múltiplas instâncias do Prisma Client em desenvolvimento com hot-reload.
const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV === 'development') global.prisma = prisma

export { prisma }
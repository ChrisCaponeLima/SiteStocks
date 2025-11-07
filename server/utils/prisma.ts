// /server/utils/prisma.ts - V1.0 - Configuração e Singleton do Prisma Client para uso no ambiente Nitro (Server).
import { PrismaClient } from '@prisma/client'

/**
 * V1.0 - Variável global para armazenar a instância do Prisma Client.
 * O uso de 'globalThis' em desenvolvimento impede que o hot-reloading do Nuxt/Vite crie novas instâncias a cada mudança,
 * prevenindo o esgotamento de conexões.
 */
// eslint-disable-next-line no-var
var prisma: PrismaClient | undefined

/**
 * V1.0 - Função para garantir que o Prisma Client seja inicializado uma única vez.
 */
export const usePrisma = (): PrismaClient => {
  if (process.env.NODE_ENV === 'production') {
    // Em produção, usa uma nova instância local.
    return new PrismaClient()
  }

  // Em desenvolvimento, usa globalThis para o singleton.
  if (!prisma) {
    prisma = new PrismaClient()
  }

  return prisma
}

// V1.0 - Permite que a variável global seja tipada (somente para TypeScript)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient
}
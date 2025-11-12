// /server/api/auth/me.get.ts - V1.0 - Validação real via H3: lê o cookie HttpOnly, valida JWT e retorna dados do usuário no formato da AuthStore.
import { defineEventHandler, getCookie, setResponseStatus } from 'h3'
import { verifyToken } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 1) Lê o token do cookie HttpOnly
    const token = getCookie(event, 'auth_token')

    if (!token) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    // 2) Decodifica + valida o token JWT
    const payload = verifyToken(token)  
    // payload = { userId, roleLevel, cotistaId }

    if (!payload?.userId) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    // 3) Busca os dados completos do usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        cotista: {
          select: {
            id: true,
            numeroDaConta: true,
            dataCriacao: true,
          },
        },
        role: {
          select: {
            level: true,
            name: true,
          }
        }
      }
    })

    if (!user) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    // 4) Formato exato esperado pela AuthStore
    return {
      user: {
        id: user.id,
        nome: user.nome,
        sobrenome: user.sobrenome,
        email: user.email,
        roleLevel: user.role?.level ?? 0,
        roleName: user.role?.name ?? 'cotista',
        numeroDaConta: user.cotista?.numeroDaConta ?? null,
      },
      cotistaId: user.cotista?.id ?? null
    }

  } catch (err) {
    console.error('Erro no /api/auth/me:', err)
    setResponseStatus(event, 500)
    return { user: null, cotistaId: null }
  }
})

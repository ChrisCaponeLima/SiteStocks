// /server/api/auth/me.get.ts - V2.1 - SSR-safe com retorno consistente
import { H3Event, setResponseStatus, getHeader } from 'h3'
import { parse as parseCookie } from 'cookie'
import { verifyToken } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const cookieHeader = getHeader(event, 'cookie')
    if (!cookieHeader) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    const cookies = parseCookie(cookieHeader)
    const authToken = cookies.auth_token
    if (!authToken) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    const payload = verifyToken(authToken)
    if (!payload?.userId) {
      setResponseStatus(event, 401)
      return { user: null, cotistaId: null }
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        cotista: { select: { id: true, numeroDaConta: true, dataCriacao: true } },
        role: { select: { name: true, level: true } },
      },
    })

    if (!user) {
      setResponseStatus(event, 404)
      return { user: null, cotistaId: null }
    }

    // ✅ Retorna formato idêntico ao esperado pela store
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
      cotistaId: user.cotista?.id ?? null,
    }
  } catch (error) {
    console.error('Erro crítico no /api/auth/me:', error)
    setResponseStatus(event, 500)
    return { user: null, cotistaId: null }
  }
})

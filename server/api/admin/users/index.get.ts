// /server/api/admin/users/index.get.ts - V3.2
// 🔒 Correção final: ajustado para o schema Prisma real (User sem campo createdAt).
// Mantém arquitetura JWT Cookie-only, logs seguros e guia completo para replicação.

import { defineEventHandler, getQuery, createError, getCookie } from 'h3'
import { prisma } from '~/server/utils/db'
import { verifyToken } from '~/server/utils/auth'

// -----------------------------------------------------------------------------
// 1️⃣ Tipagem e constantes do padrão de segurança
// -----------------------------------------------------------------------------
interface AuthPayload {
  userId: number
  role: string
  roleLevel: number
}

const MIN_LEVEL_REQUIRED = 1 // Nível mínimo para acessar esta rota (Admin)

// -----------------------------------------------------------------------------
// 2️⃣ Handler principal da rota
// -----------------------------------------------------------------------------
export default defineEventHandler(async (event) => {
  try {
    // -------------------------------------------------------------------------
    // 🔐 ETAPA 1: AUTENTICAÇÃO
    // -------------------------------------------------------------------------
    const authToken = getCookie(event, 'auth_token')

    if (!authToken) {
      throw createError({ statusCode: 401, statusMessage: 'Não autorizado. Cookie ausente.' })
    }

    let payload: AuthPayload
    try {
      payload = verifyToken(authToken) as AuthPayload
    } catch (err) {
      console.error('[AUTH ERROR] Token inválido ou expirado:', err)
      throw createError({ statusCode: 401, statusMessage: 'Token inválido ou sessão expirada.' })
    }

    const userLevel = payload.roleLevel

    if (userLevel < MIN_LEVEL_REQUIRED) {
      console.warn(
        `[SECURITY] Acesso negado: usuário nível ${userLevel} tentou acessar /admin/users (mínimo: ${MIN_LEVEL_REQUIRED})`
      )
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso proibido. Nível de permissão insuficiente.',
      })
    }

    // -------------------------------------------------------------------------
    // 📋 ETAPA 2: FILTROS DE CONSULTA
    // -------------------------------------------------------------------------
    const { search, level: levelFilter, status: statusFilter } = getQuery(event)

    // Se o usuário não for Root (99), ele só pode ver níveis menores que o seu
    const maxLevel = userLevel < 99 ? userLevel : undefined
    const whereConditions: any = {}
    const roleLevelConditions: any = {}

    if (maxLevel) roleLevelConditions.lt = maxLevel

    if (levelFilter && !isNaN(Number(levelFilter))) {
      const requestedLevel = Number(levelFilter)
      if (maxLevel && requestedLevel >= maxLevel) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Filtro de nível não permitido pela sua permissão.',
        })
      }
      roleLevelConditions.equals = requestedLevel
    }

    if (Object.keys(roleLevelConditions).length > 0) {
      whereConditions.role = { is: { level: roleLevelConditions } }
    }

    if (statusFilter !== undefined && statusFilter !== '') {
      const ativoValue =
        String(statusFilter).toLowerCase() === 'true' ||
        String(statusFilter).toLowerCase() === 'ativo'
      whereConditions.ativo = ativoValue
    }

    if (search) {
      const s = String(search)
      whereConditions.OR = [
        { nome: { contains: s, mode: 'insensitive' } },
        { sobrenome: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ]
    }

    // -------------------------------------------------------------------------
    // 💾 ETAPA 3: CONSULTA PRISMA (corrigida para o schema atual)
    // -------------------------------------------------------------------------
    console.log('[ADMIN][USERS] Filtros aplicados →', JSON.stringify(whereConditions, null, 2))

    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        cpf: true,
        nome: true,
        sobrenome: true,
        email: true,
        telefone: true,
        ativo: true,
        ultimoAcesso: true, // ✅ Campo existente no schema
        roleId: true,
        role: {
          select: {
            name: true,
            level: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    // -------------------------------------------------------------------------
    // 🧮 ETAPA 4: FORMATAÇÃO E RETORNO
    // -------------------------------------------------------------------------
    const finalUsers = users.map((u) => ({
      ...u,
      level: u.role?.level ?? 0,
      roleLevel: u.role?.level ?? 0,
      roleName: u.role?.name ?? 'SEM CARGO',
      status: u.ativo ? 'ATIVO' : 'INATIVO',
    }))

    // 🧩 Segurança adicional: remove o próprio usuário da listagem
    const safeList = finalUsers.filter((u) => u.id !== payload.userId)

    return {
      success: true,
      count: safeList.length,
      users: safeList,
    }
  } catch (error: any) {
    // -----------------------------------------------------------------------
    // ⚠️ ETAPA 5: TRATAMENTO CENTRALIZADO DE ERROS
    // -----------------------------------------------------------------------
    console.error('[ADMIN][USERS] ERRO CRÍTICO:', error)
    throw createError({
      statusCode: 500,
      message: error?.message || 'Falha ao buscar a lista de usuários.',
    })
  }
})

// -----------------------------------------------------------------------------
// 🧭 GUIA PARA DESENVOLVEDORES
// -----------------------------------------------------------------------------
/**
 * 🔐 PADRÃO DE AUTENTICAÇÃO (JWT COOKIE-ONLY)
 *  - Sempre use `getCookie(event, 'auth_token')` no backend.
 *  - Nunca aceite Authorization headers vindos do cliente.
 *  - Valide o token com `verifyToken()` e extraia roleLevel.
 *
 * ⚙️ PADRÃO DE AUTORIZAÇÃO
 *  - `const userLevel = payload.roleLevel`
 *  - `if (userLevel < REQUIRED_LEVEL) throw createError({ statusCode: 403 })`
 *  - Super Admins (roleLevel 99) ignoram restrições de listagem.
 *
 * 💾 PADRÃO PRISMA
 *  - Só selecionar campos realmente existentes no schema.
 *  - Validar relações opcionais (`role?.name`, `role?.level`).
 *  - Adicionar logs para auditoria de filtros.
 *
 * 🧩 PADRÃO DE RETORNO
 *  - Sempre retornar `{ success, count, users }`
 *  - Nunca expor dados sensíveis (senha, tokens etc.)
 *
 * 📘 REPLICAÇÃO
 *  - Este arquivo é modelo para todas as rotas administrativas:
 *    /server/api/admin/* (listagem, auditoria, relatórios, etc.)
 *  - Copie a estrutura e ajuste apenas os filtros e o modelo Prisma.
 */

// /server/utils/auth.ts - V2.4 FINAL
// 🔒 Arquitetura Segura JWT Cookie-only: autenticação e autorização unificadas.
// Inclui assertAdminPermission, authorizeCotista e assertUserAuthenticated.
// Segue o padrão de bancos digitais: autenticação por Cookie HttpOnly + payload injetado no contexto.

import jwt from 'jsonwebtoken'
import { H3Event, createError, getHeader } from 'h3'
import bcrypt from 'bcryptjs'

// -----------------------------------------------------------------------------
// 1️⃣ CONSTANTES DE CONFIGURAÇÃO
// -----------------------------------------------------------------------------
const ADMIN_LEVEL = 2              // Nível de permissão necessário para ignorar vínculo de cotista
const MIN_ADMIN_LEVEL = 1          // Nível mínimo para rotas administrativas
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_NAO_USAR_EM_PRODUCAO'
const SALT_ROUNDS = 10             // Custo do hash BCrypt

// -----------------------------------------------------------------------------
// 2️⃣ TIPAGEM DO PAYLOAD JWT
// -----------------------------------------------------------------------------
export interface AuthPayload {
  userId: number
  roleLevel: number
  cotistaId: number | null
}

// -----------------------------------------------------------------------------
// 3️⃣ FUNÇÕES DE HASH DE SENHAS (BCrypt)
// -----------------------------------------------------------------------------

/**
 * Cria o hash seguro de uma senha em texto puro.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se a senha fornecida corresponde ao hash armazenado.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// -----------------------------------------------------------------------------
// 4️⃣ FUNÇÕES JWT (GERAÇÃO E VALIDAÇÃO DE TOKEN)
// -----------------------------------------------------------------------------

/**
 * Verifica e decodifica um token JWT (string pura).
 * Lança erro 401 se inválido ou expirado.
 */
export const verifyToken = (token: string): AuthPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    return payload
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AUTH] Erro ao verificar token:', e)
    }
    throw createError({ statusCode: 401, statusMessage: 'Token inválido ou expirado.' })
  }
}

/**
 * Cria um novo token JWT assinado com o payload do usuário.
 */
export const signToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' })
}

// -----------------------------------------------------------------------------
// 5️⃣ FUNÇÕES DE AUTORIZAÇÃO E AUTENTICAÇÃO H3
// -----------------------------------------------------------------------------

/**
 * 🔐 authorizeCotista(event, requestedCotistaId)
 * Verifica se o usuário logado pode acessar os dados do cotista informado.
 * Admins (roleLevel >= 2) têm acesso a qualquer cotista.
 * Usuários comuns só podem acessar seu próprio cotistaId.
 */
export const authorizeCotista = (event: H3Event, requestedCotistaId: number): AuthPayload => {
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Token ausente. Acesso negado.' })
  }

  const payload = verifyToken(token)

  if (payload.roleLevel < ADMIN_LEVEL && payload.cotistaId !== requestedCotistaId) {
    console.warn(
      `[SECURITY] Tentativa de acesso não autorizado — userId ${payload.userId} tentou acessar cotista ${requestedCotistaId}.`
    )
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso Proibido. Você só pode acessar seus próprios dados.',
    })
  }

  return payload
}

/**
 * 🔐 assertAdminPermission(event, minLevel = 1)
 * Usado em todas as rotas /api/admin/*
 * Garante que o usuário autenticado tenha nível de permissão suficiente.
 */
export const assertAdminPermission = (
  event: H3Event,
  minLevel: number = MIN_ADMIN_LEVEL
): AuthPayload => {
  const currentUser = event.context.user as AuthPayload | undefined
  const currentRoleLevel =
    currentUser && typeof currentUser.roleLevel === 'number' ? currentUser.roleLevel : 0

  if (!currentUser || currentRoleLevel < minLevel) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso Proibido. Nível de permissão não atingido.',
    })
  }

  return currentUser
}

/**
 * 🔐 assertUserAuthenticated(event)
 * NOVO PADRÃO — usado em rotas de usuário autenticado (ex.: /api/savings/*)
 * Verifica se o usuário está logado e vinculado a um cotista.
 * Diferente das rotas admin, aqui não se exige nível mínimo, apenas vínculo.
 */
export const assertUserAuthenticated = (event: H3Event): AuthPayload => {
  const currentUser = event.context.user as AuthPayload | undefined

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autorizado. Faça login para acessar este recurso.',
    })
  }

  if (!currentUser.cotistaId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso Proibido. Usuário não vinculado a um Cotista.',
    })
  }

  return currentUser
}

// -----------------------------------------------------------------------------
// 6️⃣ GUIA DE USO (para desenvolvedores replicarem corretamente)
// -----------------------------------------------------------------------------
/**
 * 🔑 PADRÃO DE SEGURANÇA:
 * - Todos os tokens JWT são transmitidos via Cookie HttpOnly ('auth_token')
 * - O middleware global injeta event.context.user no servidor
 * - Nunca aceitar Authorization headers vindos do cliente manualmente
 *
 * 🧩 FUNÇÕES DISPONÍVEIS:
 *  - verifyToken(token)             → decodifica token puro
 *  - signToken(payload)             → gera novo token
 *  - authorizeCotista(event, id)    → valida acesso ao cotista correto
 *  - assertAdminPermission(event)   → valida acesso administrativo (nível)
 *  - assertUserAuthenticated(event) → valida login + vínculo de cotista
 *
 * 🧱 REPLICAÇÃO:
 *  - Rotas Admin → assertAdminPermission(event)
 *  - Rotas Cotista → authorizeCotista(event, requestedCotistaId)
 *  - Rotas Financeiras (Caixinhas, Rendimento, etc.) → assertUserAuthenticated(event)
 *
 * 🔒 LOGS DE SEGURANÇA:
 *  - Mensagens sensíveis não devem ser exibidas fora de NODE_ENV=development
 */


// /server/api/cotistas.get.ts - V2.0
// 🔒 Refatoração completa: autenticação via Cookie HTTPOnly (sem Authorization header).
// Padrão oficial de rota protegida (nível mínimo 1 = Admin/Cotista autorizado).

import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/db'
import { verifyToken } from '~/server/utils/auth'

// -----------------------------------------------------------------------------
// 1️⃣ Tipos de dados
// -----------------------------------------------------------------------------
interface AuthPayload {
  userId: number
  role: string
  roleLevel: number
}

interface CotistaListItem {
  id: number
  nomeCompleto: string
  numeroDaConta: string
}

// -----------------------------------------------------------------------------
// 2️⃣ Constante de acesso mínimo exigido
// -----------------------------------------------------------------------------
const MIN_LEVEL_REQUIRED = 1

// -----------------------------------------------------------------------------
// 3️⃣ Handler principal da rota
// -----------------------------------------------------------------------------
export default defineEventHandler(async (event): Promise<CotistaListItem[]> => {
  // ---------------------------------------------------------------------------
  // 🔐 ETAPA 1: Autenticação segura via Cookie
  // ---------------------------------------------------------------------------

  // ✅ Captura o token do cookie (não via header)
  const authToken = getCookie(event, 'auth_token')
  if (!authToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autorizado. Cookie de autenticação ausente.',
    })
  }

  // ✅ Validação do token JWT
  let payload: AuthPayload
  try {
    payload = verifyToken(authToken) as AuthPayload
  } catch (err) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token inválido ou sessão expirada.',
    })
  }

  // ✅ Autorização: exige nível mínimo de acesso
  const userLevel = payload.roleLevel
  if (userLevel < MIN_LEVEL_REQUIRED) {
    console.warn(
      `[SECURITY] Usuário nível ${userLevel} tentou acessar rota restrita (mínimo ${MIN_LEVEL_REQUIRED}).`
    )
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso proibido. Nível de permissão insuficiente.',
    })
  }

  // ---------------------------------------------------------------------------
  // 📊 ETAPA 2: Consulta ao banco de dados
  // ---------------------------------------------------------------------------
  try {
    const cotistasData = await prisma.cotista.findMany({
      select: {
        id: true,
        numeroDaConta: true,
        user: {
          select: {
            nome: true,
            sobrenome: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    })

    // -------------------------------------------------------------------------
    // 🧩 ETAPA 3: Formatação do retorno
    // -------------------------------------------------------------------------
    const formattedCotistas: CotistaListItem[] = cotistasData
      .filter((c) => c.user !== null)
      .map((c) => ({
        id: c.id,
        nomeCompleto: `${c.user!.nome} ${c.user!.sobrenome}`,
        numeroDaConta: c.numeroDaConta,
      }))

    return formattedCotistas
  } catch (error: any) {
    console.error('Erro ao buscar lista de cotistas (API):', error)
    throw createError({
      statusCode: 500,
      statusMessage:
        'Erro interno ao carregar a lista de cotistas. Verifique o log do servidor.',
    })
  }
})

// -----------------------------------------------------------------------------
// 🧭 GUIA PARA DESENVOLVEDORES
// -----------------------------------------------------------------------------
/**
 * 🔐 PADRÃO DE AUTENTICAÇÃO
 *  - Sempre use `getCookie(event, 'auth_token')` para obter o JWT.
 *  - Nunca confie em headers Authorization enviados pelo cliente.
 *  - Valide com `verifyToken()` e extraia `roleLevel`.
 *
 * ⚙️ PADRÃO DE AUTORIZAÇÃO
 *  - Compare `roleLevel` com o nível mínimo exigido.
 *  - Se insuficiente → `throw createError({ statusCode: 403 })`
 *
 * 💾 PADRÃO DE ERROS
 *  - 401 → cookie ausente ou token inválido
 *  - 403 → acesso proibido
 *  - 500 → falha de banco de dados
 *
 * 📘 REPLICAÇÃO
 *  - Este modelo deve ser usado em todas as rotas protegidas.
 *  - Ex: /api/usuarios, /api/fundos, /api/movimentacoes etc.
 */

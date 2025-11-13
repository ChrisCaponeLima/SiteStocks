// /server/api/gerar-movimentacao-rendimento.post.ts - V3.1
// 🔒 Refatoração total baseada na V2.6: mantém toda a lógica de cálculo original,
// adicionando autenticação via Cookie HTTPOnly (JWT Cookie-only Architecture).
// Nenhuma funcionalidade financeira foi removida. Este arquivo é o modelo seguro
// e documentado para replicação nas demais rotas administrativas (nível mínimo 2).

import { defineEventHandler, createError, H3Event, readBody, getCookie } from 'h3'
import { prisma } from '~/server/utils/db'
import { verifyToken } from '~/server/utils/auth'

// -----------------------------------------------------------------------------
// 1️⃣ Tipagem de dados e regras de acesso
// -----------------------------------------------------------------------------

/**
 * Dados esperados no token JWT (gerado em /api/auth/login).
 */
interface AuthPayload {
  userId: number
  role: string
  roleLevel: number
  cotistaId?: number
}

/**
 * Estrutura esperada no corpo da requisição POST.
 */
interface MovimentacaoPayload {
  cotistaId: number
  taxa: number
  dataInicio: string
  dataFim: string
}

/**
 * Constantes de regra de negócio.
 */
const MIN_LEVEL_REQUIRED = 2 // Somente ADMIN e acima
const DIA_LANCAMENTO = 23 // Dia fixo de lançamento mensal

// -----------------------------------------------------------------------------
// 2️⃣ Manipulador principal da rota
// -----------------------------------------------------------------------------

export default defineEventHandler(async (event: H3Event) => {
  // ---------------------------------------------------------------------------
  // 🔐 ETAPA 1: AUTENTICAÇÃO E AUTORIZAÇÃO (JWT Cookie-only)
  // ---------------------------------------------------------------------------

  // ✅ Recupera o cookie HTTPOnly contendo o token
  const authToken = getCookie(event, 'auth_token')
  if (!authToken) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado. Cookie de sessão ausente.' })
  }

  // ✅ Decodifica o token e valida a sessão
  let payload: AuthPayload
  try {
    payload = verifyToken(authToken) as AuthPayload
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Token inválido ou sessão expirada.' })
  }

  // ✅ Verifica nível de permissão (somente ADMIN/OWNER)
  const userLevel = payload.roleLevel
  if (userLevel < MIN_LEVEL_REQUIRED) {
    console.warn(`[SECURITY] Acesso negado: usuário nível ${userLevel} tentou acessar rota restrita.`)
    throw createError({
      statusCode: 403,
      statusMessage: `Acesso Proibido. É necessário nível ${MIN_LEVEL_REQUIRED} ou superior.`,
    })
  }

  // ---------------------------------------------------------------------------
  // 📥 ETAPA 2: VALIDAÇÃO DO PAYLOAD (corpo da requisição)
  // ---------------------------------------------------------------------------

  const body = await readBody<MovimentacaoPayload>(event)
  if (!body || !body.cotistaId || typeof body.taxa !== 'number' || !body.dataInicio || !body.dataFim) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Parâmetros inválidos. É obrigatório informar cotistaId, taxa, dataInicio e dataFim.',
    })
  }

  const { cotistaId, taxa, dataInicio, dataFim } = body

  // ---------------------------------------------------------------------------
  // 💹 ETAPA 3: BUSCA DO SALDO INICIAL BASE (V2.6 mantida)
  // ---------------------------------------------------------------------------

  const dateFactory = (dateString: string) => {
    const d = new Date(dateString)
    d.setHours(0, 0, 0, 0)
    d.setDate(DIA_LANCAMENTO)
    return d
  }

  const startDate = dateFactory(dataInicio)
  const endDate = dateFactory(dataFim)

  // 🔎 Busca o último saldo anterior à data inicial
  const dataLimiteBusca = new Date(startDate)
  dataLimiteBusca.setDate(dataLimiteBusca.getDate() - 1)
  dataLimiteBusca.setHours(23, 59, 59, 999)

  const ultimoSaldo = await prisma.movimentacaoCotista.findFirst({
    where: {
      cotistaId,
      dataMovimentacao: { lt: dataLimiteBusca },
    },
    orderBy: { dataMovimentacao: 'desc' },
    select: { valor: true, tipo: true, dataMovimentacao: true },
  })

  const valorInicialBase = ultimoSaldo ? ultimoSaldo.valor.toNumber() : 0
  if (valorInicialBase <= 0) {
    console.warn(`[WARN] Nenhum saldo anterior encontrado para o Cotista ${cotistaId}. Base inicial R$ 0,00.`)
  } else {
    console.log(
      `[INFO] Base inicial do Cotista ${cotistaId}: R$ ${valorInicialBase.toFixed(
        2
      )} (${ultimoSaldo?.dataMovimentacao.toLocaleDateString('pt-BR')})`
    )
  }

  // ---------------------------------------------------------------------------
  // 🧮 ETAPA 4: GERAÇÃO DOS RENDIMENTOS (loop mês a mês)
  // ---------------------------------------------------------------------------

  try {
    console.log(
      `[ADMIN] Iniciando geração de rendimentos | Cotista ${cotistaId} | Taxa: ${taxa * 100}% | Período: ${dataInicio} → ${dataFim}`
    )

    const generatedMovements: any[] = []
    let valorBaseAcumulado = valorInicialBase
    let currentDateIterator = new Date(startDate)

    while (currentDateIterator <= endDate) {
      const dataLancamento = new Date(
        currentDateIterator.getFullYear(),
        currentDateIterator.getMonth(),
        DIA_LANCAMENTO,
        0, 0, 0
      )

      // Evita duplicidade de lançamentos
      const existingMovement = await prisma.movimentacaoCotista.findFirst({
        where: { cotistaId, dataMovimentacao: dataLancamento, tipo: 'RENDIMENTO' },
      })

      if (existingMovement) {
        console.log(`[INFO] Já existe rendimento em ${dataLancamento.toLocaleDateString('pt-BR')}. Pulando.`)
        valorBaseAcumulado += existingMovement.valor.toNumber()
      } else {
        const valorRendimento = valorBaseAcumulado * taxa
        if (valorRendimento < 0.01) {
          console.warn(`[STOP] Rendimento ínfimo (${valorRendimento.toFixed(6)}). Interrompendo geração.`)
          break
        }

        const movimentacao = await prisma.movimentacaoCotista.create({
          data: {
            cotistaId,
            dataMovimentacao: dataLancamento,
            tipo: 'RENDIMENTO',
            valor: valorRendimento,
          },
        })

        generatedMovements.push(movimentacao)
        valorBaseAcumulado += valorRendimento
      }

      currentDateIterator.setMonth(currentDateIterator.getMonth() + 1)
      currentDateIterator.setDate(DIA_LANCAMENTO)
    }

    // -------------------------------------------------------------------------
    // ✅ ETAPA 5: RETORNO FINAL (mantido integralmente)
    // -------------------------------------------------------------------------
    return {
      success: true,
      cotistaId,
      count: generatedMovements.length,
      taxaAplicada: taxa,
      message: `Geração concluída com ${generatedMovements.length} lançamentos. Base final: ${valorBaseAcumulado.toFixed(2)}.`,
      movimentacoes: generatedMovements.map((m) => ({
        id: m.id,
        data: m.dataMovimentacao,
        valor: m.valor.toFixed(2),
      })),
    }
  } catch (error: any) {
    console.error(`[ERRO] Falha ao gerar rendimentos para cotista ${cotistaId}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno ao gerar lançamentos: ${error.message || 'indefinido'}`,
    })
  }
})

// -----------------------------------------------------------------------------
// 🧭 GUIA PARA DESENVOLVEDORES
// -----------------------------------------------------------------------------
/**
 * 🔐 PADRÃO DE AUTENTICAÇÃO:
 *   - Sempre recuperar o JWT via getCookie(event, 'auth_token').
 *   - Nunca confiar em headers Authorization no backend.
 *   - Validar com verifyToken() e capturar roleLevel do payload.
 *
 * ⚙️ PADRÃO DE AUTORIZAÇÃO:
 *   - Comparar roleLevel com MIN_LEVEL_REQUIRED antes de qualquer ação sensível.
 *
 * 💾 PADRÃO DE ERROS:
 *   - 401 → Token ausente, inválido ou expirado.
 *   - 403 → Permissão insuficiente.
 *   - 400 → Parâmetros inválidos.
 *   - 500 → Falhas internas do Prisma ou lógica de negócio.
 *
 * 🧮 PADRÃO DE CÁLCULO:
 *   - Sempre basear o rendimento no último saldo antes da data inicial.
 *   - Loop mensal (dia fixo 23), evita duplicação de rendimentos.
 *   - Atualiza base acumulada mês a mês.
 *
 * 📘 REPLICAÇÃO:
 *   - Este arquivo é modelo oficial de endpoint protegido (nível >= 2).
 *   - Replicar estrutura em: /api/ajuste-saldo, /api/aprovar-rendimento, etc.
 */

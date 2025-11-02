// /server/api/investimento/[cotistaId].ts - V1.0 - Endpoint para buscar dados do cotista e seu histórico
import { prisma } from '~/server/utils/prisma'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const cotistaId = getRouterParam(event, 'cotistaId')
    const id = parseInt(cotistaId as string)

    if (isNaN(id)) {
      setResponseStatus(event, 400)
      return { error: 'ID do cotista inválido.' }
    }

    const cotistaData = await prisma.cotista.findUnique({
      where: { id },
      include: {
        fundo: true,
        movimentacoes: {
          orderBy: { dataMovimentacao: 'asc' },
        },
        fundo: {
          include: {
            historicoRentabilidade: {
              orderBy: { mesAno: 'asc' },
            },
          },
        },
      },
    })

    if (!cotistaData) {
      setResponseStatus(event, 404)
      return { error: `Cotista com ID ${id} não encontrado.` }
    }

    // Retorna os dados completos, prontos para serem usados na página
    return cotistaData

  } catch (error) {
    console.error("Erro ao buscar dados do cotista:", error)
    setResponseStatus(event, 500)
    return { error: 'Erro interno do servidor ao buscar os dados.' }
  }
})
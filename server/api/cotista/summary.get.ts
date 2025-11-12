// /server/api/cotista/summary.get.ts - V1.3 - REVERTIDA: Reverte autenticação para obter cotistaId via QUERY (V1.2) para que o frontend quebre o ciclo de SSR e volte a funcionar. 🚨 RISCO DE SEGURANÇA (IDOR).

import { defineEventHandler, getQuery, createError } from 'h3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define a estrutura de resposta que o frontend espera (Inalterado)
interface CotistaSummary {
  saldoTotal: number;
  totalGanhos: number;
  capitalInicial: number;
  fundoId: number;
  historicoRentabilidade: any[];
  // ✅ NOVOS CAMPOS ADICIONADOS
  dataCriacao: string;
  numeroDaConta: string;
}

export default defineEventHandler(async (event) => {
  // 1. Obter o cotistaId da query
  // Como estava (V2.0): Usando event.context.auth
  // Como será (V1.3/Revertida): Usando getQuery (para replicar o comportamento funcional anterior)
  const query = getQuery(event);
  const cotistaId = Number(query.cotistaId);

  if (isNaN(cotistaId) || cotistaId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID do cotista inválido.' 
    });
  }

  try {
    // 2. Buscar dados básicos do cotista (incluindo os novos campos) (Inalterado)
    const cotista = await prisma.cotista.findUnique({
      where: { id: cotistaId },
      select: {
        capitalInicial: true,
        fundoId: true,
        dataCriacao: true, 
        numeroDaConta: true,
      },
    });

    if (!cotista) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cotista não encontrado.',
      });
    }

    // Converte capitalInicial para número imediatamente após a verificação (Inalterado)
    const capitalInicial = cotista.capitalInicial.toNumber();

    // 3. Agregação para calcular a Variação Total (Inalterado)
    const variacaoAggregations = await prisma.movimentacaoCotista.aggregate({
      _sum: {
        valor: true,
      },
      where: {
        cotistaId: cotistaId,
        OR: [
          { tipo: { not: 'APORTE' } }, 
          { 
            AND: [
              { tipo: 'APORTE' }, 
              { valor: { not: cotista.capitalInicial } } 
            ]
          }
        ]
      },
    });
    
    // 4. Agregação para calcular Ganhos (Inalterado)
    const ganhosAggregations = await prisma.movimentacaoCotista.aggregate({
      _sum: {
        valor: true,
      },
      where: {
        cotistaId: cotistaId,
        tipo: 'RENDIMENTO',
      },
    });

    // 5. Calcular o Saldo Total (Inalterado)
    const totalVariacao = variacaoAggregations._sum.valor?.toNumber() || 0;
    const saldoTotal = capitalInicial + totalVariacao;
    const totalGanhos = ganhosAggregations._sum.valor?.toNumber() || 0;


    // 6. Buscar Histórico de Rentabilidade (Inalterado)
    let historicoRentabilidade = [];
    if (cotista.fundoId) {
      historicoRentabilidade = await prisma.rentabilidadeMensal.findMany({
        where: { fundoId: cotista.fundoId },
        select: { mesAno: true, valorFundo: true, valorPoupanca: true, rendimentoMes: true },
        orderBy: { mesAno: 'asc' },
      });
    }
    
    // Mapear valores Decimais do Prisma para Number (Inalterado)
    const mappedHistorico = historicoRentabilidade.map(h => ({
      mesAno: h.mesAno,
      valorFundo: h.valorFundo.toNumber(),
      valorPoupanca: h.valorPoupanca.toNumber(),
      rendimentoMes: h.rendimentoMes.toNumber(),
    }));

    // 7. Retorno dos Dados (Inalterado)
    const response: CotistaSummary = {
      saldoTotal,
      totalGanhos,
      capitalInicial,
      fundoId: cotista.fundoId || 0,
      historicoRentabilidade: mappedHistorico,
      dataCriacao: cotista.dataCriacao.toISOString(), 
      numeroDaConta: cotista.numeroDaConta,
    };

    return response;

  } catch (error) {
    console.error('Erro ao buscar resumo do cotista:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao processar os dados do cotista.',
    });
  } finally {
    await prisma.$disconnect();
  }
});
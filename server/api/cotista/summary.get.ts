// /server/api/cotista/summary.get.ts - V1.2 - ADICIONA dataCriacao e numeroDaConta para o cálculo do cartão no frontend.
// Anteriormente: V1.1 - CORREÇÃO CRÍTICA: Exclui o 'APORTE' inicial da MovimentacaoCotista para evitar duplicação no Saldo Total.

import { defineEventHandler, getQuery, createError } from 'h3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define a estrutura de resposta que o frontend espera
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
    const query = getQuery(event);
    const cotistaId = Number(query.cotistaId);

    if (isNaN(cotistaId) || cotistaId <= 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID do cotista inválido.',
        });
    }

    try {
        // 2. Buscar dados básicos do cotista (incluindo os novos campos)
        const cotista = await prisma.cotista.findUnique({
            where: { id: cotistaId },
            select: {
                capitalInicial: true,
                fundoId: true,
                // ✅ CAMPOS ADICIONADOS PARA O CÁLCULO DO CARTÃO
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

        // Converte capitalInicial para número imediatamente após a verificação
        const capitalInicial = cotista.capitalInicial.toNumber();

        // 3. Agregação para calcular a Variação Total (Movimentações EXCLUINDO o aporte inicial)
        // 🚨 CORREÇÃO CRÍTICA PARA DUPLICAÇÃO DE SALDO:
        // O filtro exclui a linha de movimentação se for um 'APORTE' E o valor for EXATAMENTE igual ao 'capitalInicial', 
        // garantindo que a soma só inclua APORTES subsequentes, RESGATES e RENDIMENTOS.
        const variacaoAggregations = await prisma.movimentacaoCotista.aggregate({
            _sum: {
                valor: true,
            },
            where: {
                cotistaId: cotistaId,
                OR: [
                    { tipo: { not: 'APORTE' } }, // Inclui RESGATE e RENDIMENTO
                    { 
                        AND: [
                            { tipo: 'APORTE' }, 
                            { valor: { not: cotista.capitalInicial } } // Inclui APORTES subsequentes (diferentes do valor inicial)
                        ]
                    }
                ]
            },
        });
        
        // 4. Agregação para calcular Ganhos (Apenas Rendimentos)
        const ganhosAggregations = await prisma.movimentacaoCotista.aggregate({
            _sum: {
                valor: true,
            },
            where: {
                cotistaId: cotistaId,
                tipo: 'RENDIMENTO',
            },
        });

        // 5. Calcular o Saldo Total
        const totalVariacao = variacaoAggregations._sum.valor?.toNumber() || 0;
        
        // ✅ CÁLCULO CORRIGIDO: Saldo Total = Capital Inicial (Valor base) + Variação (Movimentos posteriores)
        const saldoTotal = capitalInicial + totalVariacao;
        const totalGanhos = ganhosAggregations._sum.valor?.toNumber() || 0;


        // 6. Buscar Histórico de Rentabilidade (para o gráfico)
        let historicoRentabilidade = [];
        if (cotista.fundoId) {
            historicoRentabilidade = await prisma.rentabilidadeMensal.findMany({
                where: {
                    fundoId: cotista.fundoId,
                },
                select: {
                    mesAno: true,
                    valorFundo: true,
                    valorPoupanca: true,
                    rendimentoMes: true,
                },
                orderBy: {
                    mesAno: 'asc',
                },
            });
        }
        
        // Mapear valores Decimais do Prisma para Number
        const mappedHistorico = historicoRentabilidade.map(h => ({
            mesAno: h.mesAno,
            valorFundo: h.valorFundo.toNumber(),
            valorPoupanca: h.valorPoupanca.toNumber(),
            rendimentoMes: h.rendimentoMes.toNumber(),
        }));

        // 7. Retorno dos Dados
        const response: CotistaSummary = {
            saldoTotal,
            totalGanhos,
            capitalInicial,
            fundoId: cotista.fundoId || 0,
            historicoRentabilidade: mappedHistorico,
            // ✅ CAMPOS RETORNADOS
            dataCriacao: cotista.dataCriacao.toISOString(), // Converte Date para string ISO para fácil consumo no frontend
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
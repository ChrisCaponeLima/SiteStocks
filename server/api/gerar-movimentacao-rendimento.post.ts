// /server/api/gerar-movimentacao-rendimento.post.ts - V2.6 - CORREÇÃO CRÍTICA DO SALDO BASE: Substitui a busca de RentabilidadeMensal pela busca do último saldo (MovimentacaoCotista mais recente) para o CotistaId, garantindo que o cálculo de rendimento arbitrado parta da base correta.

import { defineEventHandler, createError, H3Event, readBody } from 'h3'
import { prisma } from '~/server/utils/db' 
import { verifyToken } from '~/server/utils/auth'

// Tipo de dados esperado no token - INCLUI roleLevel (inalterado)
interface AuthPayload {
    userId: number
    role: string
    roleLevel: number
}

// Tipo de dados esperado no body da requisição (inalterado)
interface MovimentacaoPayload {
    cotistaId: number;
    taxa: number;         
    dataInicio: string;   
    dataFim: string;      
}

// 🛑 Nível mínimo exigido para esta rota (Admin/Owner) (inalterado)
const MIN_LEVEL_REQUIRED = 2;

// Constantes da Regra de Negócio (inalterado)
const DIA_LANCAMENTO = 23      // Dia 23 de cada mês

export default defineEventHandler(async (event: H3Event) => {
    // 1. AUTENTICAÇÃO E AUTORIZAÇÃO (inalterado)
    const token = event.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado. Token não fornecido.' })
    }
    let payload: AuthPayload
    try {
        payload = verifyToken(token) as AuthPayload
    } catch (e) {
        throw createError({ statusCode: 401, statusMessage: 'Token inválido ou expirado.' })
    }

    // Autorização (inalterado)
    const userLevel = payload.roleLevel;
    if (userLevel < MIN_LEVEL_REQUIRED) { 
        console.warn(`Acesso negado. Usuário Nível ${userLevel} tentou acessar rota que requer Nível ${MIN_LEVEL_REQUIRED}.`)
        throw createError({ 
            statusCode: 403, 
            statusMessage: `Acesso Proibido. Nível de permissão ${MIN_LEVEL_REQUIRED} requerido. Seu nível é ${userLevel}.` 
        })
    }

    // 2. OBTENÇÃO E VALIDAÇÃO DO PAYLOAD (inalterado)
    const body = await readBody<MovimentacaoPayload>(event)
    
    if (!body || !body.cotistaId || typeof body.taxa !== 'number' || !body.dataInicio || !body.dataFim) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Parâmetros (cotistaId, taxa, dataInicio, dataFim) são obrigatórios e devem ser válidos.' 
        })
    }
    
    const { cotistaId, taxa } = body;
    
    // Converte as strings de data para objetos Date no dia 23 (para consistência do loop) (inalterado)
    const dateFactory = (dateString: string) => {
        const d = new Date(dateString);
        d.setHours(0, 0, 0, 0); 
        d.setDate(DIA_LANCAMENTO);
        return d;
    };

    const startDate = dateFactory(body.dataInicio);
    const endDate = dateFactory(body.dataFim);

    // 3. LÓGICA DE GERAÇÃO
    try {
        console.log(`Iniciando geração para Cotista ID: ${cotistaId} com Taxa: ${taxa * 100}% e Período: ${body.dataInicio} a ${body.dataFim}`)
        
        const generatedMovements: any[] = []

        // --- 3.1. BUSCA O SALDO INICIAL DO COTISTA (NOVO)

        // A data limite para o saldo é a data de início do cálculo (excluindo a própria data de início).
        const dataLimiteBusca = new Date(startDate.getTime());
        // Ajustamos para o dia anterior, no final do dia, para capturar o último saldo antes de 'startDate'.
        dataLimiteBusca.setDate(dataLimiteBusca.getDate() - 1);
        dataLimiteBusca.setHours(23, 59, 59, 999);


        // 🛑 NOVO: Busca o último registro de movimentação do cotista ANTES da data de início.
        const ultimoSaldo = await prisma.movimentacaoCotista.findFirst({
            where: {
                cotistaId: cotistaId,
                dataMovimentacao: {
                    // Busca movimentos anteriores à data limite (que é o dia anterior ao início)
                    lt: dataLimiteBusca 
                }
            },
            // Ordena do mais recente para o mais antigo e pega o primeiro (o saldo mais recente)
            orderBy: { dataMovimentacao: 'desc' }, 
            select: { valor: true, tipo: true, dataMovimentacao: true },
        });
        
        // Se houver saldo anterior (Movimentação), a base de cálculo é esse valor.
        // Se não houver, assumimos que o saldo inicial é 0 (ou outro valor padrão, se necessário).
        // Se houver um valor inicial de 10.000,00 ele deve ser o primeiro registro de movimentação.
        const valorInicialBase = ultimoSaldo ? ultimoSaldo.valor.toNumber() : 0; 


        if (valorInicialBase <= 0) {
            // Se o saldo for zero e não for encontrado um saldo inicial, podemos interromper ou avisar.
            console.warn(`Nenhum saldo anterior encontrado para o Cotista ID ${cotistaId}. Assumindo base zero (R$ 0,00).`)
            // Você pode lançar um erro 404 aqui se for obrigatório um saldo inicial:
            /*
            throw createError({ 
                statusCode: 404, 
                statusMessage: `Nenhuma movimentação de saldo anterior encontrada para o Cotista ID ${cotistaId} antes de ${startDate.toISOString().split('T')[0]}.`
            })
            */
        } else {
            console.log(`Base de Cálculo Inicial do Cotista (data base: ${ultimoSaldo?.dataMovimentacao.toLocaleDateString('pt-BR')}): ${valorInicialBase.toFixed(2)}`)
        }

        // Variável de controle (Base para o cálculo do próximo mês - deve ser um número)
        let valorBaseAcumulado = valorInicialBase
        
        // --- 3.2. Define o Início do Loop (inalterado)
        let currentDateIterator = new Date(startDate.getTime())
        
        // --- 3.3. Loop pelos meses (inalterado)
        while (currentDateIterator.getTime() <= endDate.getTime()) {
            
            // Cria a data exata do lançamento no dia 23, com hora zerada para comparação no DB
            const dataLancamento = new Date(currentDateIterator.getFullYear(), currentDateIterator.getMonth(), DIA_LANCAMENTO, 0, 0, 0); 
            
            // Verifica se o lançamento já existe para evitar duplicidade
            const existingMovement = await prisma.movimentacaoCotista.findFirst({
                where: {
                    cotistaId: cotistaId,
                    dataMovimentacao: dataLancamento, 
                    tipo: 'RENDIMENTO'
                }
            })

            if (existingMovement) {
                console.log(`Lançamento de rendimento já existe para ${dataLancamento.toLocaleDateString('pt-BR')}. Pulando.`)
                // Se já existe, atualiza a base acumulada para continuar o cálculo, se for o último registro
                valorBaseAcumulado += existingMovement.valor.toNumber();
            } else {
                
                const valorRendimento = valorBaseAcumulado * taxa
                
                if (valorRendimento < 0.01) { 
                    console.warn(`Rendimento de ${valorRendimento.toFixed(4)} é muito baixo para ser registrado. Parando a geração.`)
                    break
                }
                
                // Cria o lançamento de movimentação
                const movimentacao = await prisma.movimentacaoCotista.create({
                    data: {
                        cotistaId: cotistaId,
                        dataMovimentacao: dataLancamento, 
                        tipo: 'RENDIMENTO',
                        valor: valorRendimento
                    }
                })

                generatedMovements.push(movimentacao)
                valorBaseAcumulado += valorRendimento
            }
            
            currentDateIterator.setMonth(currentDateIterator.getMonth() + 1);
            currentDateIterator.setDate(DIA_LANCAMENTO);
            
        } // O loop é interrompido quando currentDateIterator > endDate

        // ... (Restante do retorno inalterado)

        return {
            success: true,
            cotistaId: cotistaId,
            count: generatedMovements.length,
            taxaAplicada: taxa,
            message: `Geração de ${generatedMovements.length} novos lançamentos concluída. Base de cálculo final: ${valorBaseAcumulado.toFixed(2)}.`,
            movimentacoes: generatedMovements.map(m => ({ id: m.id, data: m.dataMovimentacao, valor: m.valor.toFixed(2) }))
        }

    } catch (error: any) {
        console.error(`Erro ao gerar movimentações de rendimento para Cotista ID ${cotistaId}:`, error)
        throw createError({
            statusCode: 500,
            statusMessage: `Erro interno ao gerar os lançamentos: ${error.message || 'Detalhe não disponível'}`
        })
    } 
})
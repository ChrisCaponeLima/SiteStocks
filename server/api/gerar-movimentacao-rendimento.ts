// /server/api/gerar-movimentacao-rendimento.post.ts - V2.0 - Geração de lançamentos com taxa, início e fim customizáveis. Ajustado para usar o singleton do Prisma.
import { defineEventHandler, createError, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' 
import { verifyToken } from '~/server/utils/auth'

// Tipo de dados esperado no token
interface AuthPayload {
    userId: number
    role: string
}

// NOVO: Tipo de dados esperado no body da requisição
interface MovimentacaoPayload {
    cotistaId: number;
    taxa: number;         // Nova taxa de rendimento (ex: 0.04)
    dataInicio: string;   // Nova data de início (ex: '2024-11-23')
    dataFim: string;      // Nova data de fim (ex: '2025-06-23')
}

// Constantes da Regra de Negócio
const DIA_LANCAMENTO = 23      // Dia 23 de cada mês

export default defineEventHandler(async (event: H3Event) => {
    // 1. AUTENTICAÇÃO E AUTORIZAÇÃO
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

    if (payload.role !== 'admin' && payload.role !== 'owner') { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Proibido. Função administrativa requerida.' })
    }

    // 2. OBTENÇÃO E VALIDAÇÃO DO PAYLOAD
    const body = await readBody<MovimentacaoPayload>(event)
    
    // Verificação de Parâmetros
    if (!body || !body.cotistaId || typeof body.taxa !== 'number' || !body.dataInicio || !body.dataFim) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Parâmetros (cotistaId, taxa, dataInicio, dataFim) são obrigatórios e devem ser válidos.' 
        })
    }
    
    const { cotistaId, taxa } = body;
    
    // Converte as strings de data para objetos Date
    // NOTA: Ajustamos o dia das datas de início e fim para garantir que o loop comece e termine corretamente no dia 23.
    const startDate = new Date(body.dataInicio)
    const endDate = new Date(body.dataFim)
    
    // Forçar o dia do mês para o dia de lançamento (23) para consistência
    startDate.setDate(DIA_LANCAMENTO);
    endDate.setDate(DIA_LANCAMENTO);


    // 3. LÓGICA DE GERAÇÃO
    try {
        console.log(`Iniciando geração para Cotista ID: ${cotistaId} com Taxa: ${taxa * 100}% e Período: ${body.dataInicio} a ${body.dataFim}`)
        
        const generatedMovements: any[] = []
        
        // --- 3.1. Busca do Valor Inicial
        // A data de início do rendimento é o primeiro dia do MÊS da dataInicio
        const mesAnteriorBusca = new Date(startDate);
        // Recua 1 mês para buscar a base de cálculo anterior
        mesAnteriorBusca.setMonth(mesAnteriorBusca.getMonth() - 1);
        // Ajusta para o primeiro dia do mês anterior (para bater com RentabilidadeMensal.mesAno)
        mesAnteriorBusca.setDate(1);

        const rentabilidadeInicial = await prisma.rentabilidadeMensal.findFirst({
            where: {
                fundo: { cotistas: { some: { id: cotistaId } } },
                mesAno: mesAnteriorBusca
            },
            select: { valorFundo: true }
        })

        if (!rentabilidadeInicial) {
            throw createError({ 
                statusCode: 404, 
                statusMessage: `Rentabilidade do mês anterior (${mesAnteriorBusca.toISOString().split('T')[0]}) não encontrada. Verifique se existe um registro de RentabilidadeMensal antes da data de início.`
            })
        }
        
        // Variável de controle (Base para o cálculo do próximo mês - deve ser um número)
        let valorBaseAcumulado = rentabilidadeInicial.valorFundo.toNumber()
        
        // --- 3.2. Define o Início do Loop
        let currentDate = new Date(startDate.getTime()) 
        
        // --- 3.3. Loop pelos meses
        while (currentDate <= endDate) {
            
            // Verifica se o lançamento já existe para evitar duplicidade
            const existingMovement = await prisma.movimentacaoCotista.findFirst({
                where: {
                    cotistaId: cotistaId,
                    dataMovimentacao: new Date(currentDate.getFullYear(), currentDate.getMonth(), DIA_LANCAMENTO),
                    tipo: 'RENDIMENTO'
                }
            })

            if (existingMovement) {
                console.log(`Lançamento de rendimento já existe para ${currentDate.toLocaleDateString('pt-BR')}. Pulando.`)
            } else {
                
                const valorRendimento = valorBaseAcumulado * taxa
                
                if (valorRendimento <= 0.01) { 
                    console.warn(`Rendimento de ${valorRendimento.toFixed(4)} é muito baixo para ser registrado. Parando a geração.`)
                    break
                }
                
                // Cria o lançamento de movimentação
                const movimentacao = await prisma.movimentacaoCotista.create({
                    data: {
                        cotistaId: cotistaId,
                        dataMovimentacao: new Date(currentDate.getFullYear(), currentDate.getMonth(), DIA_LANCAMENTO),
                        tipo: 'RENDIMENTO',
                        valor: valorRendimento
                    }
                })

                generatedMovements.push(movimentacao)
                valorBaseAcumulado += valorRendimento
            }
            
            // Avança para o próximo mês (Mantém o dia 23)
            currentDate.setMonth(currentDate.getMonth() + 1)
            currentDate.setDate(DIA_LANCAMENTO)

            if (currentDate.getTime() > endDate.getTime()) break
        }

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
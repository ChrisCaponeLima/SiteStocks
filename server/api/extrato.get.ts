// /server/api/extrato.get.ts - V1.0 - Busca o extrato de movimentações do cotista logado
import { defineEventHandler, createError, getQuery, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' // Utilizando o singleton do Prisma
import { verifyToken } from '~/server/utils/auth' // Presumindo que verifyToken existe

// Tipagem para o payload de autenticação
interface AuthPayload {
    userId: number;
    cotistaId?: number; // Assumindo que o ID do cotista pode vir no token ou ser buscado
    role: string;
}

// Tipagem para os parâmetros de query
interface ExtratoQuery {
    startDate?: string;
    endDate?: string;
}

export default defineEventHandler(async (event: H3Event) => {
    // 1. AUTENTICAÇÃO E BUSCA DO COTISTA ID
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

    // Se o cotistaId não estiver no payload, precisamos buscá-lo pelo userId
    const cotista = await prisma.cotista.findUnique({
        where: { userId: payload.userId },
        select: { id: true, user: { select: { nome: true } } }
    });
    
    if (!cotista) {
        throw createError({ statusCode: 404, statusMessage: 'Cotista não encontrado para o usuário logado.' })
    }
    
    const cotistaId = cotista.id;

    // 2. OBTENÇÃO E VALIDAÇÃO DOS PARÂMETROS
    const query = getQuery<ExtratoQuery>(event)
    const whereClause: any = {
        cotistaId: cotistaId
    };

    if (query.startDate || query.endDate) {
        whereClause.dataMovimentacao = {};
        
        if (query.startDate) {
            // Garante que a data de início é o início do dia
            whereClause.dataMovimentacao.gte = new Date(query.startDate);
            // Verifica se a data é válida
            if (isNaN(whereClause.dataMovimentacao.gte.getTime())) {
                throw createError({ statusCode: 400, statusMessage: 'Formato de data de início inválido.' })
            }
        }
        
        if (query.endDate) {
            // Garante que a data final é o fim do dia (23:59:59.999) para incluir transações daquele dia
            const end = new Date(query.endDate);
            if (isNaN(end.getTime())) {
                throw createError({ statusCode: 400, statusMessage: 'Formato de data final inválido.' })
            }
            end.setDate(end.getDate() + 1); // Avança um dia
            end.setHours(0, 0, 0, 0);       // Zera o horário
            whereClause.dataMovimentacao.lt = end;
        }
    }

    // 3. BUSCA DOS DADOS (Extrato)
    try {
        const movimentacoes = await prisma.movimentacaoCotista.findMany({
            where: whereClause,
            select: {
                id: true,
                dataMovimentacao: true,
                tipo: true,
                valor: true,
            },
            orderBy: {
                dataMovimentacao: 'desc' // Movimentações mais recentes primeiro
            }
        });

        // Retorna o extrato junto com o saldo acumulado (calculado no cliente ou em outra API, mas aqui só o extrato)
        return {
            cotistaNome: cotista.user!.nome,
            extrato: movimentacoes.map(mov => ({
                id: mov.id,
                data: mov.dataMovimentacao.toISOString().split('T')[0], // Formato YYYY-MM-DD
                tipo: mov.tipo,
                valor: mov.valor.toNumber(),
            }))
        };

    } catch (error: any) {
        console.error('Erro ao buscar extrato do cotista:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Erro interno ao carregar o extrato: ${error.message || 'Detalhe não disponível'}`
        });
    }
});
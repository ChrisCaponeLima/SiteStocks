// /server/api/extrato.get.ts - V1.4 - CORREÇÃO CRÍTICA PRISMA: Ajusta a busca do nome do cotista para usar a relação 'user', corrigindo o erro 'Unknown field nome'.

import { defineEventHandler, createError, getQuery, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' 
import { verifyToken } from '~/server/utils/auth'

// Tipo de dados esperado no token (baseado no arquivo de exemplo fornecido)
interface AuthPayload {
    userId: number
    role: string
    roleLevel: number
}

// Tipagem para os parâmetros da query
interface ExtratoQuery {
    startDate?: string;
    endDate?: string;
}

// 🛑 Nível mínimo exigido para esta rota: Nível 0 (qualquer cotista logado)
const MIN_LEVEL_REQUIRED = 0; 

export default defineEventHandler(async (event: H3Event) => {
    // 1. AUTENTICAÇÃO E AUTORIZAÇÃO
    const token = event.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado. Token não fornecido.' })
    }
    
    let payload: AuthPayload
    try {
        // Verifica e decodifica o token.
        payload = verifyToken(token) as AuthPayload
    } catch (e) {
        // Se o token for inválido/expirado, o erro 401 é lançado aqui.
        throw createError({ statusCode: 401, statusMessage: 'Token inválido ou expirado.' })
    }

    // Autorização por Nível. Nível 0 permite acesso a qualquer perfil.
    const userLevel = payload.roleLevel;
    if (userLevel < MIN_LEVEL_REQUIRED) { 
        console.warn(`Acesso negado. Usuário Nível ${userLevel} tentou acessar rota que requer Nível ${MIN_LEVEL_REQUIRED}.`)
        throw createError({ 
            statusCode: 403, 
            statusMessage: `Acesso Proibido. Nível de permissão ${MIN_LEVEL_REQUIRED} requerido. Seu nível é ${userLevel}.` 
        })
    }
    
    // cotistaId que estamos buscando o extrato
    const cotistaId = payload.cotistaId || payload.userId; // Ajuste conforme o payload real
    // 2. OBTENÇÃO DOS PARÂMETROS DE FILTRO (Inalterado)
    const query = getQuery<ExtratoQuery>(event)
    const { startDate, endDate } = query;

    try {
        // 3. LÓGICA DE BUSCA DO EXTRATO
        
        // 3.1 Busca o nome do cotista
        // 🛑 CORREÇÃO PRISMA: O campo 'nome' está no modelo 'User' via relação 'user'.
        // Estava: select: { nome: true }
        const cotista = await prisma.cotista.findUnique({
            where: { id: cotistaId },
            select: { 
                user: {
                    select: {
                        nome: true
                    }
                }
            }
        });
        
        // 🛑 CORREÇÃO ACESSO: O nome agora está em cotista.user.nome
        // Estava: const cotistaNome = cotista?.nome || `ID ${cotistaId}`;
        const cotistaNome = cotista?.user?.nome || `ID ${cotistaId}`;
        
        // 3.2 Monta as condições de filtro de data (Inalterado)
        const dateFilter: { gte?: Date, lte?: Date } = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); 
            dateFilter.gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); 
            dateFilter.lte = end;
        }
        
        // 3.3 Busca as movimentações (filtra pelo cotistaId logado) (Inalterado)
        const extrato = await prisma.movimentacaoCotista.findMany({
            where: {
                cotistaId: cotistaId,
                // Aplica o filtro de data se houver data de início OU fim
                ...(startDate || endDate ? { dataMovimentacao: dateFilter } : {})
            },
            orderBy: {
                dataMovimentacao: 'asc' // Extrato em ordem cronológica
            },
            select: {
                id: true,
                dataMovimentacao: true,
                tipo: true,
                valor: true,
            }
        })
        
        // 3.4 Mapeia o resultado para o formato esperado pelo frontend (Inalterado)
        const mappedExtrato = extrato.map(item => ({
            id: item.id,
            data: item.dataMovimentacao.toISOString(), 
            tipo: item.tipo as 'APORTE' | 'RESGATE' | 'RENDIMENTO',
            valor: item.valor.toNumber(),
        }));


        return {
            cotistaNome: cotistaNome,
            extrato: mappedExtrato
        }

    } catch (error: any) {
        console.error(`Erro ao buscar extrato para Cotista ID ${cotistaId}:`, error)
        throw createError({
            statusCode: 500,
            statusMessage: `Erro interno ao buscar o extrato: ${error.message || 'Detalhe não disponível'}`
        })
    } 
})
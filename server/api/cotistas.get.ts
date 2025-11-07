// /server/api/cotistas.get.ts - V1.0 - Listagem simplificada de Cotistas para uso em APIs administrativas.
import { defineEventHandler, createError, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' // Utilizando o singleton do Prisma
import { verifyToken } from '~/server/utils/auth' // Presumindo que verifyToken existe

// Tipo de dados esperado no token
interface AuthPayload {
    userId: number
    role: string
}

// Tipo de dados de retorno da API
interface CotistaListItem {
    id: number;
    nomeCompleto: string;
    numeroDaConta: string;
}


export default defineEventHandler(async (event: H3Event): Promise<CotistaListItem[]> => {
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

    // Apenas Admin ou Owner podem listar todos os cotistas
    if (payload.role !== 'admin' && payload.role !== 'owner') { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Proibido. Função administrativa requerida.' })
    }

    // 2. BUSCA NO BANCO DE DADOS
    try {
        const cotistasData = await prisma.cotista.findMany({
            // Buscamos os dados necessários para exibir na lista suspensa
            select: {
                id: true,
                numeroDaConta: true,
                user: {
                    select: {
                        nome: true,
                        sobrenome: true
                    }
                }
            },
            orderBy: {
                id: 'asc'
            }
        })

        // 3. FORMATAÇÃO DOS DADOS
        const formattedCotistas: CotistaListItem[] = cotistasData
            .filter(c => c.user !== null) // Filtra cotistas sem usuário associado (caso existam)
            .map(cotista => {
                const nomeCompleto = `${cotista.user!.nome} ${cotista.user!.sobrenome}`
                
                return {
                    id: cotista.id,
                    nomeCompleto: nomeCompleto,
                    numeroDaConta: cotista.numeroDaConta,
                }
            })

        return formattedCotistas

    } catch (error: any) {
        console.error('Erro ao buscar lista de cotistas (API):', error)
        // 4. TRATAMENTO DE ERROS
        throw createError({
            statusCode: 500,
            statusMessage: 'Erro interno ao carregar a lista de cotistas. Verifique o log do servidor.'
        })
    }
})
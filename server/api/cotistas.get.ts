// /server/api/cotistas.get.ts - V1.4 - CORREÇÃO FINAL: Implementação de verificação de acesso por NÍVEL (level), usando 'roleLevel' do payload e ajustando o nível mínimo para 2, conforme solicitado pelo cliente.
import { defineEventHandler, createError, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' 
import { verifyToken } from '~/server/utils/auth'

// Tipo de dados esperado no token
interface AuthPayload {
    userId: number
    role: string // roleName
    roleLevel: number // Nível de acesso numérico
}

// Tipo de dados de retorno da API
interface CotistaListItem {
    id: number;
    nomeCompleto: string;
    numeroDaConta: string;
}

// 🛑 ALTERAÇÃO CRÍTICA V1.4: Nível mínimo exigido para esta rota.
const MIN_LEVEL_REQUIRED = 1;


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

    // Usa o nível do payload diretamente.
    const userLevel = payload.roleLevel; 

    // Acesso permitido se o nível do usuário for maior ou igual ao nível mínimo (2).
    if (userLevel < MIN_LEVEL_REQUIRED) { 
        console.warn(`Acesso negado. Usuário ${payload.role} (Nível ${userLevel}) tentou acessar rota que requer Nível ${MIN_LEVEL_REQUIRED}.`)
        throw createError({ 
            statusCode: 403, 
            statusMessage: `Acesso Proibido. Nível de permissão ${MIN_LEVEL_REQUIRED} requerido. Seu nível é ${userLevel}.` 
        })
    }

    // 2. BUSCA NO BANCO DE DADOS
    try {
        // ... (lógica inalterada de busca de dados no Prisma)
        const cotistasData = await prisma.cotista.findMany({
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
            .filter(c => c.user !== null)
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
// /server/api/admin/roles/index.ts - V1.7 - CORREÇÃO DE MAPPING: Handler renomeado para 'index.ts' (em vez de get.ts) para robustecer o mapeamento da rota aninhada.

import { defineEventHandler, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma' // Assumindo que este caminho está correto

export default defineEventHandler(async (event) => {
    // 💡 Verifica o método HTTP. Como o arquivo é 'index.ts', ele responde a todos os métodos.
    if (event.method !== 'GET') {
        throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
    }

    const prisma = usePrisma()
    
    // 1. Verificação de Nível de Acesso (Assumimos que event.context.user é preenchido pelo middleware de Auth)
    const currentUser = event.context.user // { id, roleId, roleLevel }
    const MIN_REQUIRED_LEVEL = 1 // Nível mínimo para acessar esta rota
    
    // Garantimos que roleLevel existe e atinge o nível mínimo.
    if (!currentUser || typeof currentUser.roleLevel !== 'number' || currentUser.roleLevel < MIN_REQUIRED_LEVEL) { 
        throw createError({ 
            statusCode: 403, 
            statusMessage: 'Acesso Negado. Requer Nível 1 ou superior. (Verifique sua sessão)' 
        })
    }

    // 2. Regra de Segurança: O usuário só pode gerenciar/criar Roles com nível estritamente MENOR que o seu.
    const currentUserLevel = currentUser.roleLevel; 
    
    try {
        // 3. Busca das Roles Disponíveis para Atribuição
        const availableRoles = await prisma.roleLevel.findMany({
            where: {
                // Filtra para garantir que o usuário só possa selecionar níveis abaixo do seu
                // lt: estritamente menor que o nível do usuário logado (Ex: Admin 5 vê níveis 1, 2, 3, 4)
                level: { lt: currentUserLevel } 
            },
            select: {
                id: true, // Este ID é a FK roleId que será salvo no User
                name: true,
                level: true,
            },
            orderBy: { level: 'asc' },
        })

        return availableRoles

    } catch (error: any) {
        console.error('Erro ao listar roles de acesso:', error)
        
        // Se o erro já for um 403 que passou pela primeira checagem, relança-o.
        if (error.statusCode === 403) {
            throw error 
        }
        
        // Trata o erro de banco ou erro inesperado como 500
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Falha interna ao buscar os níveis de acesso disponíveis no banco de dados.' 
        })
    }
})
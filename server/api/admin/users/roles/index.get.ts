// /server/api/admin/roles/index.get.ts - V1.2 - CORREÇÃO CRÍTICA: Ajusta o nome da tabela do Prisma para 'roleLevel' conforme o schema fornecido.

import { defineEventHandler, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    
    // 1. Verificação de Nível de Acesso
    const currentUser = event.context.user // { id, roleId, roleLevel }
    const MIN_REQUIRED_LEVEL = 1 
    
    // Garantimos que roleLevel existe e atinge o nível mínimo.
    if (!currentUser || typeof currentUser.roleLevel !== 'number' || currentUser.roleLevel < MIN_REQUIRED_LEVEL) { 
        throw createError({ 
            statusCode: 403, 
            statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' 
        })
    }

    // 2. Regra de Segurança: O usuário só pode gerenciar/criar Roles com nível estritamente MENOR que o seu.
    const currentUserLevel = currentUser.roleLevel; 
    
    // Define o nível máximo que o usuário logado pode gerenciar/criar.
    // Nível 99 (Super Admin) pode ver todos (lt: 99 + 1), mas o filtro lt: currentUserLevel já funciona.
    const maxLevel = currentUserLevel

    try {
        // 3. Busca das Roles Disponíveis para Atribuição
        // 🛑 CORREÇÃO: Usa a tabela RoleLevel conforme o schema.
        const availableRoles = await prisma.roleLevel.findMany({
            where: {
                // Filtra para garantir que o usuário só possa selecionar níveis abaixo do seu
                level: { lt: maxLevel } // lt: estritamente menor que o nível do usuário logado
            },
            select: {
                id: true, // Este ID é a FK roleId que será salvo no User
                name: true,
                level: true,
            },
            orderBy: { level: 'asc' },
        })

        return availableRoles

    } catch (error) {
        console.error('Erro ao listar roles de acesso:', error)
        
        // Passa erros específicos (como 403) ou erro genérico 500
        if (error.statusCode === 403) {
            throw error 
        }
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar os níveis de acesso disponíveis.' })
    }
})
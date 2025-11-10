// /server/api/admin/roles/index.get.ts - V1.0 - Lista Roles de Acesso (níveis inferiores ao do usuário logado)

import { defineEventHandler, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    
    // 1. Verificação de Nível de Acesso (MIN_REQUIRED_LEVEL = 1)
    // Usamos roleId para a verificação, conforme o store: roleLevel: data.roleLevel
    const currentUser = event.context.user // Dados injetados pelo server middleware
    
    // 🛑 CRÍTICO: Se o middleware de autenticação do lado do servidor injeta o objeto User,
    // garantimos que ele tem a propriedade roleId (que mapeia para o nível)
    if (!currentUser || currentUser.roleId < 1) { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' })
    }

    // 2. Regra de Segurança: O usuário só pode criar (e, portanto, ver) Roles com nível MENOR que o seu.
    // Buscamos o RoleLevel do usuário logado para obter o valor inteiro (level).
    let maxLevel = currentUser.roleId; // Valor padrão: usa o roleId (que deve ser o nível, conforme o store)

    try {
        const currentUserRole = await prisma.roleLevel.findUnique({
            where: { id: currentUser.roleId },
            select: { level: true }
        })

        if (!currentUserRole) {
            throw createError({ statusCode: 500, statusMessage: 'Erro interno: Role do usuário logado não encontrada.' })
        }
        
        // Define o nível máximo que o usuário logado pode gerenciar/criar.
        // Nível 99 (Super Admin) pode criar todos.
        maxLevel = currentUserRole.level < 99 ? currentUserRole.level : 99 

        // 3. Busca das Roles Disponíveis para Criação
        const availableRoles = await prisma.roleLevel.findMany({
            where: {
                // Filtra para garantir que o usuário só possa selecionar níveis abaixo do seu
                level: { lt: maxLevel }
            },
            select: {
                id: true, // É o roleId que será salvo no User
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
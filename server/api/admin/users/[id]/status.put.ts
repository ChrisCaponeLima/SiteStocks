// /server/api/admin/users/[id]/status.put.ts - Altera Status (Ativar/Inativar)

import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const targetId = Number(getRouterParam(event, 'id'))
    const { status } = await readBody(event) // Espera 'ATIVO' ou 'INATIVO'

    // 1. Verificação de Nível de Acesso (MIN_REQUIRED_LEVEL = 1)
    const currentUser = event.context.user 
    if (!currentUser || currentUser.level < 1) {
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1.' })
    }

    if (isNaN(targetId) || !['ATIVO', 'INATIVO'].includes(status)) {
        throw createError({ statusCode: 400, statusMessage: 'Dados inválidos.' })
    }
    
    // 2. Regras Críticas de Segurança
    if (targetId === currentUser.id) {
        throw createError({ statusCode: 403, statusMessage: 'Você não pode alterar o status da sua própria conta.' })
    }

    try {
        // Busca o usuário alvo para verificar o nível ANTES de alterar
        const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { level: true } })

        if (!targetUser) {
            throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado.' })
        }

        // Regra de Segurança: Não pode alterar status de usuário de nível igual ou superior
        if (targetUser.level >= currentUser.level) {
            throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para inativar/ativar usuários deste nível.' })
        }
        
        // 3. Executa a Inativação/Ativação
        const updatedUser = await prisma.user.update({
            where: { id: targetId },
            data: { status: status },
            select: { id: true, status: true, name: true }
        })

        return { 
            message: `Usuário ${updatedUser.name} alterado para status ${updatedUser.status}.`,
            user: updatedUser
        }

    } catch (error: any) {
        console.error('Erro ao inativar/ativar usuário:', error.message)
        // Passa o erro de 403/404 diretamente
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }
        throw createError({ statusCode: 500, statusMessage: 'Falha ao alterar o status do usuário.' })
    }
})
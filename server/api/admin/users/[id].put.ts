// /server/api/admin/users/[id].put.ts - V1.0 - Edição de Usuário (Nível 1+)

import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import bcrypt from 'bcryptjs' 

const SALT_ROUNDS = 10 

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const targetId = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)

    // 1. Verificação de Nível de Acesso do Usuário Logado (MIN_REQUIRED_LEVEL = 1)
    const currentUser = event.context.user 
    if (!currentUser || currentUser.roleId < 1) { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' })
    }

    if (isNaN(targetId)) {
        throw createError({ statusCode: 400, statusMessage: 'ID do Usuário alvo inválido.' })
    }

    // 2. Desestruturação e Preparação dos Dados
    const { 
        cpf, nome, sobrenome, telefone, email, password, roleId, ativo
    } = body

    // 🛑 CRÍTICO: Não permitir que o próprio usuário edite seus dados de segurança/nível por esta rota administrativa.
    if (targetId === currentUser.id) {
        throw createError({ statusCode: 403, statusMessage: 'Você não pode editar suas próprias permissões ou nível de acesso através desta rota.' })
    }

    // 3. Busca dos Níveis e Regras de Segurança
    try {
        // Busca o usuário alvo e sua role atual
        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
            select: { roleId: true }
        })

        if (!targetUser) {
            throw createError({ statusCode: 404, statusMessage: 'Usuário alvo não encontrado.' })
        }

        // Busca o nível do usuário logado
        const currentUserRole = await prisma.roleLevel.findUnique({
            where: { id: currentUser.roleId },
            select: { level: true }
        })

        if (!currentUserRole) {
            throw createError({ statusCode: 500, statusMessage: 'Erro interno: Role do usuário logado não encontrada.' })
        }
        
        // 🔑 Regra A: O usuário logado NÃO pode editar usuários de nível igual ou superior.
        const targetRoleLevel = await prisma.roleLevel.findUnique({
            where: { id: targetUser.roleId },
            select: { level: true }
        })
        if (targetRoleLevel && currentUserRole.level <= targetRoleLevel.level && currentUserRole.level !== 99) {
            throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para editar usuários deste nível ou superior.' })
        }

        // 🔑 Regra B: Se o usuário logado TENTAR alterar o roleId, ele deve ser para um nível inferior ao seu.
        if (roleId && roleId !== targetUser.roleId) {
            const newTargetRole = await prisma.roleLevel.findUnique({
                where: { id: roleId },
                select: { level: true }
            })

            if (!newTargetRole || (currentUserRole.level <= newTargetRole.level && currentUserRole.level !== 99)) {
                 throw createError({ statusCode: 403, statusMessage: 'Você não pode promover usuários para o seu nível ou superior.' })
            }
        }

        // 4. Preparação dos Dados para o Update
        const dataToUpdate: Record<string, any> = {
            cpf, 
            nome, 
            sobrenome, 
            telefone, 
            email, 
            roleId,
            ativo
        }

        // 5. Hashing da Nova Senha (se fornecida)
        if (password && password.length > 0) {
            dataToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS)
        } else {
            // Remove a senha do objeto de update se estiver vazia para não sobrescrever com null/vazio
            delete dataToUpdate.password
        }
        
        // Remove undefined/nulls do corpo da requisição que não devem ser gravados
        Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key])

        // 6. Execução do Update
        const updatedUser = await prisma.user.update({
            where: { id: targetId },
            data: dataToUpdate,
            select: {
                id: true, nome: true, email: true, roleId: true, ativo: true,
                role: { select: { name: true, level: true } }
            }
        })

        return { 
            message: `Usuário ${updatedUser.nome} (Nível ${updatedUser.role.level}) atualizado com sucesso.`,
            user: updatedUser
        }

    } catch (error: any) {
        console.error('Erro ao editar usuário:', error)
        
        // Trata erro de duplicidade de CPF ou E-mail (Unique Constraint)
        if (error.code === 'P2002') {
            const field = error.meta?.target.includes('cpf') ? 'CPF' : 'E-mail'
            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema para outro usuário.` })
        }
        
        // Passa o erro de 403/404 diretamente
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar o usuário no banco de dados.' })
    }
})
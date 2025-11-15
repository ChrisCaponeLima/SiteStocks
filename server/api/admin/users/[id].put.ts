// /server/api/admin/users/[id].put.ts - V1.1 - FIX: Tratamento mais robusto de dados opcionais (telefone e roleId) e melhor sanitização do payload.

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
    let { 
        cpf, nome, sobrenome, telefone, email, password, roleId, ativo
    } = body

    // 🛑 CRÍTICO: Não permitir que o próprio usuário edite seus dados de segurança/nível por esta rota administrativa.
    if (targetId === currentUser.id) {
        // Permite editar dados pessoais, mas bloqueia segurança e nível
        if (typeof roleId !== 'undefined' && roleId !== currentUser.roleId) {
            throw createError({ statusCode: 403, statusMessage: 'Você não pode alterar seu próprio roleId.' })
        }
        if (typeof ativo !== 'undefined' && ativo === false) {
             throw createError({ statusCode: 403, statusMessage: 'Você não pode inativar a sua própria conta.' })
        }
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

        // Nível 99 (Super Admin) pode editar todos, exceto ele mesmo.
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
            email, // Email é obrigatório, mas não deve ser alterado pelo frontend (disabled)
            roleId,
            ativo
        }

        // 💡 FIX: Sanitiza o telefone. Armazena NULL se for uma string vazia, senão armazena o valor.
        dataToUpdate.telefone = telefone && telefone.trim() !== '' ? telefone : null;

        // 5. Hashing da Nova Senha (se fornecida)
        if (password && password.length > 0) {
            dataToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS)
        } 
        // Não é necessário um 'else' aqui, pois se password for undefined (removido no frontend) ou string vazia, ele não será adicionado/modificado no objeto.
        
        // Remove undefined/nulls (exceto telefone se for null intencional)
        Object.keys(dataToUpdate).forEach(key => {
            // Remove se for undefined (como password vazio) ou se for nulo, mas não telefone
            if (dataToUpdate[key] === undefined || (dataToUpdate[key] === null && key !== 'telefone')) {
                 delete dataToUpdate[key]
            }
        })
        
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
        
        // Trata erro de duplicidade de CPF ou E-mail (Unique Constraint - P2002)
        if (error.code === 'P2002') {
            const field = error.meta?.target.includes('cpf') ? 'CPF' : 'E-mail'
            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema para outro usuário.` })
        }
        
        // Passa o erro de 403/404 diretamente
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        // 🛑 Retorna o erro 500 com a mensagem de falha ao banco de dados
        throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar o usuário no banco de dados.' })
    }
})
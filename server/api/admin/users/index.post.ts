// /server/api/admin/users/index.post.ts - Criação de Novo Usuário (Nível 1+)

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import bcrypt from 'bcryptjs' // 🔑 Importa a biblioteca de hashing

// O Salto (salt) de 10 é um bom equilíbrio entre segurança e performance
const SALT_ROUNDS = 10 

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const body = await readBody(event)

    // 1. Desestruturação e Validação Inicial dos Dados
    const { 
        cpf, nome, sobrenome, telefone, email, password, roleId 
    } = body

    if (!cpf || !nome || !sobrenome || !email || !password || !roleId) {
        throw createError({ statusCode: 400, statusMessage: 'Dados obrigatórios (CPF, Nome, Sobrenome, E-mail, Senha, Role ID) ausentes.' })
    }

    // 2. Verificação de Nível de Acesso (MIN_REQUIRED_LEVEL = 1)
    const currentUser = event.context.user // Assume que contém o roleId do usuário logado
    if (!currentUser || currentUser.roleId < 1) { 
        // Se roleId 1 for Nível 1, a condição de acesso é correta.
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' })
    }

    // 3. Busca do Nível de Acesso para Validação de Permissão
    try {
        // Busca o nível da Role que o usuário logado está tentando criar
        const targetRole = await prisma.roleLevel.findUnique({
            where: { id: roleId },
            select: { level: true }
        })

        if (!targetRole) {
            throw createError({ statusCode: 404, statusMessage: `Role ID ${roleId} não encontrada.` })
        }

        // Regra de Segurança: Nível do usuário logado DEVE ser maior que o Nível do usuário que está sendo criado.
        // Exceção: Nível 99 (Super Admin) pode criar qualquer um.
        const currentUserRole = await prisma.roleLevel.findUnique({
            where: { id: currentUser.roleId },
            select: { level: true }
        })

        if (!currentUserRole || (currentUserRole.level <= targetRole.level && currentUserRole.level !== 99)) {
            throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para criar usuários deste nível ou superior.' })
        }

        // 4. Hashing da Senha
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        // 5. Criação do Usuário
        const newUser = await prisma.user.create({
            data: {
                cpf,
                nome,
                sobrenome,
                telefone,
                email,
                password: hashedPassword, // Senha hasheada
                roleId: roleId,
                ativo: true, // Garante que o usuário esteja ativo por padrão
                // cotistaId é opcional e deve ser null se não for um cotista
            },
            select: {
                id: true, nome: true, email: true, roleId: true, ativo: true
            }
        })

        return { 
            message: `Usuário ${newUser.nome} criado com sucesso.`,
            user: newUser
        }

    } catch (error: any) {
        console.error('Erro ao criar usuário:', error)

        // Trata erro de duplicidade de CPF ou E-mail (Unique Constraint)
        if (error.code === 'P2002') {
            const field = error.meta?.target.includes('cpf') ? 'CPF' : 'E-mail'
            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema.` })
        }
        
        // Trata erro de acesso negado
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        throw createError({ statusCode: 500, statusMessage: 'Falha ao criar o usuário no banco de dados.' })
    }
})
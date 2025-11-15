// /server/api/admin/users/index.post.ts - V1.3 - FIX CRÍTICO: Implementa $transaction para criar o Cotista e o User atomicamente, garantindo a ligação cotistaId.

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import bcrypt from 'bcryptjs' 
import { Decimal } from '@prisma/client/runtime/library'; // Importa Decimal para tipagem

const SALT_ROUNDS = 10 

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const body = await readBody(event)

    // 1. Desestruturação e Validação Inicial dos Dados
    // Assumimos que o formulário **não** envia capitalInicial ou aporteMensalPadrao, 
    // então usaremos valores padrão zero (exceto numeroDaConta).
    let { 
        cpf, nome, sobrenome, telefone, email, password, roleId, 
        // 💡 Adicionado campos específicos de Cotista que podem vir no body (e-mail, cpf, etc. já são os do User)
        numeroDaConta, capitalInicial, aporteMensalPadrao 
    } = body

    // 🔑 Validação para Criação de User/Cotista
    if (!cpf || !nome || !sobrenome || !email || !password || !roleId || !numeroDaConta) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Dados obrigatórios (CPF, Nome, Sobrenome, E-mail, Senha, Role ID, Número da Conta) ausentes.' 
        })
    }
    
    // Sanitiza o telefone e prepara valores padrão/seguros
    telefone = telefone && telefone.trim() !== '' ? telefone : null;

    // 2. Verificação de Nível de Acesso
    const currentUser = event.context.user 
    if (!currentUser || currentUser.roleId < 1) { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' })
    }

    // 3. Busca do Nível de Acesso para Validação de Permissão (Regras mantidas)
    try {
        const targetRole = await prisma.roleLevel.findUnique({
            where: { id: roleId },
            select: { level: true }
        })

        if (!targetRole) {
            throw createError({ statusCode: 404, statusMessage: `Role ID ${roleId} não encontrada.` })
        }

        const currentUserRole = await prisma.roleLevel.findUnique({
            where: { id: currentUser.roleId },
            select: { level: true }
        })

        if (!currentUserRole || (currentUserRole.level <= targetRole.level && currentUserRole.level !== 99)) {
            throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para criar usuários deste nível ou superior.' })
        }

        // 4. Hashing da Senha
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        // 5. CRIAÇÃO ATÔMICA (User e Cotista)
        const [newCotista, newUser] = await prisma.$transaction(async (tx) => {
            
            // 5a. Criação do Registro Cotista
            const createdCotista = await tx.cotista.create({
                data: {
                    // Preenche campos obrigatórios do Cotista
                    capitalInicial: new Decimal(capitalInicial || 0.00), // Converte para Decimal se não fornecido
                    aporteMensalPadrao: new Decimal(aporteMensalPadrao || 0.00),
                    numeroDaConta: numeroDaConta, 
                    // Os campos fundoId, dataCriacao, e outros são tratados como padrão/opcionais.
                }
            })

            // 5b. Criação do Registro User, usando o ID do Cotista criado
            const createdUser = await tx.user.create({
                data: {
                    cpf,
                    nome,
                    sobrenome,
                    telefone, 
                    email,
                    password: hashedPassword, 
                    roleId: roleId,
                    ativo: true, 
                    // 🔑 LIGAÇÃO CRÍTICA: Usa o ID do Cotista criado
                    cotistaId: createdCotista.id 
                },
                select: {
                    id: true, nome: true, email: true, roleId: true, ativo: true
                }
            })
            
            return [createdCotista, createdUser]
        })

        return { 
            message: `Usuário ${newUser.nome} (Cotista #${newCotista.id}) criado com sucesso.`,
            user: newUser
        }

    } catch (error: any) {
        console.error('Erro ao criar usuário:', error)
        
        // Trata erro de duplicidade de CPF ou E-mail (Unique Constraint - P2002) ou Número da Conta
        if (error.code === 'P2002') {
            let field: string = 'campo';
            if (error.meta?.target.includes('cpf')) field = 'CPF';
            else if (error.meta?.target.includes('email')) field = 'E-mail';
            else if (error.meta?.target.includes('numeroDaConta')) field = 'Número da Conta';

            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema.` })
        }
        
        // Passa o erro de acesso negado
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        // 🛑 Retorna o erro 500
        throw createError({ statusCode: 500, statusMessage: 'Falha ao criar o usuário e o cotista no banco de dados.' })
    }
})
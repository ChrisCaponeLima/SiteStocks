// /server/api/admin/users/index.post.ts - V1.6 - FIX: Isolamento da busca da RoleLevel do usuário logado e verificação rigorosa de currentUser.roleId para prevenir falha 500 na transação do Prisma.

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import bcrypt from 'bcryptjs' 
import { Decimal } from '@prisma/client/runtime/library'; 

const SALT_ROUNDS = 10 
const SEQUENCIAL_START = 1007 

/**
 * Busca o maior número de conta existente e retorna o próximo sequencial formatado.
 */
async function getNextNumeroDaConta(tx: any): Promise<string> {
    const latestCotista = await tx.cotista.findFirst({
        orderBy: {
            id: 'desc', 
        },
        select: {
            numeroDaConta: true,
        },
    });

    let nextNumber = SEQUENCIAL_START; 

    if (latestCotista && latestCotista.numeroDaConta) {
        const match = latestCotista.numeroDaConta.match(/STOCKS-(\d+)/);
        if (match && match[1]) {
            const currentNumber = parseInt(match[1]);
            nextNumber = Math.max(currentNumber + 1, SEQUENCIAL_START);
        }
    }

    return `STOCKS-${nextNumber}`;
}

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const body = await readBody(event)

    // 1. Desestruturação e Sanitização dos Dados de Entrada
    let { 
        cpf, nome, sobrenome, telefone, email, password, roleId, 
        capitalInicial, aporteMensalPadrao 
    } = body

    // 🔑 FIX: Tratamento robusto para valores numéricos/Decimal.
    const safeCapitalInicial = (typeof capitalInicial === 'number' && !isNaN(capitalInicial)) ? capitalInicial : 0;
    const safeAporteMensalPadrao = (typeof aporteMensalPadrao === 'number' && !isNaN(aporteMensalPadrao)) ? aporteMensalPadrao : 0;

    // Validação de campos obrigatórios do User
    if (!cpf || !nome || !sobrenome || !email || !password || !roleId) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Dados obrigatórios (CPF, Nome, Sobrenome, E-mail, Senha, Role ID) ausentes.' 
        })
    }
    
    // Sanitiza o telefone para NULL se for string vazia
    telefone = telefone && telefone.trim() !== '' ? telefone : null;

    // 2. Verificação de Nível de Acesso e Busca do Nível do Usuário Logado (FORA DO TRY/CATCH)
    const currentUser = event.context.user 
    
    // 🔑 VERIFICAÇÃO CRÍTICA: Garante que currentUser existe e tem um roleId válido.
    if (!currentUser || typeof currentUser.roleId !== 'number' || currentUser.roleId < 1) { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Credenciais de usuário logado inválidas ou ausentes.' })
    }
    
    let currentUserRole;
    let targetRole;

    try {
        // Busca o nível da Role que o usuário logado está tentando criar
        targetRole = await prisma.roleLevel.findUnique({
            where: { id: roleId },
            select: { level: true }
        })

        if (!targetRole) {
            throw createError({ statusCode: 404, statusMessage: `Role ID ${roleId} não encontrada.` })
        }
        
        // Busca o nível do usuário logado (usando o ID já validado)
        currentUserRole = await prisma.roleLevel.findUnique({
            where: { id: currentUser.roleId },
            select: { level: true }
        })

        // 3. Regras de Segurança: Nível do usuário logado DEVE ser maior que o Nível do usuário que está sendo criado.
        if (!currentUserRole || (currentUserRole.level <= targetRole.level && currentUserRole.level !== 99)) {
            throw createError({ statusCode: 403, statusMessage: 'Você não tem permissão para criar usuários deste nível ou superior.' })
        }

        // 4. Hashing da Senha
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        // 5. CRIAÇÃO ATÔMICA (User e Cotista)
        const [newCotista, newUser] = await prisma.$transaction(async (tx) => {
            
            // 5a. GERAÇÃO DO NÚMERO DA CONTA SEQUENCIAL
            const generatedNumeroDaConta = await getNextNumeroDaConta(tx);
            
            // 5b. Criação do Registro Cotista
            const createdCotista = await tx.cotista.create({
                data: {
                    capitalInicial: new Decimal(safeCapitalInicial), 
                    aporteMensalPadrao: new Decimal(safeAporteMensalPadrao),
                    numeroDaConta: generatedNumeroDaConta, 
                }
            })

            // 5c. Criação do Registro User, ligado ao Cotista
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
                    cotistaId: createdCotista.id // LIGAÇÃO CRÍTICA
                },
                select: {
                    id: true, nome: true, email: true, roleId: true, ativo: true
                }
            })
            
            return [createdCotista, createdUser]
        })

        return { 
            message: `Usuário ${newUser.nome} (Conta ${newCotista.numeroDaConta}) criado com sucesso.`,
            user: newUser
        }

    } catch (error: any) {
        console.error('Erro ao criar usuário:', error)
        
        // Trata erro de duplicidade (P2002)
        if (error.code === 'P2002') {
            let field: string = 'campo';
            if (error.meta?.target.includes('cpf')) field = 'CPF';
            else if (error.meta?.target.includes('email')) field = 'E-mail';
            else if (error.meta?.target.includes('numeroDaConta')) field = 'Número da Conta'; 

            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema.` })
        }
        
        // Relança erros de permissão ou não encontrado
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        // 🔑 Caso o erro 500 persista, ele vem daqui. Sugere outro campo obrigatório faltando.
        throw createError({ statusCode: 500, statusMessage: 'Falha ao criar o usuário e o cotista no banco de dados.' })
    }
})
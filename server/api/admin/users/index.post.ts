// /server/api/admin/users/index.post.ts - V1.4 - CRIAÇÃO: Transação atômica para criar Cotista (com número de conta sequencial) e User ligado.

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import bcrypt from 'bcryptjs' 
import { Decimal } from '@prisma/client/runtime/library'; // Importa Decimal para tipagem e uso no Prisma

const SALT_ROUNDS = 10 
const SEQUENCIAL_START = 1007 // Início da sequência de números de conta (STOCKS-1007)

/**
 * Busca o maior número de conta existente e retorna o próximo sequencial formatado.
 * Ex: Retorna 'STOCKS-1008' se o maior for 'STOCKS-1007'.
 * @param tx O objeto de transação do Prisma.
 * @returns O próximo número de conta no formato "STOCKS-XXXX".
 */
async function getNextNumeroDaConta(tx: any): Promise<string> {
    const latestCotista = await tx.cotista.findFirst({
        orderBy: {
            id: 'desc', // Ordena pelo ID para encontrar o mais recente
        },
        select: {
            numeroDaConta: true,
        },
    });

    let nextNumber = SEQUENCIAL_START; 

    if (latestCotista && latestCotista.numeroDaConta) {
        // Expressão Regular para extrair o número do formato "STOCKS-XXXX"
        const match = latestCotista.numeroDaConta.match(/STOCKS-(\d+)/);
        if (match && match[1]) {
            const currentNumber = parseInt(match[1]);
            // Garante que o próximo número seja o maior encontrado + 1, respeitando o SEQUENCIAL_START
            nextNumber = Math.max(currentNumber + 1, SEQUENCIAL_START);
        }
    }

    return `STOCKS-${nextNumber}`;
}

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const body = await readBody(event)

    // 1. Desestruturação e Validação Inicial dos Dados
    // 🔑 VAR CHECK: capitalInicial e aporteMensalPadrao são esperados do frontend e são obrigatórios no Cotista.
    let { 
        cpf, nome, sobrenome, telefone, email, password, roleId, 
        capitalInicial, aporteMensalPadrao // Campos do Cotista
    } = body

    // 🔑 VALIDAÇÃO CRÍTICA: capitalInicial e aporteMensalPadrao devem existir (mesmo que 0), 
    // e os campos obrigatórios do User também.
    if (!cpf || !nome || !sobrenome || !email || !password || !roleId || typeof capitalInicial === 'undefined' || typeof aporteMensalPadrao === 'undefined') {
        throw createError({ 
            statusCode: 400, 
            statusMessage: 'Dados obrigatórios (CPF, Nome, Sobrenome, E-mail, Senha, Role ID, Capital Inicial, Aporte Padrão) ausentes.' 
        })
    }
    
    // 🔑 FIX: Sanitiza o telefone para NULL se for string vazia
    telefone = telefone && telefone.trim() !== '' ? telefone : null;

    // 2. Verificação de Nível de Acesso (MIN_REQUIRED_LEVEL = 1)
    const currentUser = event.context.user 
    if (!currentUser || currentUser.roleId < 1) { 
        throw createError({ statusCode: 403, statusMessage: 'Acesso Negado. Requer Nível 1 ou superior.' })
    }

    // 3. Busca do Nível de Acesso para Validação de Permissão (Regras de Segurança)
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
            
            // 5a. GERAÇÃO DO NÚMERO DA CONTA SEQUENCIAL (Feito dentro da transação para consistência)
            const generatedNumeroDaConta = await getNextNumeroDaConta(tx);
            
            // 5b. Criação do Registro Cotista
            const createdCotista = await tx.cotista.create({
                data: {
                    // 🔑 Conversão explícita para Decimal (importado do runtime/library)
                    capitalInicial: new Decimal(capitalInicial), 
                    aporteMensalPadrao: new Decimal(aporteMensalPadrao),
                    numeroDaConta: generatedNumeroDaConta, // Usa o valor sequencial gerado
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
            else if (error.meta?.target.includes('numeroDaConta')) field = 'Número da Conta'; // Incluído o campo do Cotista

            throw createError({ statusCode: 409, statusMessage: `${field} já cadastrado no sistema.` })
        }
        
        if (error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        throw createError({ statusCode: 500, statusMessage: 'Falha ao criar o usuário e o cotista no banco de dados.' })
    }
})
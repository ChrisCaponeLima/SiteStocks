// /server/api/admin/users/index.post.ts - V1.7 - FIX CRÍTICO: Refatorado para usar o padrão de AUTENTICAÇÃO JWT Cookie-only (modelo gerar-movimentacao-rendimento). 
// Remove a dependência de event.context.user e corrige o erro 403.

import { defineEventHandler, readBody, createError, H3Event, getCookie } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth' // Import necessário para o padrão
import bcrypt from 'bcryptjs' 
import { Decimal } from '@prisma/client/runtime/library'; 

// -----------------------------------------------------------------------------
// 1️⃣ Tipagem de dados e regras de acesso
// -----------------------------------------------------------------------------

/**
 * Dados esperados no token JWT (copiado do arquivo modelo).
 */
interface AuthPayload {
    userId: number
    role: string
    roleLevel: number
    cotistaId?: number
}

// Tipagem para os dados de entrada
interface UserCreationPayload {
    cpf: string
    nome: string
    sobrenome: string
    telefone?: string | null
    email: string
    password: string
    roleId: number
    capitalInicial: number
    aporteMensalPadrao: number
}

/**
 * Constantes de regra de negócio.
 */
const MIN_LEVEL_REQUIRED = 2 // Nível mínimo para criar novos usuários. Ajuste se necessário.
const SALT_ROUNDS = 10 
const SEQUENCIAL_START = 1007 

// -----------------------------------------------------------------------------
// 2️⃣ Funções Auxiliares (mantidas da versão anterior)
// -----------------------------------------------------------------------------

/**
 * Busca o maior número de conta existente e retorna o próximo sequencial formatado.
 */
async function getNextNumeroDaConta(tx: any): Promise<string> {
    const latestCotista = await tx.cotista.findFirst({
        orderBy: { id: 'desc' },
        select: { numeroDaConta: true },
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

// -----------------------------------------------------------------------------
// 3️⃣ Manipulador principal da rota
// -----------------------------------------------------------------------------

export default defineEventHandler(async (event: H3Event) => {
    const prisma = usePrisma()

    // ---------------------------------------------------------------------------
    // 🔐 ETAPA 1: AUTENTICAÇÃO E AUTORIZAÇÃO (JWT Cookie-only)
    // ---------------------------------------------------------------------------

    // ✅ Recupera o cookie HTTPOnly contendo o token (Padrão replicado)
    const authToken = getCookie(event, 'auth_token')
    if (!authToken) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado. Cookie de sessão ausente.' })
    }

    // ✅ Decodifica o token e valida a sessão (Padrão replicado)
    let payload: AuthPayload
    try {
        payload = verifyToken(authToken) as AuthPayload
    } catch {
        throw createError({ statusCode: 401, statusMessage: 'Token inválido ou sessão expirada.' })
    }

    const currentUserLevel = payload.roleLevel

    // ---------------------------------------------------------------------------
    // 📥 ETAPA 2: VALIDAÇÃO DO PAYLOAD (corpo da requisição)
    // ---------------------------------------------------------------------------

    const body = await readBody<UserCreationPayload>(event)

    let { 
        cpf, nome, sobrenome, telefone, email, password, roleId, 
        capitalInicial, aporteMensalPadrao 
    } = body

    // 🔑 Tratamento robusto para valores numéricos/Decimal.
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

    // ---------------------------------------------------------------------------
    // 🔓 ETAPA 3: VALIDAÇÃO DE PERMISSÃO (Permissão para criar ESTE nível)
    // ---------------------------------------------------------------------------
    
    // 🔑 Refatoração: Busca o nível da Role que o usuário logado está tentando criar
    let targetRole;
    try {
        targetRole = await prisma.roleLevel.findUnique({
            where: { id: roleId },
            select: { level: true }
        })

        if (!targetRole) {
            throw createError({ statusCode: 404, statusMessage: `Role ID ${roleId} não encontrada.` })
        }
        
        const targetLevel = targetRole.level

        // ✅ Verifica nível de permissão (Padrão: Usuário logado DEVE ter nível maior OU ser o super admin - 99)
        if (currentUserLevel < MIN_LEVEL_REQUIRED && currentUserLevel !== 99) {
            console.warn(`[SECURITY] Acesso negado: usuário nível ${currentUserLevel} tentou criar usuário.`)
            throw createError({ statusCode: 403, statusMessage: `Acesso Proibido. É necessário nível ${MIN_LEVEL_REQUIRED} para criar usuários.` })
        }

        // ✅ Verifica se o usuário logado tem permissão para criar ESTE nível (Usuário logado.level > Nível a ser criado)
        // O Super Admin (99) pode criar qualquer nível.
        if (currentUserLevel <= targetLevel && currentUserLevel !== 99) {
            throw createError({ statusCode: 403, statusMessage: `Você (Nível ${currentUserLevel}) não tem permissão para criar usuários de nível ${targetLevel} ou superior.` })
        }

        // ---------------------------------------------------------------------------
        // 💾 ETAPA 4: CRIAÇÃO ATÔMICA (User e Cotista)
        // ---------------------------------------------------------------------------

        // Hashing da Senha
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        const [newCotista, newUser] = await prisma.$transaction(async (tx) => {
            
            // GERAÇÃO DO NÚMERO DA CONTA SEQUENCIAL
            const generatedNumeroDaConta = await getNextNumeroDaConta(tx);
            
            // Criação do Registro Cotista
            const createdCotista = await tx.cotista.create({
                data: {
                    capitalInicial: new Decimal(safeCapitalInicial), 
                    aporteMensalPadrao: new Decimal(safeAporteMensalPadrao),
                    numeroDaConta: generatedNumeroDaConta, 
                }
            })

            // Criação do Registro User, ligado ao Cotista
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

        // ---------------------------------------------------------------------------
        // 🥳 ETAPA 5: RETORNO DE SUCESSO
        // ---------------------------------------------------------------------------
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
        if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
             throw error
        }

        throw createError({ statusCode: 500, statusMessage: 'Falha ao criar o usuário e o cotista no banco de dados.' })
    }
})
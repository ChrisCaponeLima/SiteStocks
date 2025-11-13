// /server/api/admin/users/index.get.ts - V1.7 - REFACTOR: Aplica o padrão 'assertAdminPermission' para verificar a autorização (Novo Padrão).

import { defineEventHandler, getQuery, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { assertAdminPermission } from '~/server/utils/auth' // ✅ Importação do Helper de Segurança

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    
    // 1. 🛑 VERIFICAÇÃO DE AUTORIZAÇÃO (Padrão)
    // Se o usuário não tiver MIN_LEVEL (padrão 1), um erro 403 será lançado aqui.
    const currentUser = assertAdminPermission(event, 1) // Nível 1 é o MIN_REQUIRED_LEVEL
    const currentRoleLevel = currentUser.roleLevel

    // 2. Filtros de query
    const { search, level: levelFilter, status: statusFilter } = getQuery(event)

    // 3. Regra de segurança: Filtro máximo por nível de acesso
    // Administradores só podem listar usuários com nível MENOR que o seu.
    // Exceção: Super Admin (99) pode ver todos.
    const maxLevel = currentRoleLevel < 99 ? currentRoleLevel : undefined

    // 4. Preparação dos argumentos de filtro (where)
    const whereConditions: any = {}
    
    // --- 🔑 Lógica de Filtro de Nível de Acesso (Role) ---
    const roleLevelConditions: any = {} 
    
    // 4.1. Condição de Segurança: Limita o nível máximo (lt: maxLevel)
    if (maxLevel) {
        roleLevelConditions.lt = maxLevel 
    }

    // 4.2. Condição de Query: Filtro por nível específico (equals: requestedLevel)
    if (levelFilter && !isNaN(Number(levelFilter))) {
        const requestedLevel = Number(levelFilter)
        
        // Impedir que um admin filtre por um nível que ele não pode ver (Segurança reforçada)
        if (maxLevel && requestedLevel >= maxLevel) {
             throw createError({ 
                statusCode: 403, 
                statusMessage: 'Filtro de nível não permitido pela sua permissão.' 
            })
        }
        
        // Combina o filtro de segurança com o filtro de query.
        roleLevelConditions.equals = requestedLevel
    }
    
    // 4.3. Aplica a condição de nível (se houver filtros de segurança ou query)
    if (Object.keys(roleLevelConditions).length > 0) {
        whereConditions.role = {
            is: { level: roleLevelConditions }
        }
    }
    // --- FIM NÍVEL DE ACESSO ---


    // Filtro por status (ativo)
    if (statusFilter !== undefined && statusFilter !== '') {
        const ativoValue = String(statusFilter).toLowerCase() === 'true' || String(statusFilter).toLowerCase() === 'ativo'
        whereConditions.ativo = ativoValue
    }
    
    // Filtro de busca (search) combinado
    if (search) {
        const searchString = String(search)
        whereConditions.OR = [
            { nome: { contains: searchString, mode: 'insensitive' } },
            { sobrenome: { contains: searchString, mode: 'insensitive' } },
            { email: { contains: searchString, mode: 'insensitive' } },
        ]
    }
    
    try {
        const users = await prisma.user.findMany({
            where: whereConditions,
            select: {
                id: true,
                cpf: true,
                nome: true,
                sobrenome: true, 
                email: true,
                telefone: true,
                ativo: true, 
                createdAt: true,
                roleId: true,
                role: {
                    select: {
                        name: true,
                        level: true,
                    }
                }
            },
            orderBy: { id: 'asc' },
        })

        // 5. Mapeamento final para o frontend
        const finalUsers = users.map(user => ({
            ...user,
            level: user.role.level, 
            roleLevel: user.role.level,
            status: user.ativo ? 'ATIVO' : 'INATIVO', 
        }))

        // 6. 🛑 EXCEÇÃO: Remove o próprio usuário da listagem, independentemente do nível.
        // Como currentUser é garantido de existir aqui, podemos usá-lo com segurança.
        return finalUsers.filter(user => user.id !== currentUser.userId) 

    } catch (error) {
        console.error('Erro ao listar usuários:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar a lista de usuários.' })
    }
})
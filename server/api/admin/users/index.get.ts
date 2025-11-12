// /server/api/admin/users/index.get.ts - V1.5 - CORREÇÃO: Robustez na verificação de autenticação para evitar falhas em caso de 'roleLevel' ausente ou inválido.

import { defineEventHandler, getQuery, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    
    // 1. 🛑 VERIFICAÇÃO DE AUTORIZAÇÃO (MIN_LEVEL = 1)
    const currentUser = event.context.user // { id, roleId, roleLevel }
    const MIN_REQUIRED_LEVEL = 1 
    
    // Garante que currentUser existe e que roleLevel é um número válido (ou 0 se inválido) antes da comparação.
    const currentRoleLevel = (currentUser && typeof currentUser.roleLevel === 'number') ? currentUser.roleLevel : 0

    // Esta verificação é crucial e deve ser mantida, pois esta API é restrita a administradores.
    if (!currentUser || currentRoleLevel < MIN_REQUIRED_LEVEL) { 
        throw createError({ 
            statusCode: 403, 
            statusMessage: 'Acesso Proibido. Nível de permissão não atingido.' 
        })
    }
    
    // 2. Filtros de query
    const { search, level: levelFilter, status: statusFilter } = getQuery(event)

    // 3. Regra de segurança: Filtro máximo por nível de acesso
    // Administradores só podem listar usuários com nível MENOR que o seu.
    // Exceção: Super Admin (99) pode ver todos.
    const maxLevel = currentRoleLevel < 99 ? currentRoleLevel : undefined

    // 4. Preparação dos argumentos de filtro (where)
    const whereConditions: any = {}
    
    // --- 🔑 Lógica de Filtro de Nível de Acesso (Role) ---
    // Esta lógica garante que a condição de segurança (lt: maxLevel) seja sempre aplicada.
    
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
        // 'role' é o nome do relacionamento no Schema 'User', está correto.
        whereConditions.role = {
            is: { level: roleLevelConditions }
        }
    }
    // --- FIM NÍVEL DE ACESSO ---


    // Filtro por status (ativo) - Lógica mantida e limpa.
    if (statusFilter !== undefined && statusFilter !== '') {
        const ativoValue = String(statusFilter).toLowerCase() === 'true' || String(statusFilter).toLowerCase() === 'ativo'
        whereConditions.ativo = ativoValue
    }
    
    // Filtro de busca (search) combinado - Lógica mantida e limpa.
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
            // Padronização: Mantém 'level' e 'roleLevel' por compatibilidade do frontend
            level: user.role.level, 
            roleLevel: user.role.level,
            // Padronização: 'status' como string para exibição
            status: user.ativo ? 'ATIVO' : 'INATIVO', 
        }))

        // 6. 🛑 EXCEÇÃO: Remove o próprio usuário da listagem, independentemente do nível.
        return finalUsers.filter(user => user.id !== currentUser.id)

    } catch (error) {
        console.error('Erro ao listar usuários:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar a lista de usuários.' })
    }
})
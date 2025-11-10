// /server/api/admin/users/index.get.ts - V1.2 - CRÍTICO: Correção de padronização, regra de segurança e leitura de token (via middleware).

import { defineEventHandler, getQuery, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    
    // 1. 🛑 VERIFICAÇÃO DE AUTORIZAÇÃO (MIN_LEVEL = 1)
    // event.context.user DEVE ser populado pelo /server/middleware/auth.ts lendo o Cookie.
    const currentUser = event.context.user // { id, roleId, roleLevel }
    const MIN_REQUIRED_LEVEL = 1 

    // O erro que você está vendo (403/401) vem daqui porque currentUser está nulo/nível 0 no SSR.
    if (!currentUser || currentUser.roleLevel < MIN_REQUIRED_LEVEL) { 
        throw createError({ 
            statusCode: 403, 
            statusMessage: 'Acesso Proibido. Nível de permissão não atingido.' // Mensagem de erro que estava vindo.
        })
    }
    
    // 2. Filtros de query
    // ⚠️ PADRONIZAÇÃO: 'search' e 'levelFilter' usados. 'status' virá como 'ativo' no DB.
    const { search, level: levelFilter, status: statusFilter } = getQuery(event)

    // 3. Regra de segurança: Filtro máximo por nível de acesso
    // Administradores só podem listar usuários com nível MENOR que o seu.
    // Exceção: O Super Admin (Nível 3 ou 99) pode ver todos.
    const maxLevel = currentUser.roleLevel < 99 ? currentUser.roleLevel : undefined

    // 4. Preparação dos argumentos de filtro (where)
    const whereConditions: any = {
        // 🔑 REFORÇO: O usuário só pode ver níveis abaixo do seu.
        // Isso evita que um Nível 1 veja Nível 2. 
        role: maxLevel ? { is: { level: { lt: maxLevel } } } : undefined,
    }

    // ⚠️ CORREÇÃO: Filtro por Nível de acesso (role.level) do usuário alvo
    if (levelFilter && !isNaN(Number(levelFilter))) {
        whereConditions.role = {
            is: { level: Number(levelFilter) }
        }
    }

    // ⚠️ CORREÇÃO: Filtro por status (ativo)
    if (statusFilter !== undefined && statusFilter !== '') {
        // Converte string 'true'/'false' ou 'ATIVO'/'INATIVO' para boolean
        const ativoValue = String(statusFilter).toLowerCase() === 'true' || String(statusFilter).toLowerCase() === 'ativo'
        whereConditions.ativo = ativoValue
    }
    
    // ⚠️ CORREÇÃO: Filtro de busca (search) combinado (nome, sobrenome, email)
    if (search) {
        const searchString = String(search)
        whereConditions.OR = [
            { nome: { contains: searchString, mode: 'insensitive' } },
            { sobrenome: { contains: searchString, mode: 'insensitive' } },
            { email: { contains: searchString, mode: 'insensitive' } },
        ]
    }
    
    // ⚠️ REFORÇO CRÍTICO: Não mostrar usuários de nível IGUAL ou SUPERIOR, exceto Super Admin.
    if (maxLevel) {
        whereConditions.role = {
             is: { level: { lt: maxLevel } } // Filtra estritamente os níveis menores.
        }
    }


    try {
        const users = await prisma.user.findMany({
            where: whereConditions,
            select: {
                id: true,
                cpf: true,
                nome: true,
                sobrenome: true, // Incluído sobrenome para padronização
                email: true,
                telefone: true,
                ativo: true, // Usando 'ativo' como nome do campo de status
                createdAt: true,
                roleId: true,
                role: {
                    select: {
                        name: true,
                        level: true, // Incluído o level da role
                    }
                }
            },
            orderBy: { id: 'asc' },
        })

        // 5. Mapeamento final para o frontend
        const finalUsers = users.map(user => ({
            ...user,
            // ⚠️ PADRONIZAÇÃO: level/roleLevel deve ser pego de role.level
            level: user.role.level, 
            roleLevel: user.role.level,
            // ⚠️ PADRONIZAÇÃO: status convertido para string 'ATIVO'/'INATIVO' para visualização
            status: user.ativo ? 'ATIVO' : 'INATIVO', 
        }))

        // 6. 🛑 EXCEÇÃO: Remove o próprio usuário da listagem, independentemente do nível.
        return finalUsers.filter(user => user.id !== currentUser.id)

    } catch (error) {
        console.error('Erro ao listar usuários:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar a lista de usuários.' })
    }
})
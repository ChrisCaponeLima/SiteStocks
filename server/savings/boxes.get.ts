// /server/api/savings/boxes.get.ts

import { defineEventHandler } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { assertUserAuthenticated } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const currentUser = assertUserAuthenticated(event) // 🔑 Autenticação

    try {
        // Busca todas as caixinhas do cotista, incluindo o último snapshot de saldo
        const boxes = await prisma.savingBoxes.findMany({
            where: {
                cotistaId: currentUser.cotistaId as number,
                ativo: true
            },
            select: {
                id: true,
                name: true,
                goalValue: true,
                created_at: true,
                // Inclui a movimentação mais recente para obter o saldo atual
                SavingsBoxesBalanceSnapshot: {
                    take: 1,
                    orderBy: { referencedate: 'desc' },
                    select: { balance: true }
                }
            }
        })

        // Mapeia o resultado para formatar o saldo
        const formattedBoxes = boxes.map(box => ({
            id: box.id,
            name: box.name,
            goalValue: box.goalValue,
            created_at: box.created_at,
            // 🛑 CRÍTICO: Pega o saldo do primeiro (e único) snapshot retornado.
            currentBalance: box.SavingsBoxesBalanceSnapshot[0]?.balance ?? 0, 
        }))

        return formattedBoxes
        
    } catch (error) {
        console.error('Erro ao listar caixinhas:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar as caixinhas.' })
    }
})
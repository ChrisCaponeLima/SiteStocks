// /server/api/savings/boxes/create.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { assertUserAuthenticated } from '~/server/utils/auth' // Novo helper

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const currentUser = assertUserAuthenticated(event) // 🔑 Autenticação

    const { name, goalValue } = await readBody(event)

    if (!name || typeof name !== 'string' || name.length < 3) {
        throw createError({ statusCode: 400, statusMessage: 'Nome da caixinha é obrigatório.' })
    }

    try {
        const goal = goalValue ? Number(goalValue) : null;
        if (goal !== null && (isNaN(goal) || goal < 0)) {
             throw createError({ statusCode: 400, statusMessage: 'Valor da meta inválido.' })
        }

        // 1. Cria o registro da caixinha
        const newBox = await prisma.savingBoxes.create({
            data: {
                cotistaId: currentUser.cotistaId as number, // Garantido pelo assertUserAuthenticated
                name: name,
                goalValue: goal,
                ativo: true,
            }
        })

        // 2. Cria o primeiro Snapshot de Saldo (Saldo Inicial Zero)
        await prisma.savingsBoxesBalanceSnapshot.create({
            data: {
                boxId: newBox.id,
                balance: 0,
                referencedate: new Date(),
            }
        })

        return { 
            message: 'Caixinha criada com sucesso.',
            boxId: newBox.id
        }
        
    } catch (error) {
        console.error('Erro ao criar caixinha:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha interna ao criar a caixinha.' })
    }
})
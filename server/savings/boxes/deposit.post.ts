// /server/api/savings/boxes/deposit.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { assertUserAuthenticated } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const currentUser = assertUserAuthenticated(event)

    const { boxId, amount } = await readBody(event)

    const depositAmount = Number(amount)

    // Validação de entrada
    if (!boxId || isNaN(depositAmount) || depositAmount <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'BoxId ou valor de depósito inválido.' })
    }

    try {
        // Verifica se a caixa pertence ao usuário e está ativa
        const box = await prisma.savingBoxes.findUniqueOrThrow({
            where: { id: boxId, cotistaId: currentUser.cotistaId as number, ativo: true },
        })

        // 🔑 Transação Atômica: Garante que ambos os passos aconteçam.
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Obter Saldo Base
            const lastSnapshot = await tx.savingsBoxesBalanceSnapshot.findFirstOrThrow({ 
                where: { boxId }, 
                orderBy: { referencedate: 'desc' } 
            });
            const currentBalance = lastSnapshot.balance.toNumber();
            
            const newBalance = currentBalance + depositAmount;

            // 2. Registrar Movimentação (APORTE)
            await tx.savingsBoxesMovements.create({ 
                data: { 
                    boxId, 
                    amount: depositAmount, 
                    type: 'APORTE' 
                } 
            });

            // 3. Criar Novo Snapshot de Saldo
            await tx.savingsBoxesBalanceSnapshot.create({ 
                data: { 
                    boxId, 
                    balance: newBalance, 
                    referencedate: new Date() 
                } 
            });

            return { newBalance };
        })

        return { message: 'Aporte realizado com sucesso.', newBalance: result.newBalance }

    } catch (error) {
        console.error('Erro no depósito:', error)
        // Tratamento de erro específico para a transação
        throw createError({ statusCode: 500, statusMessage: 'Falha na transação de depósito. Verifique o boxId.' })
    }
})
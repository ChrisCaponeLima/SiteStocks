// /server/api/savings/boxes/withdraw.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { assertUserAuthenticated } from '~/server/utils/auth' // Helper de autenticação

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const currentUser = assertUserAuthenticated(event) // 🔑 1. Autenticação e Propriedade

    const { boxId, amount } = await readBody(event)

    const withdrawAmount = Number(amount)

    // Validação de entrada
    if (!boxId || isNaN(withdrawAmount) || withdrawAmount <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'BoxId ou valor de resgate inválido.' })
    }

    try {
        // 2. Verificação de Propriedade e Status Ativo
        // Garante que a caixa pertence ao usuário logado e está ativa
        const box = await prisma.savingBoxes.findUniqueOrThrow({
            where: { id: boxId, cotistaId: currentUser.cotistaId as number, ativo: true },
        })

        // 🔑 3. Transação Atômica (Resgate, Movimentação e Snapshot)
        const result = await prisma.$transaction(async (tx) => {
            
            // 3.1. Obter Saldo Base (último snapshot)
            const lastSnapshot = await tx.savingsBoxesBalanceSnapshot.findFirstOrThrow({ 
                where: { boxId }, 
                orderBy: { referencedate: 'desc' } 
            });
            const currentBalance = lastSnapshot.balance.toNumber();
            
            // 3.2. Validação Crítica de Saldo
            if (currentBalance < withdrawAmount) {
                // Lança um erro, abortando a transação.
                throw createError({ statusCode: 400, statusMessage: 'Saldo insuficiente para resgate.' });
            }
            
            // 3.3. Cálculo do novo saldo
            const newBalance = currentBalance - withdrawAmount;
            
            // 3.4. Registrar Movimentação (RESGATE com valor negativo para auditoria)
            await tx.savingsBoxesMovements.create({ 
                data: { 
                    boxId, 
                    amount: withdrawAmount * -1, // Valor negativo
                    type: 'RESGATE' 
                } 
            });

            // 3.5. Criar Novo Snapshot de Saldo
            await tx.savingsBoxesBalanceSnapshot.create({ 
                data: { 
                    boxId, 
                    balance: newBalance, 
                    referencedate: new Date() 
                } 
            });

            return { newBalance };
        })

        return { message: 'Resgate realizado com sucesso.', newBalance: result.newBalance }

    } catch (error) {
        // Se o erro foi um 400 (Saldo insuficiente), ele será propagado.
        if (error.statusCode === 400) {
            throw error;
        }
        console.error('Erro no resgate:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha na transação de resgate. Verifique o boxId.' })
    }
})
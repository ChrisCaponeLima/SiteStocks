// /server/api/cotista/[id]/deposito.post.ts - V10.3 - SIMPLIFICAÇÃO: Removida redundância de userId, usando cotistaId para reserva do PIX.

import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { StatusDeposito } from '@prisma/client' 
import Decimal from 'decimal.js' 

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    // Padronização e verificação de variáveis (mantidas)
    const cotistaIdParam = getRouterParam(event, 'id')
    const cotistaId = Number(cotistaIdParam) 
    const body = await readBody(event)
    // 🛑 Simplificado: Agora só precisamos do depositAmount, pois usaremos cotistaId (da URL) para a reserva.
    const { depositAmount } = body 


    if (isNaN(cotistaId)) {
        throw createError({ statusCode: 400, statusMessage: 'ID do Cotista inválido.' })
    }

    if (!depositAmount || new Decimal(depositAmount).lte(0)) {
        throw createError({ statusCode: 400, statusMessage: 'Valor de depósito inválido.' })
    }
    
    // Converte o valor para o formato correto do banco de dados (mantido)
    const valorParaDB = new Decimal(depositAmount).toFixed(2)

    try {
        // 1. VERIFICAR SE O COTISTA EXISTE (mantido)
        const cotistaExists = await prisma.cotista.findUnique({ where: { id: cotistaId }, select: { id: true } })
        if (!cotistaExists) { throw createError({ statusCode: 404, statusMessage: `Cotista com ID ${cotistaId} não encontrado.` }) }
        
        // 2. BUSCAR E RESERVAR O CÓDIGO PIX ESTÁTICO (Status 'ATIVO' mantido)
        const pixCodeRecord = await prisma.pixCopiaColaEstatico.findFirst({
            where: { status: 'ATIVO' }, 
            orderBy: { id: 'asc' } 
        })

        if (!pixCodeRecord) {
            throw createError({ statusCode: 503, statusMessage: 'Nenhum código PIX disponível no momento. Tente mais tarde.' })
        }

        // 3. ATUALIZAÇÃO TRANSACIONAL DO CÓDIGO ESTÁTICO E CRIAÇÃO DO DEPÓSITO
        const transaction = await prisma.$transaction(async (tx) => {
            
            // A. Atualizar o registro do Código Estático (MARCAR COMO UTILIZADO)
            const updatedPixCode = await tx.pixCopiaColaEstatico.update({
                where: { id: pixCodeRecord.id },
                data: {
                    status: 'UTILIZADO',
                    utilizadoEm: new Date(),
                    // 🔑 ALTERAÇÃO CRÍTICA: Usando cotistaId, que é o ID do cotista logado
                    cotistaQueUtilizouId: cotistaId,
                    valorInformado: valorParaDB 
                }
            })

            // B. Criação do Registro de Depósito Pendente (mantido)
            const newDepositRequest = await tx.depositoPixPendente.create({
                data: {
                    cotistaId: cotistaId,
                    status: StatusDeposito.PENDENTE, 
                    valorSolicitado: valorParaDB, 
                    dataSolicitacao: new Date(), 
                    pixPayload: updatedPixCode.codigo, 
                },
                select: { id: true, valorSolicitado: true, pixPayload: true }
            })

            return newDepositRequest
        })


        // 4. RETORNO (mantido)
        return {
            message: 'Solicitação de depósito registrada com sucesso. Utilize o QR Code/Copia e Cola.',
            pixPayload: transaction.pixPayload, 
            transactionId: transaction.id,
            depositValue: transaction.valorSolicitado,
        }

    } catch (error: any) {
        console.error('ERRO CRÍTICO NO FLUXO DE DEPÓSITO PIX:', error) 
        
        // Se houver erro de transação (ex: registro duplicado, falha na atualização), revertemos.
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Falha ao processar solicitação de depósito. O código PIX pode ter sido reservado por outro usuário simultaneamente. Tente novamente.'
        })
    }
})
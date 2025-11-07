// /server/api/cotista/[id]/deposito.post.ts - V1.3 - Implementação de tratamento específico para erros de Unique Constraint (P2002) no banco de dados.
import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { StatusDeposito, Prisma } from '@prisma/client' // V1.3 - Adicionando 'Prisma' para acesso a erros
import Decimal from 'decimal.js' 

// V1.0 - CONSTANTES DO RECEBEDOR
const RECEIVER_PIX_KEY = 'c_cappone+btg@hotmail.com'
const RECEIVER_NAME = 'Christiano Gomes de Lima'
const RECEIVER_CITY = 'NA'

// V1.0 - Função utilitária para gerar o Payload Pix Mockado (SIMULAÇÃO)
const generateMockPixPayload = (amount: number, txid: string): string => {
    const amountString = amount.toFixed(2)
    const amountTag = `54${amountString.length.toString().padStart(2, '0')}${amountString}` 
    
    const formattedName = RECEIVER_NAME.substring(0, 25).toUpperCase().replace(/[^A-Z0-9.\- ]/g, '').trim()
    const formattedCity = RECEIVER_CITY.substring(0, 15).toUpperCase().replace(/[^A-Z0-9.\- ]/g, '').trim()
    
    const pixData = 
        `00020101021226650014br.gov.bcb.pix01${RECEIVER_PIX_KEY.length.toString().padStart(2, '0')}${RECEIVER_PIX_KEY}0214De Cida Duarte520400005303986${amountTag}5802BR59${formattedName.length.toString().padStart(2, '0')}${formattedName}60${formattedCity.length.toString().padStart(2, '0')}${formattedCity}6207${txid}63045F1C`
    
    return pixData
}

// V1.0 - Manipulador de evento para a rota POST
export default defineEventHandler(async (event) => {
    const prisma = usePrisma()

    // 1. EXTRAÇÃO E VALIDAÇÃO DE DADOS
    const cotistaIdParam = getRouterParam(event, 'id');
    const cotistaId = Number(cotistaIdParam);

    if (isNaN(cotistaId)) {
        throw createError({ statusCode: 400, statusMessage: 'ID do Cotista inválido.' });
    }

    const body = await readBody(event);
    const { depositAmount } = body; 

    if (typeof depositAmount !== 'number' || depositAmount <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Valor do depósito inválido ou ausente.' });
    }
    
    // V1.2 - Converte o valor para Decimal para garantir a precisão antes do DB
    const valorDecimal = new Decimal(depositAmount)

    try {
        // V1.2 - PASSO CRÍTICO: VERIFICA SE O COTISTA EXISTE
        const cotistaExists = await prisma.cotista.findUnique({
            where: { id: cotistaId },
            select: { id: true }
        })

        if (!cotistaExists) {
             throw createError({ statusCode: 404, statusMessage: `Cotista com ID ${cotistaId} não encontrado.` });
        }
        
        // 2. GERAÇÃO DE TXID E PAYLOAD (MOCK)
        // V1.3 - Gerando um TXID que é menos propenso a colisões em testes rápidos: timestamp + 3 dígitos randômicos.
        const mockTxid = (Date.now()).toString().slice(-10) + Math.floor(Math.random() * 900 + 100).toString(); 
        const generatedPayload = generateMockPixPayload(depositAmount, mockTxid);

        // 3. PERSISTÊNCIA NO BANCO DE DADOS (DepositoPixPendente)
        const newDepositRequest = await prisma.depositoPixPendente.create({
            data: {
                cotistaId: cotistaId,
                status: StatusDeposito.PENDENTE, 
                valorSolicitado: valorDecimal.toFixed(2), 
                dataSolicitacao: new Date(), // V1.3 - Explicitamente definindo 'dataSolicitacao' para evitar problemas de timezone/default DB.
                pixPayload: generatedPayload, 
            },
            select: {
                id: true,
                valorSolicitado: true,
                pixPayload: true,
            }
        });

        // 4. RETORNO PARA O CLIENTE
        return {
            message: 'Solicitação de depósito registrada com sucesso. Aguardando pagamento.',
            pixPayload: newDepositRequest.pixPayload, 
            transactionId: newDepositRequest.id,
            depositValue: newDepositRequest.valorSolicitado,
        };

    } catch (error: any) {
        console.error('ERRO ao registrar depósito Pix:', error);
        
        // V1.3 - TRATAMENTO ESPECÍFICO PARA ERRO DE UNIQUE CONSTRAINT (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(', ') : error.meta?.target;
                
                throw createError({
                    statusCode: 500,
                    statusMessage: `Falha de UNIQUE CONSTRAINT no campo: '${target}'. Verifique se o campo no schema está correto ou se o valor está sendo duplicado. (Prisma P2002)`,
                });
            }
        }

        // V1.2 - Erros genéricos de DB ou de infraestrutura
        if (error.statusCode === 404) {
             throw error; 
        }

        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Falha ao processar solicitação de depósito no banco de dados. (Erro de DB não mapeado)'
        });
    }
});
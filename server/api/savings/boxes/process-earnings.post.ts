// /server/api/savings/boxes/process-earnings.post.ts - V1.3 ROBUSTO
// 🔒 Implementa checagem Decimal, idempotência via Movements e registro de duração.

import { defineEventHandler, createError, getHeader } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { calculateMonthlyEarningRate, calculateEarningsAmount } from '~/server/utils/financial'
import { Decimal } from '@prisma/client/runtime/library'; 

// -----------------------------------------------------------------------------
// 1️⃣ Tipagem e constantes do padrão de segurança
// -----------------------------------------------------------------------------

if (!process.env.CRON_JOB_SECRET) {
  throw new Error('[CONFIG] CRON_JOB_SECRET ausente. Bloqueando execução de serviço CRON.');
}
const CRON_SECRET = process.env.CRON_JOB_SECRET;

const LOG_PREFIX = '[SAVINGS][CRON]';
const JOB_NAME = 'process-earnings';

// -----------------------------------------------------------------------------
// 2️⃣ Handler principal da rota
// -----------------------------------------------------------------------------
export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    let processedCount = 0;
    let jobStatus = 'FAILURE';
    let logMessage = '';
    const executionStart = new Date(); // Início da medição de tempo
    const todayString = executionStart.toISOString().split('T')[0]; // Data de referência para snapshots

    try {
        // -------------------------------------------------------------------------
        // 🔐 ETAPA 1: AUTENTICAÇÃO (Por Chave Secreta/Serviço)
        // -------------------------------------------------------------------------
        const submittedSecret = getHeader(event, 'X-Cron-Secret');
        
        if (!submittedSecret || submittedSecret !== CRON_SECRET) {
            console.warn(`${LOG_PREFIX} Acesso negado: Chave secreta de CRON inválida.`);
            logMessage = 'Falha na autenticação: Chave secreta inválida.';
            throw createError({ statusCode: 403, statusMessage: 'Acesso Proibido. Chave secreta de CRON inválida.' });
        }

        // -------------------------------------------------------------------------
        // ⚙️ ETAPA 2: PREPARAÇÃO E CONSULTA
        // -------------------------------------------------------------------------
        const earningRate = calculateMonthlyEarningRate();
        console.log(`${LOG_PREFIX} Iniciando. Taxa: ${earningRate * 100}%. Data Ref: ${todayString}`);

        const activeBoxes = await prisma.savingBoxes.findMany({
            where: { ativo: true },
            select: {
                id: true,
                SavingsBoxesBalanceSnapshot: {
                    take: 1,
                    orderBy: { referencedate: 'desc' },
                    select: { balance: true }
                }
            }
        });
        
        // -------------------------------------------------------------------------
        // 💾 ETAPA 3: PROCESSAMENTO ATÔMICO COM IDEMPOTÊNCIA
        // -------------------------------------------------------------------------

        for (const box of activeBoxes) {
            const lastSnapshot = box.SavingsBoxesBalanceSnapshot[0];
            
            if (!lastSnapshot) {
                // Caso não haja snapshot (caixa recém-criada sem aporte), pula.
                continue; 
            }

            // 💡 Melhoria: Normaliza o saldo para Decimal garantindo consistência
            const currentBalance = new Decimal(lastSnapshot.balance); 

            if (currentBalance.equals(0)) {
                continue; // Ignora caixinhas com saldo zero
            }

            // 🔑 Idempotência 1: Checa se um Snapshot já foi criado hoje
            // Essa checagem já estava presente na versão V1.2.
            const existingSnapshotToday = await prisma.savingsBoxesBalanceSnapshot.findFirst({
              where: { boxId: box.id, referencedate: new Date(todayString) },
            });
            if (existingSnapshotToday) {
                console.warn(`${LOG_PREFIX} BOX ${box.id}: Snapshot de saldo já existe hoje. Pulando.`);
                continue;
            }
            
            // 🔑 Idempotência 2: Checa se uma movimentação de RENDIMENTO já foi registrada hoje (mais robusto)
            const existingMovement = await prisma.savingsBoxesMovements.findFirst({
              where: { 
                  boxId: box.id, 
                  type: 'RENDIMENTO', 
                  created_at: { gte: new Date(todayString) } 
              }
            });
            if (existingMovement) { 
                console.warn(`${LOG_PREFIX} BOX ${box.id}: Movimentação RENDIMENTO já registrada hoje. Pulando.`); 
                continue; 
            }

            // Assume-se que calculateEarningsAmount retorna Number
            const earningAmountRaw = calculateEarningsAmount(currentBalance, earningRate); 
            const earningAmountDecimal = new Decimal(earningAmountRaw);

            if (earningAmountDecimal.gt(0)) { 
                
                await prisma.$transaction(async (tx) => {
                    const newBalance = currentBalance.plus(earningAmountDecimal);

                    await tx.savingsBoxesMovements.create({ 
                        data: { boxId: box.id, amount: earningAmountDecimal, type: 'RENDIMENTO' } 
                    });

                    await tx.savingsBoxesBalanceSnapshot.create({ 
                        data: { boxId: box.id, balance: newBalance, referencedate: new Date(todayString) } 
                    });
                });
                processedCount++;
            }
        }

        jobStatus = 'SUCCESS';
        logMessage = `Taxa ${(earningRate * 100).toFixed(4)}%. Processou ${processedCount} caixas.`;
        
        // -------------------------------------------------------------------------
        // 🧮 ETAPA 4: FORMATAÇÃO E RETORNO
        // -------------------------------------------------------------------------
        return { 
            success: true,
            count: processedCount,
            message: logMessage,
            rateApplied: earningRate,
        };

    } catch (error: any) {
        // -----------------------------------------------------------------------
        // ⚠️ ETAPA 5: TRATAMENTO CENTRALIZADO DE ERROS
        // -----------------------------------------------------------------------
        logMessage = `ERRO: ${error.message || 'Falha desconhecida.'}`;
        console.error(`${LOG_PREFIX} ERRO CRÍTICO:`, error);
        
        throw createError({ 
            statusCode: error.statusCode || 500, 
            message: error.message || 'Falha no processamento de rendimentos.',
        });
    } finally {
        // 🧩 3. Registrar auditoria da execução (executa mesmo em caso de erro)
        const executionFinished = new Date();
        const durationMs = executionFinished.getTime() - executionStart.getTime();

        await prisma.cronJobLog.create({
            data: {
                jobName: JOB_NAME,
                executedAt: executionStart,
                processed: processedCount,
                status: jobStatus,
                message: `${logMessage} | Duração: ${durationMs}ms`,
            },
        }).catch(logError => {
            console.error(`${LOG_PREFIX} FALHA CRÍTICA ao registrar CronJobLog:`, logError);
        });
    }
});
// /server/api/savings/boxes/process-earnings.post.ts - FINAL

import { defineEventHandler, createError, getHeader } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { calculateMonthlyEarningRate, calculateEarningsAmount } from '~/server/utils/financial'
import { Decimal } from '@prisma/client/runtime/library'

// -----------------------------------------------------------------------------
// 1️⃣ Segurança CRON
// -----------------------------------------------------------------------------
if (!process.env.CRON_JOB_SECRET) {
  throw new Error('[CONFIG] CRON_JOB_SECRET ausente. Bloqueando execução.')
}
const CRON_SECRET = process.env.CRON_JOB_SECRET

const LOG_PREFIX = '[SAVINGS][CRON]'
const JOB_NAME = 'process-earnings'

// -----------------------------------------------------------------------------
// 2️⃣ Handler
// -----------------------------------------------------------------------------
export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  let processedCount = 0
  let jobStatus = 'FAILURE'
  let logMessage = ''
  const executionStart = new Date()
  const todayString = executionStart.toISOString().split('T')[0]

  try {
    // -------------------------------------------------------------------------
    // 🔐 AUTENTICAÇÃO VIA CHAVE
    // -------------------------------------------------------------------------
    const submittedSecret = getHeader(event, 'x-cron-secret')

    if (!submittedSecret || submittedSecret !== CRON_SECRET) {
      logMessage = 'Chave secreta incorreta.'
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso Proibido. Chave secreta de CRON inválida.'
      })
    }

    // -------------------------------------------------------------------------
    // ⚙️ Consulta caixas
    // -------------------------------------------------------------------------
    const rate = calculateMonthlyEarningRate()
    console.log(`${LOG_PREFIX} Iniciando (${rate * 100}%).`)

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
    })

    // -------------------------------------------------------------------------
    // 💾 Processamento
    // -------------------------------------------------------------------------
    for (const box of activeBoxes) {
      const lastSnapshot = box.SavingsBoxesBalanceSnapshot[0]
      if (!lastSnapshot) continue

      const currentBalance = new Decimal(lastSnapshot.balance)
      if (currentBalance.equals(0)) continue

      const earnings = new Decimal(
        calculateEarningsAmount(currentBalance, rate)
      )
      if (earnings.lte(0)) continue

      // Idempotência
      const existingSnapshotToday = await prisma.savingsBoxesBalanceSnapshot.findFirst({
        where: { boxId: box.id, referencedate: new Date(todayString) }
      })
      if (existingSnapshotToday) continue

      const existingMovement = await prisma.savingsBoxesMovements.findFirst({
        where: {
          boxId: box.id,
          type: 'RENDIMENTO',
          created_at: { gte: new Date(todayString) }
        }
      })
      if (existingMovement) continue

      await prisma.$transaction(async (tx) => {
        await tx.savingsBoxesMovements.create({
          data: { boxId: box.id, amount: earnings, type: 'RENDIMENTO' }
        })

        await tx.savingsBoxesBalanceSnapshot.create({
          data: {
            boxId: box.id,
            balance: currentBalance.plus(earnings),
            referencedate: new Date(todayString)
          }
        })
      })

      processedCount++
    }

    jobStatus = 'SUCCESS'
    logMessage = `Processou ${processedCount} caixas (Taxa: ${rate}).`

    return {
      success: true,
      count: processedCount,
      rateApplied: rate,
      message: logMessage
    }
  } catch (error: any) {
    logMessage = `ERRO: ${error.message}`
    throw error
  } finally {
    const end = new Date()
    await prisma.cronJobLog.create({
      data: {
        jobName: JOB_NAME,
        executedAt: executionStart,
        processed: processedCount,
        status: jobStatus,
        message: logMessage,
        durationMs: end.getTime() - executionStart.getTime()
      }
    })
  }
})

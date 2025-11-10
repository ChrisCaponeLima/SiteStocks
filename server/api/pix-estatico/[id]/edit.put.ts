import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const codeId = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { codigo, valorPadrao, status } = body

    // 🛑 SEGURANÇA: Verificação de Nível (Nível 2)

    if (isNaN(codeId)) {
        throw createError({ statusCode: 400, statusMessage: 'ID do código inválido.' })
    }

    try {
        const updatedCode = await prisma.pixCopiaColaEstatico.update({
            where: { id: codeId },
            data: {
                codigo: codigo,
                valorInformado: new Decimal(valorPadrao || 0).toFixed(2),
                status: status // Ex: PENDENTE, UTILIZADO, EXPIRADO
            }
        })

        return { message: 'Código PIX estático atualizado com sucesso.', id: updatedCode.id }
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw createError({ statusCode: 404, statusMessage: 'Código PIX não encontrado.' })
        }
        console.error('ERRO AO EDITAR CÓDIGO PIX:', error)
        throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar o código PIX.' })
    }
})
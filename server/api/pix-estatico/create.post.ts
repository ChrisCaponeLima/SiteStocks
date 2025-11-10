// /server/api/pix-estatico/create.post.ts - V2.1 - RESTAURADO PADRÃO DE AUTENTICAÇÃO: Substituído event.context.auth por verifyToken() + header Authorization, garantindo que userLevel seja corretamente recuperado do token.

// Mantido conforme sua versão original
import { defineEventHandler, readBody, createError } from 'h3'
import { usePrisma } from '~/server/utils/prisma'
import { verifyToken } from '~/server/utils/auth'   // ✅ RESTAURADO

// ✅ Padrão oficial: roleLevel do token
const MIN_ACCESS_LEVEL = 2

export default defineEventHandler(async (event) => {
    const prisma = usePrisma()
    const body = await readBody(event)

    console.log('DEBUG: Início da requisição PIX Estático.')
    console.log('DEBUG: Body recebido:', body)

    // ✅ RESTAURADO: Autenticação oficial baseada em Authorization Header
    const token = event.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Token ausente. É necessário estar autenticado.'
        })
    }

    let payload
    try {
        payload = verifyToken(token)
        console.log('DEBUG: Payload verificado:', payload)
    } catch {
        throw createError({
            statusCode: 401,
            statusMessage: 'Token inválido ou expirado.'
        })
    }

    // ✅ RESTAURADO: Padrão do backend (roleLevel)
    const userLevel = payload.roleLevel
    console.log('DEBUG: Nível do usuário recebido do token:', userLevel)

    if (userLevel < MIN_ACCESS_LEVEL) {
        console.warn(`DEBUG: Acesso negado. Usuário Nível ${userLevel} tentou acessar rota Nível ${MIN_ACCESS_LEVEL}.`)
        throw createError({
            statusCode: 403,
            statusMessage: 'Acesso negado. Usuário não possui Nível 2 ou superior.'
        })
    }

    // ----------- Continuação da lógica original (mantida sem alterações) -----------

    const { codigo } = body

    if (typeof codigo !== 'string' || codigo.length < 50) {
        console.warn('DEBUG: Falha na validação do código PIX. Tamanho:', codigo.length)
        throw createError({ statusCode: 400, statusMessage: 'Código PIX inválido. Deve ser uma string de texto longa.' })
    }

    try {
        const newCode = await prisma.pixCopiaColaEstatico.create({
            data: {
                codigo: codigo,
                valorInformado: null,
                status: 'ATIVO',
            }
        })

        const simulatedSql = `INSERT INTO PixCopiaColaEstatico (codigo, status, valorInformado) VALUES ('${codigo.substring(0, 50)}...', 'ATIVO', NULL);`
        console.log('DEBUG: Operação Simulada (SQL):', simulatedSql)

        console.log(`DEBUG: Código PIX criado com sucesso. ID: ${newCode.id}`)

        return { message: 'Código PIX estático adicionado com sucesso.', id: newCode.id }

    } catch (error: any) {
        console.error('🚨 ERRO FATAL NO PRISMA/DB 🚨')
        console.error('ERRO INTERNO AO CRIAR CÓDIGO PIX:', error.message || error)

        if (error.code === 'P2002') {
            throw createError({ statusCode: 409, statusMessage: 'Este código PIX (copia e cola) já existe na base.' })
        }
        if (error.code === 'P2003') {
            throw createError({ statusCode: 400, statusMessage: 'Falha na Foreign Key: Chave relacionada ausente ou inválida.' })
        }

        throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor ao salvar o código PIX.' })
    }
})

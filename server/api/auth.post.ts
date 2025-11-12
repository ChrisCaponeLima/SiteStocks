// /server/api/auth.post.ts - V2.13 - Inclusão do setCookie(HttpOnly) sem alterar lógica existente

import { defineEventHandler, readBody, createError, setCookie } from 'h3'
import bcrypt from 'bcryptjs'
import { signToken } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'

interface LoginBody {
  cpf: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const { cpf, password } = body

  if (!cpf || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CPF e senha são obrigatórios.'
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { cpf },
      include: {
        cotista: {
          select: {
            id: true,
            numeroDaConta: true,
            dataCriacao: true,
          }
        },
        role: {
          select: {
            name: true,
            level: true
          }
        }
      },
    })

    // Senha incorreta OU usuário inexistente
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError({
        statusCode: 401,
        statusMessage: 'CPF ou senha inválidos.'
      })
    }

    const numeroDaContaString =
      user.cotista?.numeroDaConta !== null && user.cotista?.numeroDaConta !== undefined
        ? String(user.cotista.numeroDaConta)
        : null

    const jwtPayload = {
      userId: user.id,
      role: user.role?.name || 'cotista',
      roleLevel: user.role?.level || 0,
      cotistaId: user.cotista?.id || null,
      cotistaDataCriacao: user.cotista?.dataCriacao?.toISOString() || null,
    }

    const token = signToken(jwtPayload)

    // ✅ CRÍTICO: criação do cookie HttpOnly (faltava)
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return {
      token,
      userId: user.id,
      cpf: user.cpf,
      nome: user.nome,
      sobrenome: user.sobrenome,
      email: user.email,
      telefone: user.telefone,
      roleName: user.role?.name || 'cotista',
      roleLevel: user.role?.level || 0,
      cotistaId: user.cotista?.id ? String(user.cotista.id) : null,
      numeroDaConta: numeroDaContaString,
      cotistaDataCriacao: user.cotista?.dataCriacao?.toISOString() || null,
    }

  } catch (error) {
    console.error('Erro no login:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor durante o login.',
    })
  }
})

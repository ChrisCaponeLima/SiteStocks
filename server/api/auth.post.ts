// /server/api/auth.post.ts - V2.15 - Correção: sem top-level await, compatível com ES2019 + bcrypt dinâmico
import { defineEventHandler, readBody, createError, setCookie } from 'h3'
import { signToken } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'

let bcrypt: any
;(async () => {
  try {
    bcrypt = (await import('bcrypt')).default
  } catch {
    bcrypt = (await import('bcryptjs')).default
  }
})()

interface LoginBody {
  cpf: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const { cpf, password } = body

  if (!cpf || !password) {
    throw createError({ statusCode: 400, message: 'CPF e senha são obrigatórios.' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { cpf },
      include: {
        cotista: { select: { id: true, numeroDaConta: true, dataCriacao: true } },
        role: { select: { name: true, level: true } },
      },
    })

    if (!user) {
      throw createError({ statusCode: 401, message: 'CPF ou senha inválidos.' })
    }

    if (!bcrypt) {
      throw createError({ statusCode: 500, message: 'Módulo bcrypt não carregado corretamente.' })
    }

    const senhaCorreta = await bcrypt.compare(password, user.password)
    if (!senhaCorreta) {
      throw createError({ statusCode: 401, message: 'CPF ou senha inválidos.' })
    }

    const numeroDaContaString =
      user.cotista?.numeroDaConta ? String(user.cotista.numeroDaConta) : null

    const jwtPayload = {
      userId: user.id,
      role: user.role?.name || 'cotista',
      roleLevel: user.role?.level || 0,
      cotistaId: user.cotista?.id || null,
      cotistaDataCriacao: user.cotista?.dataCriacao?.toISOString() || null,
    }

    const token = signToken(jwtPayload)

    // Criação segura do cookie HttpOnly
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 dia
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
  } catch (error: any) {
    console.error('Erro no login:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro interno do servidor durante o login.',
    })
  }
})

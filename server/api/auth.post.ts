// /server/api/auth.post.ts - V2.12 - CORREÇÃO CRÍTICA DE FALHA: Retornando ao formato de resposta PLANO (sem aninhamento em 'user') para restaurar a estabilidade do cliente HTTP e corrigindo o mapeamento no Store.
// Anteriormente: V2.11 - Aninhamento dos dados do usuário sob a chave 'user', o que causou falha no cliente.

import { defineEventHandler, readBody, createError } from 'h3'
import { compare } from 'bcrypt'
import { signToken } from '~/server/utils/auth' // Função para assinar o JWT
import { prisma } from '~/server/utils/db' // Instância do Prisma singleton

// Tipo auxiliar para o corpo da requisição de login
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
   statusMessage: 'CPF e senha são obrigatórios.',
   statusMessage: 'CPF e senha são obrigatórios.',
  })
 }

 try {
  // Buscar o usuário com seus detalhes de cotista e role
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

  if (!user || !(await compare(password, user.password))) {
   throw createError({
    statusCode: 401,
    statusMessage: 'CPF ou senha inválidos.',
   })
  }

  // Prepara o valor do numeroDaConta.
    const numeroDaContaString = user.cotista?.numeroDaConta !== null && user.cotista?.numeroDaConta !== undefined 
        ? String(user.cotista.numeroDaConta) 
        : null;

  // Prepare o payload do JWT com os dados necessários
  const jwtPayload = {
   userId: user.id,
   role: user.role?.name || 'cotista', 
   roleLevel: user.role?.level || 0, 
   cotistaId: user.cotista?.id || null, 
   cotistaDataCriacao: user.cotista?.dataCriacao?.toISOString() || null, 
  }
  const token = signToken(jwtPayload)

  // ✅ CRÍTICO: Retorna os dados do usuário e o token no formato PLANO (root)
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
   // ✅ 'numeroDaConta' no nível raiz
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
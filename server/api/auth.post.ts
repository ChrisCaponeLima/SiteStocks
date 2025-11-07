// /server/api/auth.post.ts - V2.5 - CORREÇÃO CRÍTICA: Foco total na serialização de saída (IDs para String) para evitar falha no retorno.
import { defineEventHandler, readBody, createError } from 'h3';
import { usePrisma } from '~/server/utils/prisma'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
const prisma = usePrisma(); 
    
try {
 console.log('\n--- DEBUG INÍCIO /api/auth ---');
 const { cpf, password } = await readBody(event);

 if (!cpf || !password) {
 throw createError({ statusCode: 400, statusMessage: 'CPF e senha são obrigatórios.' });
 }
  console.log(`DEBUG: Requisição para CPF: ${cpf}`);

 const user = await prisma.user.findFirst({
 where: {
  cpf: { 
  equals: cpf, 
  mode: 'insensitive',
  },
 },
   include: {
     role: {
       select: { level: true, name: true }
     }
   }
 });

 if (!user) {
 console.log('DEBUG: Usuário não encontrado no DB.');
 throw createError({ statusCode: 401, statusMessage: 'Credenciais inválidas.' });
 }
 console.log('DEBUG: Usuário encontrado:', { id: user.id, cpf: user.cpf, email: user.email, role: user.role });
  
  // LOGS DE DEBUG DE SENHA
  // const isMatch = await bcrypt.compare(password, user.password); 
  // console.log(`DEBUG: Senha fornecida (primeiros 5): ${password.substring(0,5)}...`);
  // console.log(`DEBUG: Senha hash no DB (primeiros 10): ${user.password.substring(0,10)}...`);

  const isMatch = await bcrypt.compare(password, user.password); 
 if (!isMatch) {
 console.log('DEBUG: bcrypt.compare retornou FALSE. Senha não corresponde.');
 throw createError({ statusCode: 401, statusMessage: 'Credenciais inválidas.' });
 }
 console.log('DEBUG: bcrypt.compare retornou TRUE. Senha correta.');

  // ATUALIZAÇÃO DO CAMPO ULTIMO_ACESSO
  console.log('DEBUG: Tentando atualizar ultimoAcesso...');
  await prisma.user.update({
    where: { id: user.id },
    data: { ultimoAcesso: new Date() },
  });
  console.log('DEBUG: ultimoAcesso atualizado com sucesso.');

  // GERAÇÃO DO TOKEN JWT
  console.log('DEBUG: Gerando token JWT...');
 const token = jwt.sign(
 { userId: user.id, roleLevel: user.role.level }, 
 process.env.JWT_SECRET || 'fallback_secret_NAO_USAR_EM_PRODUCAO',
 { expiresIn: '1d' }
 );
 console.log('DEBUG: Token JWT gerado.');

 console.log('DEBUG: Retornando payload de sucesso...');
  
 // V2.5 - CRÍTICO: Construindo o objeto de retorno explicitamente com conversão de tipos (IDs para string).
 return {
 token,
 userId: String(user.id), // ID de usuário como string (para BigInt/tipagem)
 cpf: user.cpf, 
 nome: user.nome, 
 sobrenome: user.sobrenome,
 email: user.email,
 roleLevel: user.role.level, 
 roleName: user.role.name,
 cotistaId: user.cotistaId ? String(user.cotistaId) : null, // ID de cotista como string ou null
 };

} catch (e: any) {
 console.error('\n--- DEBUG ERRO FINAL /api/auth ---');
 console.error('API Auth Error:', e);
 if (e.statusCode === 401 || e.statusCode === 400) {
  throw e;
 }
 // Se chegou aqui, é um erro interno do servidor na serialização
 throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor. Falha na serialização da resposta.' });
}
});
// /server/middleware/01.auth.ts - V1.3 - FIX: CRON totalmente isolado da autenticação
import { defineEventHandler, getHeader, parseCookies } from 'h3'
import { verifyToken, AuthPayload } from '../utils/auth' 

declare module 'h3' {
  interface H3EventContext {
    user?: AuthPayload;
  }
}

export default defineEventHandler(async (event) => {

  const path = event.path;

  // 1️⃣ WHITELIST ABSOLUTO — nenhuma autenticação deve rodar aqui
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/savings/boxes/process-earnings' // <-- ROTA DE CRON
  ];

  // IMPORTANTE: usar igualdade de prefixo correta
  if (publicPaths.some(p => path.startsWith(p))) {
    return; // ❗ NADA abaixo será executado
  }

  // 2️⃣ Lê o cookie de autenticação
  const cookies = parseCookies(event);
  const token = cookies.auth_token;

  if (!token) {
    event.context.user = undefined;
    return; // Deixa as rotas protegidas decidirem (assertAdminPermission)
  }

  try {
    const payload = verifyToken(token);
    event.context.user = payload;
  } catch (error) {
    console.warn('[AUTH MIDDLEWARE] Token inválido/expirado.');
    event.context.user = undefined;
  }
});

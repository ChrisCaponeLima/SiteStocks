// /server/middleware/01.auth.ts - V1.3 - WHITELIST ROBUSTO DO CRON

import { defineEventHandler, parseCookies } from 'h3'
import { verifyToken, AuthPayload } from '../utils/auth' 

// --- TIPAGEM DO CONTEXTO PARA TYPESCRIPT ---
declare module 'h3' {
  interface H3EventContext {
    user?: AuthPayload;
  }
}
// --------------------------------------------

export default defineEventHandler(async (event) => {

  // 🔐 ROTAS PÚBLICAS (NÃO EXIGEM JWT)
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
  ];

  const path = event.path;

  // 🚨 WHITELIST ROBUSTO DO CRON
  if (path.includes('process-earnings')) {
    return; // Não exige cookie JWT
  }

  if (publicPaths.some(p => path.startsWith(p))) {
    return;
  }

  // 🔐 AUTENTICAÇÃO POR COOKIE JWT
  const cookies = parseCookies(event);
  const token = cookies.auth_token;

  if (token) {
    try {
      const payload: AuthPayload = verifyToken(token);

      // 🔑 Injeta o usuário no contexto
      event.context.user = payload;

    } catch (error) {
      console.warn('Token no cookie, mas inválido/expirado.');
    }
  }
});

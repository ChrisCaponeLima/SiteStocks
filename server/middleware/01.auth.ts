// /server/middleware/01.auth.ts - V1.1 - CORREÇÃO CRÍTICA: Lê o token do Cookie 'auth_token' em vez do cabeçalho 'Authorization'.

import { defineEventHandler, getHeader, parseCookies } from 'h3' // Adiciona parseCookies
import { verifyToken, AuthPayload } from '../utils/auth' 

// --- NECESSÁRIO PARA QUE O TYPESCRIPT FUNCIONE CORRETAMENTE NO LADO DO SERVIDOR ---
declare module 'h3' {
    interface H3EventContext {
        user?: AuthPayload;
    }
}
// --- FIM TYPESCRIPT ---

export default defineEventHandler(async (event) => {
    // 1. Define as rotas que não precisam de autenticação (públicas)
    const publicPaths = ['/api/auth/login', '/api/auth/register'];
    const path = event.path;
    
    if (publicPaths.some(p => path.startsWith(p))) {
        return;
    }
    
    // 2. 🛑 CORREÇÃO: Lê o token do Cookie 'auth_token'
    const cookies = parseCookies(event);
    const token = cookies.auth_token; // Assume que o nome do cookie é 'auth_token'
    
    if (token) {
        try {
            const payload: AuthPayload = verifyToken(token);
            
            // 3. 🔑 INJEÇÃO CRÍTICA: Anexa o usuário ao contexto do evento
            event.context.user = payload; 
            
        } catch (error) {
            // Se o token for inválido/expirado, apenas evita injetar o usuário.
            // A rota protegida (assertAdminPermission) fará o resto (lançar 403).
            console.warn('Token encontrado no Cookie, mas inválido/expirado para rota protegida.');
        }
    }
})
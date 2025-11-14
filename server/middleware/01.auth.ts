// /server/middleware/01.auth.ts - V1.3 - CRON FIX + Cookie JWT + Context User

import { defineEventHandler, getHeader, parseCookies } from "h3";
import { verifyToken, AuthPayload } from "../utils/auth";

declare module "h3" {
  interface H3EventContext {
    user?: AuthPayload;
  }
}

export default defineEventHandler(async (event) => {

  // ---------------------------------------------------------
  // ✅ 1. Whitelist da rota CRON (POST)
  // ---------------------------------------------------------
  const isCronRoute =
    event.path === "/api/savings/boxes/process-earnings" &&
    event.node.req.method === "POST";

  if (isCronRoute) {
    return; // O próprio handler faz a autenticação via chave secreta
  }

  // ---------------------------------------------------------
  // 2. ROTAS PÚBLICAS NORMAIS
  // ---------------------------------------------------------
  const publicPaths = ["/api/auth/login", "/api/auth/register"];
  if (publicPaths.some((p) => event.path.startsWith(p))) {
    return;
  }

  // ---------------------------------------------------------
  // 3. Autenticação normal por COOKIE JWT
  // ---------------------------------------------------------
  const cookies = parseCookies(event);
  const token = cookies.auth_token;

  if (!token) {
    return; // apenas deixa sem contexto.user — rota protegida tratará
  }

  try {
    const payload = verifyToken(token);
    event.context.user = payload;
  } catch (err) {
    console.warn("[AUTH] Cookie auth_token inválido ou expirado.");
    // Não lança erro — quem decidirá é a rota administrativa
  }
});

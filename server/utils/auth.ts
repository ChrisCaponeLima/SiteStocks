// /server/utils/auth.ts - V2.0 - Padronização do AuthPayload para roleLevel (numérico)
import jwt from 'jsonwebtoken';
import { H3Event, createError, getHeader } from 'h3'; 
import bcrypt from 'bcryptjs';

// Tipo de payload JWT
interface AuthPayload {
  userId: number;
  // 🚨 CORREÇÃO: Padronizado para 'roleLevel' conforme o restante do sistema (numérico)
  roleLevel: number; 
  cotistaId: number | null; // Adicionamos o cotistaId para uso no payload
}

// Chave secreta e configurações
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_NAO_USAR_EM_PRODUCAO';
const SALT_ROUNDS = 10; 

// --- FUNÇÕES BCrypt (Hash de Senhas) ---

/**
* Cria o hash da senha usando BCrypt.
*/
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
* Verifica se a senha fornecida corresponde ao hash armazenado.
*/
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash); 
}

// --- FUNÇÕES JWT (Tokens de Sessão) ---

/**
* Verifica e decodifica um token JWT (string pura).
* @param token O token JWT (sem o prefixo 'Bearer').
* @returns O payload decodificado.
*/
export const verifyToken = (token: string): AuthPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return payload;
  } catch (e) {
    throw createError({ statusCode: 401, statusMessage: 'Token inválido ou expirado.' });
  }
};

/**
* Cria um novo token JWT.
*/
export const signToken = (payload: AuthPayload): string => {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// --- WRAPPER DE AUTENTICAÇÃO H3 ---

/**
 * Verifica o token JWT no cabeçalho 'Authorization' de um evento H3.
 * É a função de alto nível que as rotas de API devem usar.
 * @param event O evento H3 da requisição.
 * @returns O payload decodificado.
 * @throws 401 Unauthorized se o token for inválido ou ausente.
 */
export const verifyAuthToken = (event: H3Event): AuthPayload => {
    // 1. Obter o token do cabeçalho Authorization
    const token = getHeader(event, 'Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Token de autenticação ausente. Acesso negado.' });
    }
    
    // 2. Chama a função de baixo nível para verificação
    return verifyToken(token); 
};
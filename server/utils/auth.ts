// /server/utils/auth.ts - V2.1 - Adicionado utilitário de autorização para cotistas
import jwt from 'jsonwebtoken';
import { H3Event, createError, getHeader } from 'h3'; 
import bcrypt from 'bcryptjs';
import { ACCESS_LEVEL } from './constants'; // Importar ACCESS_LEVEL

// Tipo de payload JWT
export interface AuthPayload { // Exportar para uso em outros arquivos
  userId: number;
  roleLevel: number; 
  cotistaId: number | null; 
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
    // Log detalhado apenas em ambiente de desenvolvimento para evitar vazar informações
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro de verificação de token:', e);
    }
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

// --- WRAPPER DE AUTENTICAÇÃO E AUTORIZAÇÃO H3 ---

/**
 * Verifica o token JWT no cabeçalho 'Authorization' de um evento H3
 * e valida a autorização para um cotista específico.
 * É a função de alto nível que as rotas de API devem usar para acesso a dados de cotista.
 * @param event O evento H3 da requisição.
 * @param requestedCotistaId O ID do cotista que está sendo solicitado na rota.
 * @returns O payload decodificado se a autenticação e autorização forem bem-sucedidas.
 * @throws 401 Unauthorized se o token for inválido ou ausente.
 * @throws 403 Forbidden se o usuário não tiver permissão para acessar os dados do cotista solicitado.
 */
export const authorizeCotista = (event: H3Event, requestedCotistaId: number): AuthPayload => {
    // 1. Obter o token e verificar (reutiliza verifyToken)
    const token = getHeader(event, 'Authorization')?.replace('Bearer ', '');
    if (!token) {
        throw createError({ statusCode: 401, statusMessage: 'Token de autenticação ausente. Acesso negado.' });
    }
    const payload = verifyToken(token); // Esta função já lança 401 se o token for inválido

    // 2. Lógica de Autorização
    // REQUISITO CRÍTICO DE SEGURANÇA: O cotista só pode acessar SEUS PRÓPRIOS dados (a menos que seja Admin)
    if (
        payload.roleLevel < ACCESS_LEVEL.ADMIN && 
        payload.cotistaId !== requestedCotistaId
    ) { 
        console.warn(`Tentativa de acesso não autorizado ao cotista ${requestedCotistaId} pelo userId ${payload.userId} (cotistaId no token: ${payload.cotistaId}).`);
        throw createError({ statusCode: 403, statusMessage: 'Acesso Proibido. Você só pode acessar seus próprios dados de cotista.' });
    }

    return payload;
};
// /server/utils/getAuthToken.ts - V1.0 - Recupera token JWT de Authorization ou cookie
import { H3Event, getCookie } from 'h3'

export function getAuthToken(event: H3Event): string | null {
  // 1️⃣ Tenta pegar do header Authorization
  const header = event.headers.get('authorization')
  if (header?.startsWith('Bearer ')) {
    return header.split(' ')[1]
  }

  // 2️⃣ Se não houver, tenta pegar do cookie auth_token
  const cookieToken = getCookie(event, 'auth_token')
  if (cookieToken) {
    return cookieToken
  }

  // 3️⃣ Caso nenhum esteja presente
  return null
}

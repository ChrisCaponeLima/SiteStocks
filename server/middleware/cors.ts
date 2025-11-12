// /server/middleware/cors.ts - V1.0 - Libera CORS com suporte a cookies HttpOnly
import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')

  // Permite apenas seu domínio local de desenvolvimento
  if (origin && origin.startsWith('http://localhost:3000')) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Pré-flight
  if (event.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
})

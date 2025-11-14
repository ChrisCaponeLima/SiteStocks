// /plugins/03.api.ts - V2.2 - Seguro: usa runtimeConfig.public.apiBase com normalização
import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import { useAuthStore } from '~/stores/auth'

declare module '#app' {
  interface NuxtApp {
    $api: typeof ofetch
  }
}

/**
 * Normaliza uma base url:
 * - Se for vazio/undefined -> '/api'
 * - Não adiciona '/api' duplicado
 * - Garante que retorno não termine com '/'
 */
function normalizeBase(raw?: string) {
  if (!raw || raw === '') return '/api'
  // Remover trailing slash
  let base = raw.trim().replace(/\/+$/, '')
  // Se base for exatamente 'http(s)://host' -> não acrescenta '/api' (assumimos que caller fornecerá '/api' se desejar)
  // Normal padrão: permitir que public.apiBase já contenha '/api' ou seja '/api'
  return base
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // Preferência: public.apiBase (unificado). Em último caso, servidor/client específicos.
  const publicApiBase = config.public?.apiBase || '/api'
  const serverFallback = config.public?.apiBaseServer || publicApiBase
  const clientFallback = config.public?.apiBaseClient || publicApiBase

  const chosenRaw =
    process.server
      ? serverFallback
      : clientFallback

  const normalized = normalizeBase(chosenRaw)

  // Se a configuração enviada for apenas o host (ex: https://site-stocks.vercel.app),
  // e não conter '/api', queremos usar '/api' como path base para endpoints internos.
  // Portanto, decidimos que se normalized termina com '/api' use como está,
  // senão acrescentamos '/api' automaticamente para manter compatibilidade com chamadas $api('/cotista/...').
  const baseURL =
    normalized.toLowerCase().endsWith('/api') ? normalized : `${normalized}/api`

  // DEBUG TEMP (remover em produção se desejar)
  if (process.dev) {
    // eslint-disable-next-line no-console
    console.log(`[API PLUGIN] baseURL configurada -> ${baseURL} (server: ${process.server})`)
  }

  const apiInstance = ofetch.create({
    baseURL,

    async onRequest({ request, options }) {
      // Apenas no cliente adicionamos manualmente o Authorization (se necessário)
      if (process.client) {
        const tokenCookie = useCookie('auth_token')
        const tokenToUse = tokenCookie.value

        if (process.dev) {
          // eslint-disable-next-line no-console
          console.log(`[API Interceptor] Request: ${request} | token: ${tokenToUse ? 'presente' : 'ausente'}`)
        }

        if (tokenToUse && options.auth !== false) {
          options.headers = options.headers || {}
          ;(options.headers as Record<string, string>).Authorization = `Bearer ${tokenToUse}`
        }
      }
    },

    onResponseError({ request, response, options }) {
      if (process.client) {
        const authStore = useAuthStore()
        const shouldHandleGlobally = (options as any)?._blockResponseError !== true

        if (response?.status === 401 && authStore.isAuthenticated.value && shouldHandleGlobally) {
          // eslint-disable-next-line no-console
          console.warn(`[API Interceptor] Sessão expirada detectada em ${request}. Fazendo logout.`)
          authStore.logout()
          navigateTo('/login', { replace: true })
        }

        if (response?.status === 403 && shouldHandleGlobally) {
          // eslint-disable-next-line no-console
          console.error(`[API Interceptor] Acesso proibido em ${request}.`)
        }
      }
    },
  })

  return {
    provide: {
      api: apiInstance,
    },
  }
})

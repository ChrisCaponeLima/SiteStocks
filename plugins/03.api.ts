// /plugins/03.api.ts - V2.4 - ESTÁVEL PARA VERCEL
// 🔧 Ajustado para:
// 1. Evitar duplicação /api/api
// 2. Suportar ambiente SSR na Vercel
// 3. Usar runtimeConfig corretamente
// 4. Base URL consistente no server/client
// 5. Manter arquitetura JWT via Cookie (Authorization no cliente)

import { ofetch } from 'ofetch'
import { useAuthStore } from '~/stores/auth'

declare module '#app' {
  interface NuxtApp {
    $api: typeof ofetch
  }
}

/**
 * Normaliza baseURL sem duplicar /api
 */
function normalizeBase(raw?: string) {
  if (!raw || raw === '') return '/api'
  let base = raw.trim().replace(/\/+$/, '')
  return base
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // ⚠️ Observação importante:
  // Vercel NÃO monta apiBaseServer/apiBaseClient automaticamente,
  // por isso padronizamos tudo pelo apiBase.
  const baseRaw = config.public.apiBase
  const baseURL = normalizeBase(baseRaw)

  if (process.dev) {
    console.log(`[API PLUGIN] baseURL: ${baseURL} | server=${process.server}`)
  }

  const apiInstance = ofetch.create({
    baseURL,

    async onRequest({ request, options }) {
      if (process.client) {
        const tokenCookie = useCookie('auth_token')
        const token = tokenCookie.value

        if (token && options.auth !== false) {
          options.headers = options.headers || {}
          ;(options.headers as Record<string, string>).Authorization =
            `Bearer ${token}`
        }
      }
    },

    onResponseError({ request, response, options }) {
      if (process.client) {
        const authStore = useAuthStore()
        const global = (options as any)?._blockResponseError !== true

        if (response?.status === 401 && authStore.isAuthenticated.value && global) {
          console.warn(`[API] Sessão expirada em ${request}.`)
          authStore.logout()
          navigateTo('/login', { replace: true })
        }

        if (response?.status === 403 && global) {
          console.error(`[API] Acesso proibido em ${request}`)
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

// /plugins/03.api.ts - V2.1 - Correção CRÍTICA: Restabelece o funcionamento SSR com baseURL dinâmica, mantendo autenticação JWT via Cookie-only.

import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import { useAuthStore } from '~/stores/auth'

declare module '#app' {
  interface NuxtApp {
    $api: typeof ofetch
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // ✅ Define baseURL dinâmica conforme ambiente
  const config = useRuntimeConfig()
  const baseURL =
    process.server
      ? `${config.public.apiBaseServer}/api`
      : `${config.public.apiBaseClient}/api'}`

  // 🔧 Criação da instância autenticada de ofetch
  const apiInstance = ofetch.create({
    baseURL,

    async onRequest({ request, options }) {
      // 🚫 Apenas no cliente adicionamos manualmente o Authorization
      if (process.client) {
        const tokenCookie = useCookie('auth_token')
        const tokenToUse = tokenCookie.value

        console.log(`[API Interceptor] ${request} → Cookie token: ${tokenToUse ? 'presente' : 'ausente'}`)

        if (tokenToUse && options.auth !== false) {
          options.headers = options.headers || {}
          ;(options.headers as Record<string, string>).Authorization = `Bearer ${tokenToUse}`
        } else {
          console.warn(`[API Interceptor] Token ausente ou auth:false para ${request}`)
        }
      }
    },

    onResponseError({ request, response, options }) {
      if (process.client) {
        const authStore = useAuthStore()
        const shouldHandleGlobally = (options as any)._blockResponseError !== true

        if (response?.status === 401 && authStore.isAuthenticated.value && shouldHandleGlobally) {
          console.warn(`[API Interceptor] Sessão expirada detectada em ${request}. Fazendo logout.`)
          authStore.logout()
          navigateTo('/login', { replace: true })
        }

        if (response?.status === 403 && shouldHandleGlobally) {
          console.error(`[API Interceptor] Acesso proibido em ${request}.`)
        }
      }
    },
  })

  // ✅ Injeta como $api global
  return {
    provide: {
      api: apiInstance,
    },
  }
})

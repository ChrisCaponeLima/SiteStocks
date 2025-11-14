// /plugins/03.api.ts - V2.3 - FIX CRÍTICO: Ajuste baseURL para evitar duplicação (/api/api) e suportar NUXT_PUBLIC_API_BASE em produção.
// Fornece $api (ofetch instance) com comportamento SSR-safe e JWT Cookie-only no cliente.
// Comentários detalhados abaixo para os devs replicarem em outros plugins.

import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import { useAuthStore } from '~/stores/auth'

declare module '#app' {
  interface NuxtApp {
    $api: typeof ofetch
  }
}

/**
 * normalizeBase(raw)
 * - Recebe uma string possivelmente vinda de runtimeConfig.public.apiBase*
 * - Garante valor padrão '/api' para dev/local
 * - Remove trailing slash
 * - NÃO adiciona '/api' automaticamente para evitar '/api/api' duplicado
 */
function normalizeBase(raw?: string) {
  if (!raw || raw === '') return '/api'
  return raw.trim().replace(/\/+$/, '')
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // -------------------------------------------------------
  // Escolha da base:
  // - Preferimos uma variável pública única: NUXT_PUBLIC_API_BASE
  // - Temos fallbacks separados para server / client para deploys complexos
  // -------------------------------------------------------
  const publicApiBase = config.public?.apiBase || '/api'
  const serverFallback = config.public?.apiBaseServer || publicApiBase
  const clientFallback = config.public?.apiBaseClient || publicApiBase

  const chosenRaw = process.server ? serverFallback : clientFallback
  const baseURL = normalizeBase(chosenRaw)

  // DEBUG: informa a base escolhida (apenas em dev)
  if (process.dev) {
    // eslint-disable-next-line no-console
    console.log(`[API PLUGIN] baseURL configurada -> ${baseURL} (server: ${process.server})`)
  }

  // Cria instância ofetch
  const apiInstance = ofetch.create({
    baseURL, // base já normalizada

    // onRequest: apenas no cliente adiciona Authorization Bearer via cookie (JWT cookie-only flow)
    async onRequest({ request, options }: { request: Parameters<typeof ofetch>[0]; options: FetchOptions<'json'> }) {
      if (process.client) {
        // Observação: o cookie HTTPOnly não é acessível por JS se realmente for HTTPOnly.
        // Neste projeto usamos cookie com acesso cliente (se necessário). Se cookie for HTTPOnly,
        // o SSR/server encaminha o cookie automaticamente nas requisições server-side.
        const tokenCookie = useCookie('auth_token')
        const tokenToUse = tokenCookie.value

        if (process.dev) {
          // eslint-disable-next-line no-console
          console.log(`[API Interceptor] Request: ${request} | token: ${tokenToUse ? 'presente' : 'ausente'}`)
        }

        // Adiciona Authorization somente se token existir e se options.auth !== false
        if (tokenToUse && options.auth !== false) {
          options.headers = options.headers || {}
          ;(options.headers as Record<string, string>).Authorization = `Bearer ${tokenToUse}`
        }
      } else {
        // No server (SSR), normalmente não adicionamos header Authorization manualmente.
        // O Nitro/Nuxt encaminhará cookies automaticamente para chamadas server->server se necessário.
        // Se quiser forçar envio de cookie em SSR manualmente, faça fetch com headers: { cookie: <value> } a partir de um plugin server-side.
      }
    },

    // onResponseError: tratamento global (apenas client)
    onResponseError({ request, response, options }) {
      if (process.client) {
        const authStore = useAuthStore()
        const shouldHandleGlobally = (options as any)?._blockResponseError !== true

        if (response?.status === 401 && authStore.isAuthenticated.value && shouldHandleGlobally) {
          // sessão expirou -> logout forçado
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

  // Fornece a instância como $api
  return {
    provide: {
      api: apiInstance,
    },
  }
})

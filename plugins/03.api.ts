// /plugins/03.api.ts - V2.4 - Consolidação da V2.3 + Correções para riscos identificados
import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Segurança: validação da baseURL
  const baseURL = config.public.apiBase
  if (!baseURL) {
    console.error('[API Plugin] ERRO CRÍTICO: NUXT_PUBLIC_API_BASE não configurado')
  }

  const api = $fetch.create({
    baseURL,
    onRequest({ options }) {
      const token = useCookie('token').value
      if (token) {
        options.headers = {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`
        }
      }
    },

    onResponse({ response }) {
      // Padronização de retorno futuro se necessário
      return response._data
    },

    onResponseError({ response }) {
      if (response.status === 401) {
        const token = useCookie('token')
        token.value = null
        navigateTo('/login')
      }
    }
  })

  const call = async <T>(url: string, opts?: FetchOptions) => {
    try {
      return await api<T>(url, opts)
    } catch (error: any) {
      console.error('[API ERROR]', error)
      throw error
    }
  }

  return {
    provide: { api, call }
  }
})

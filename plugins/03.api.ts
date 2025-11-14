// /plugins/03.api.ts - V2.0 - Plugin ofetch central: baseURL dinâmico, SSR vs client, tratamento 401/403
import { ofetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import type { NitroFetchRequest, NitroFetchOptions } from 'nitropack'

export type ApiInstance = ReturnType<typeof createApi>

function createApi(base: string) {
  // cria instância ofetch com baseURL configurável
  const api = ofetch.create({
    baseURL: base,
    credentials: 'include', // importante para enviar cookies HttpOnly
    // timeout, headers padrão podem ser adicionados aqui
  })

  // wrapper para lidar com erros e respostas comuns
  async function request<T = any>(url: string, opts?: FetchOptions) {
    try {
      return await api<T>(url, opts as any)
    } catch (err: any) {
      // tratamento global de 401/403
      if (err?.response?.status === 401) {
        // no cliente, podemos redirecionar para login ou emitir evento
        // no SSR, deixe o middleware tratar
        // Exemplo: throw new Error('unauthorized')
      }
      throw err
    }
  }

  return {
    raw: api,
    request,
    get: <T = any>(url: string, opts?: FetchOptions) => request<T>(url, { method: 'GET', ...opts }),
    post: <T = any>(url: string, body?: any, opts?: FetchOptions) =>
      request<T>(url, { method: 'POST', body, ...opts }),
    put: <T = any>(url: string, body?: any, opts?: FetchOptions) =>
      request<T>(url, { method: 'PUT', body, ...opts }),
    delete: <T = any>(url: string, opts?: FetchOptions) =>
      request<T>(url, { method: 'DELETE', ...opts }),
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Determina base dinamicamente:
  // - se NUXT_PUBLIC_API_BASE definido, usa isso
  // - caso contrário, usa '/api' (caminho relativo recomendado para Vercel)
  const runtimeBase = (process?.env?.NUXT_PUBLIC_API_BASE as string) || '/api'

  // Em SSR rodando no server, manter base como relativo '/api' evita chamadas externas desnecessárias.
  // No cliente, base relativa também funciona e resolve para o mesmo domínio do deployment.
  const api = createApi(runtimeBase)

  // Injetar no contexto Nuxt
  nuxtApp.provide('api', api)
  // tipagem: use `const { $api } = useNuxtApp() as { $api: ApiInstance }` quando necessário
})

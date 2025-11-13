// /plugins/auth-init.server.ts - V3.4 - Fix: Garante reidratação SSR → Client sem depender de localStorage
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()

  try {
    // ✅ Captura o cookie real do request SSR
    const event = nuxtApp.ssrContext?.event
    const cookieHeader = event ? event.node.req.headers.cookie : undefined

    // ✅ Requisição ao /me com headers SSR
    const me = await $fetch('/api/auth/me', {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      credentials: 'include',
    })

    // ✅ Preenche a store com os dados do usuário
    authStore.fillAuthStore(me)

    // ✅ NOVO: Garante que o estado do authStore seja serializado no payload SSR → Client
    nuxtApp.payload.state.auth = authStore.$state

  } catch (err: any) {
    console.warn('auth-init.server.ts: falha ao restaurar sessão:', err?.status || err)
    authStore.fillAuthStore(null)
    nuxtApp.payload.state.auth = authStore.$state
  }
})

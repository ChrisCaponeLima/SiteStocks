// /plugins/auth-init.server.ts - V3.2 - Corrige persistência SSR em localhost (injeção manual do cookie)
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()

  try {
    // ✅ Captura o cookie real do request SSR (disponível no contexto do Nitro)
    const event = nuxtApp.ssrContext?.event
    const cookieHeader = event ? event.node.req.headers.cookie : undefined

    // 🔒 Garante envio do cookie mesmo em SSR local (onde fetch ignora por padrão)
    const me = await $fetch('/api/auth/me', {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      credentials: 'include',
    })

    authStore.fillAuthStore(me)
  } catch (err: any) {
    console.warn('auth-init.server.ts: falha ao restaurar sessão:', err?.status || err)
    authStore.fillAuthStore(null)
  }
})

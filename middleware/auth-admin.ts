// /middleware/auth-admin.ts - V2.0
// Middleware mínimo: somente valida nível no CLIENTE após hidratação.
// O layout já garantiu que o usuário está autenticado e a store populada.

import { useAuthStore } from '~/stores/auth'

const MIN_REQUIRED_LEVEL = 2

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // ✅ Somente no CLIENTE, quando a store já está hidratada.
  if (process.client) {
    if (!authStore.hasAccess(MIN_REQUIRED_LEVEL)) {
      console.warn(
        `Bloqueado: nível mínimo ${MIN_REQUIRED_LEVEL}, atual ${authStore.userLevel}.`
      )
      return navigateTo('/')
    }
  }

  // SSR: layout já faz a verificação. Middleware não faz nada.
})

// /middleware/auth-level1.ts - V2.0
// Middleware mínimo: somente valida nível no CLIENTE após hidratação.

import { useAuthStore } from '~/stores/auth'

const MIN_REQUIRED_LEVEL = 1

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  if (process.client) {
    if (!authStore.hasAccess(MIN_REQUIRED_LEVEL)) {
      console.warn(
        `Bloqueado: nível mínimo ${MIN_REQUIRED_LEVEL}, atual ${authStore.userLevel}.`
      )
      return navigateTo('/')
    }
  }

  // SSR: ignorado porque o layout já faz o gate de autenticação.
})

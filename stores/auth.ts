// /stores/auth.ts - V8.1 - Corrigido: reidratação SSR pura
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  id: number
  nome: string
  sobrenome: string
  email: string
  roleLevel: number
  roleName: string
  numeroDaConta: string | null
}
interface AuthPayload {
  user: AuthUser
  cotistaId: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const cotistaId = ref<number | null>(null)
  const numeroDaConta = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const userLevel = computed(() => user.value?.roleLevel ?? 0)
  const isAdmin = computed(() => userLevel.value >= 2)
  const hasAccess = (lvl: number) => userLevel.value >= lvl

  function fillAuthStore(payload: AuthPayload | null) {
    if (!payload || !payload.user) {
      user.value = null
      cotistaId.value = null
      numeroDaConta.value = null
      return
    }

    user.value = payload.user
    cotistaId.value = payload.cotistaId ?? null
    numeroDaConta.value = payload.user.numeroDaConta ?? null
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    user.value = null
    cotistaId.value = null
    numeroDaConta.value = null
  }

  return {
    user,
    cotistaId,
    numeroDaConta,
    isAuthenticated,
    userLevel,
    isAdmin,
    hasAccess,
    fillAuthStore,
    logout,
  }
})

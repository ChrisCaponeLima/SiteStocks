// /stores/auth.ts - V8.0 - Arquitetura SSR + Cookie HTTP-only + Zero LocalStorage
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tipagem padronizada do payload vindo EXCLUSIVAMENTE de /api/auth/me
// Este é o ÚNICO formato esperado em toda a aplicação.
interface AuthMeUser {
  id: number
  nome: string
  sobrenome: string
  email: string
  roleLevel: number
  roleName: string
  numeroDaConta: string | null
}

interface AuthMePayload {
  user: AuthMeUser
  cotistaId: number | null
}

export const useAuthStore = defineStore('auth', () => {

  // --------------------------------------------------------------------------------
  // ESTADO PRINCIPAL
  // --------------------------------------------------------------------------------

  const user = ref<AuthMeUser | null>(null)

  // cotistaId é armazenado separadamente para evitar dependência circular no user
  const _cotistaId = ref<number | null>(null)
  const cotistaId = computed(() => _cotistaId.value)

  // sempre string ou null
  const numeroDaConta = ref<string | null>(null)

  const lastLoginPayload = ref<any | null>(null) // somente para debug opcional


  // --------------------------------------------------------------------------------
  // DERIVADOS SEGUROS (computed)
  // --------------------------------------------------------------------------------

  // Autenticado = user existe. (Cookie HTTP-only garante isso pelo /me)
  const isAuthenticated = computed(() => user.value !== null)

  // Papel de acesso baseado em número (NUNCA por nome)
  const userLevel = computed(() => user.value?.roleLevel ?? 0)

  // Verifica acesso mínimo
  const hasAccess = (requiredLevel: number): boolean => {
    return userLevel.value >= requiredLevel
  }

  // Helper para saber se é Admin (>=2)
  const isAdmin = computed(() => userLevel.value >= 2)


  // --------------------------------------------------------------------------------
  // FUNÇÃO CENTRAL DE PREENCHIMENTO DA STORE
  // --------------------------------------------------------------------------------

  const setUserData = (payload: AuthMePayload | null) => {
    if (!payload || !payload.user || !payload.user.id) {
      // Sessão inválida → limpa tudo
      user.value = null
      _cotistaId.value = null
      numeroDaConta.value = null
      lastLoginPayload.value = null
      return
    }

    // Usuário válido → saneamento completo
    const u = payload.user

    user.value = {
      id: u.id,
      nome: u.nome,
      sobrenome: u.sobrenome,
      email: u.email,
      roleLevel: u.roleLevel,
      roleName: u.roleName,
      numeroDaConta: u.numeroDaConta ?? null,
    }

    // cotistaId precisa ser number OU null
    const parsed =
      typeof payload.cotistaId === 'number' && payload.cotistaId >= 0
        ? payload.cotistaId
        : null

    _cotistaId.value = parsed
    numeroDaConta.value = user.value.numeroDaConta

    lastLoginPayload.value = payload // opcional, não sensível
  }


  // --------------------------------------------------------------------------------
  // API PARA O LAYOUT E PLUGINS USAREM:
  // fillAuthStore(payload)
  // --------------------------------------------------------------------------------

  const fillAuthStore = (payload: AuthMePayload | null) => {
    setUserData(payload)
  }


  // --------------------------------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------------------------------

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Falha ao notificar backend no logout:', e)
    }

    // Limpa estado após remoção do cookie no servidor
    user.value = null
    _cotistaId.value = null
    numeroDaConta.value = null
    lastLoginPayload.value = null
  }


  // --------------------------------------------------------------------------------
  // EXPORTAÇÃO PÚBLICA
  // --------------------------------------------------------------------------------

  return {
    // estado
    user,
    cotistaId,
    numeroDaConta,
    lastLoginPayload,

    // derivados
    isAuthenticated,
    userLevel,
    isAdmin,
    hasAccess,

    // métodos
    setUserData,
    fillAuthStore,
    logout,
  }
})

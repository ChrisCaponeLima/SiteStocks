// /stores/auth.ts - V4.0 - CORREÇÃO CRÍTICA: Remoção do setTimeout/Promise em init() para resolver o erro getActivePinia()
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type AnyUser = Record<string, any>

// Definimos os níveis para fácil referência nos componentes
export const ACCESS_LEVEL = {
COTISTA: 0,
ADMIN: 1,
OWNER: 2,
};

export const useAuthStore = defineStore('auth', () => {
const user = ref<AnyUser | null>(null)
const token = ref<string | null>(null)
const isAuthenticated = ref(false)
const initialized = ref(false)

const cotistaId = ref<number | null>(null)
const userLevel = ref<number>(ACCESS_LEVEL.COTISTA) 

const isCotista = computed(() => userLevel.value >= ACCESS_LEVEL.COTISTA)
const isOwner = computed(() => userLevel.value >= ACCESS_LEVEL.OWNER)
const isAdmin = computed(() => userLevel.value >= ACCESS_LEVEL.ADMIN)

// Função auxiliar para verificar acesso a partir de um nível.
const hasAccess = computed(() => (requiredLevel: number) => {
 return userLevel.value >= requiredLevel;
});

const setUser = (userData: AnyUser) => {
 const normalizedUser: AnyUser = {
 ...userData,
 id: userData.id ?? userData.userId,
 }
 normalizedUser.userId = normalizedUser.id

 user.value = { 
  ...user.value, 
  ...normalizedUser,
 }
 
 if (userData.cotistaId !== undefined) {
  cotistaId.value = userData.cotistaId
 }
 if (userData.roleLevel !== undefined) {
  userLevel.value = userData.roleLevel
 }
 
 if (process.client) {
 localStorage.setItem('authUser', JSON.stringify(user.value))
 localStorage.setItem('authLevel', String(userLevel.value)) 
 if (cotistaId.value !== null) {
  localStorage.setItem('authCotistaId', String(cotistaId.value))
 }
 }
}

const login = (data: { token?: string; user: AnyUser }) => {
 token.value = data.token || null
 const incoming = data.user || {}
 const normalizedUser: AnyUser = {
 ...incoming,
 id: incoming.id ?? incoming.userId,
 }
 normalizedUser.userId = normalizedUser.id

 user.value = normalizedUser
 isAuthenticated.value = true

 cotistaId.value = normalizedUser.cotistaId ?? null
 userLevel.value = normalizedUser.roleLevel ?? ACCESS_LEVEL.COTISTA 

 if (process.client) {
 if (token.value) localStorage.setItem('authToken', token.value)
 localStorage.setItem('authUser', JSON.stringify(user.value))
 localStorage.setItem('authLevel', String(userLevel.value)) 
 if (cotistaId.value !== null) {
  localStorage.setItem('authCotistaId', String(cotistaId.value))
 }
 }
 initialized.value = true
}

const logout = () => {
 token.value = null
 user.value = null
 isAuthenticated.value = false
 
 cotistaId.value = null
 userLevel.value = ACCESS_LEVEL.COTISTA
 
 if (process.client) {
 localStorage.removeItem('authToken')
 localStorage.removeItem('authUser')
 localStorage.removeItem('authCotistaId')
 localStorage.removeItem('authLevel') 
 }
 initialized.value = true
}

 // --------------------------------------------------------------------------------
 // ✅ CORREÇÃO P4.0: Removido o new Promise/setTimeout. 
 // O init agora é síncrono no cliente, eliminando a race condition.
 // --------------------------------------------------------------------------------
const init = async () => {
 if (initialized.value) return
 if (!process.client) {
 initialized.value = true
 return
 }
  
 try {
 const savedToken = localStorage.getItem('authToken')
 const savedUser = localStorage.getItem('authUser')
 const savedCotistaId = localStorage.getItem('authCotistaId')
 const savedLevel = localStorage.getItem('authLevel') 

 if (savedToken && savedUser) {
  token.value = savedToken
  const parsed = JSON.parse(savedUser)
  const normalizedUser: AnyUser = {
  ...parsed,
  id: parsed.id ?? parsed.userId,
  }
  normalizedUser.userId = normalizedUser.id
  user.value = normalizedUser
  isAuthenticated.value = true
  
  cotistaId.value = savedCotistaId ? Number(savedCotistaId) : null
  userLevel.value = savedLevel ? Number(savedLevel) : ACCESS_LEVEL.COTISTA 

 } else {
  token.value = null
  user.value = null
  isAuthenticated.value = false
  cotistaId.value = null
  userLevel.value = ACCESS_LEVEL.COTISTA 
 }
 } catch (err) {
 console.error('auth.init: erro inesperado', err)
 } finally {
 initialized.value = true
 }
}
 // --------------------------------------------------------------------------------

return {
 user,
 token,
 isAuthenticated,
 initialized,
 isAdmin,
 isOwner,
 isCotista,
 userLevel, 
 hasAccess, 
 login,
 logout,
 init,
 setUser,
 ACCESS_LEVEL, 
}
})
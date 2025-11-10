// /middleware/auth-level1.ts - V1.3 - CRÍTICO: Substitui 'abortNavigation' por 'navigateTo' no SSR para prevenir redirecionamento silencioso no F5.
import { useAuthStore } from '~/stores/auth' 

// 🔑 Nível Mínimo Requerido: 1 (Gerente de Contas)
const MIN_REQUIRED_LEVEL = 1 

export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // 1. CRÍTICO: Garante que a store Pinia inicie a hidratação (lendo o Cookie do token)
  await authStore.init() 

  // 2. VERIFICAÇÃO INICIAL DE AUTENTICAÇÃO (TOKEN EXISTE NO COOKIE/REF?)
  if (!authStore.token) {
    if (process.client) {
      authStore.logout() 
      console.warn(`Acesso negado à rota ${to.path}. Token ausente. Redirecionando para login.`)
      return navigateTo('/login?redirect=' + to.fullPath)
    }
    // 🛑 CORREÇÃO CRÍTICA SSR: Redireciona para o login no lado do servidor.
    return navigateTo('/login?redirect=' + to.fullPath)
  }
  
  // 3. VERIFICAÇÃO DE AUTORIZAÇÃO (NÍVEL) - APENAS REDIRECIONAMENTO CLIENTE
  const isAuthorized = authStore.userLevel >= MIN_REQUIRED_LEVEL

  if (process.client && !isAuthorized) {
    // Token existe, mas nível insuficiente (lido do localStorage).
    console.warn(`Acesso negado à rota ${to.path}. Nível ${authStore.userLevel} não é suficiente (Requer Nível ${MIN_REQUIRED_LEVEL}). Redirecionando para dashboard.`)
    return navigateTo('/') 
  }
})
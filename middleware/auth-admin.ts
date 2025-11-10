// /middleware/auth-admin.ts - V1.6 - CRÍTICO: Reforço no uso do ACCESS_LEVEL e token SSR-safe.
import { useAuthStore, ACCESS_LEVEL } from '~/stores/auth' // 🛑 Importa ACCESS_LEVEL

// 🛑 O nível mínimo requerido para acessar esta rota é 2 (Admin).
const MIN_REQUIRED_LEVEL = ACCESS_LEVEL.ADMIN // 🛑 Usa a constante exportada

export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore()

    // 1. CRÍTICO: Garante que a store Pinia inicie a hidratação.
    await authStore.init() 

    // 2. VERIFICAÇÃO INICIAL DE AUTENTICAÇÃO (TOKEN EXISTE NO COOKIE/REF?)
    if (!authStore.token) {
        if (process.client) {
            authStore.logout() 
            console.warn(`Acesso negado à rota ${to.path}. Token ausente. Redirecionando para login.`)
            return navigateTo('/login?redirect=' + to.fullPath)
        }
        // 🛑 CORREÇÃO CRÍTICA SSR: Navega para o login.
        return navigateTo('/login?redirect=' + to.fullPath)
    }
    
    // 3. VERIFICAÇÃO DE AUTORIZAÇÃO (NÍVEL) - AGORA SSR-SAFE
    const isAuthorized = authStore.userLevel >= MIN_REQUIRED_LEVEL // 🛑 userLevel é SSR-safe após V5.7

    if (process.client && !isAuthorized) {
        // Token existe, mas nível insuficiente. Redirecionamento CLIENTE.
        console.warn(`Acesso negado à rota ${to.path}. Nível ${authStore.userLevel} não é suficiente (Requer Nível ${MIN_REQUIRED_LEVEL}). Redirecionando para dashboard.`)
        return navigateTo('/') 
    }
    
    // 4. Se chegou aqui: Prossiga.
})
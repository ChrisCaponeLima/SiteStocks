// /middleware/auth-user.ts - V1.0 - Criação do middleware para autenticação básica (Nível 0).
import { useAuthStore } from '~/stores/auth' 

// 🛑 Nível Mínimo Requerido para esta rota: Nível 0 (qualquer usuário logado)
const MIN_REQUIRED_LEVEL = 0

export default defineNuxtRouteMiddleware(async (to, from) => {
    // ℹ️ Instancia a Store de Autenticação
    const authStore = useAuthStore()

    // 1. CRÍTICO: Garante que a store Pinia inicie a hidratação se ainda não o fez.
    await authStore.init() 

    // 2. Verifica se o usuário tem o nível mínimo de acesso (Nível 0 ou superior).
    const isAuthorized = authStore.userLevel >= MIN_REQUIRED_LEVEL

    // 3. Verifica se o token existe e se a autorização é válida (Nível 0).
    if (!authStore.token || !isAuthorized) {
        
        // Em caso de falha de autenticação/autorização no cliente
        if (process.client) {
            // Limpa o token expirado/inválido para forçar novo login
            authStore.logout() 
            console.warn(`Acesso negado à rota ${to.path}. Usuário não autenticado. Requer Nível ${MIN_REQUIRED_LEVEL}. Redirecionando para login.`)
            // Redireciona para o login com o caminho de retorno
            return navigateTo('/login?redirect=' + to.fullPath)
        }
        
        // No lado do servidor (SSR), retorna a navegação abortada.
        return abortNavigation('Acesso Proibido. Requer autenticação.')
    }

    // Se a store estiver inicializada e o usuário for Nível 0 ou superior, a navegação prossegue.
})
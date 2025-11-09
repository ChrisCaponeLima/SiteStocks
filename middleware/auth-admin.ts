// /middleware/auth-admin.ts - V1.2 - CORREÇÃO: Define o Nível Mínimo Requerido para acesso a esta rota como 2, conforme solicitado pelo cliente.
import { useAuthStore } from '~/stores/auth' 

// 🛑 ALTERAÇÃO CRÍTICA V1.2: O nível mínimo requerido para acessar esta rota é 2.
const MIN_REQUIRED_LEVEL = 2

export default defineNuxtRouteMiddleware(async (to, from) => {
    // É crucial ter certeza que a store foi inicializada e hidratada, especialmente em rotas protegidas.
    const authStore = useAuthStore()

    // 1. CRÍTICO: Garante que a store Pinia inicie a hidratação se ainda não o fez.
    await authStore.init() 

    // 2. Verifica se o usuário tem o nível mínimo de acesso (Nível 2 ou superior).
    const isAuthorized = authStore.userLevel >= MIN_REQUIRED_LEVEL

    // 3. Verifica se o token existe e se a autorização é válida.
    if (!authStore.token || !isAuthorized) {
        
        // Em caso de falha de autenticação/autorização no cliente
        if (process.client) {
            // Limpa o token expirado/inválido para forçar novo login
            authStore.logout() 
            console.warn(`Acesso negado à rota ${to.path}. Nível ${authStore.userLevel} não é suficiente (Requer Nível ${MIN_REQUIRED_LEVEL}). Redirecionando para login.`)
            // Redireciona para o login com o caminho de retorno
            return navigateTo('/login?redirect=' + to.fullPath)
        }
        
        // No lado do servidor (SSR), retorna a navegação abortada.
        return abortNavigation('Acesso Proibido. Nível de permissão não atingido.')
    }

    // Se a store estiver inicializada e o nível for Nível 2 ou superior, a navegação prossegue.
})
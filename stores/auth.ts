// /stores/auth.ts - V4.9 - CORREÇÃO CRÍTICA: Garantia de que a função `init` é aguardável (awaitable) para que o middleware de rotas funcione corretamente, lendo o `userLevel` antes de prosseguir.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type AnyUser = Record<string, any>
// ✅ NOVO: Definição do tipo da resposta da API de login no formato PLANO
type ApiAuthResponse = {
    token: string,
    userId: number,
    cpf: string,
    nome: string,
    sobrenome: string,
    email: string,
    telefone: string,
    roleLevel: number,
    roleName: string,
    cotistaId: string | null,
    numeroDaConta: string | null, 
    cotistaDataCriacao: string | null,
}

// Definimos os níveis para fácil referência nos componentes
export const ACCESS_LEVEL = {
    COTISTA: 0,
    GERENTE: 1,
    ADMIN: 2,
    OWNER: 3,
};

export const useAuthStore = defineStore('auth', () => {
    const user = ref<AnyUser | null>(null)
    const token = ref<string | null>(null)
    const isAuthenticated = ref(false)
    const initialized = ref(false)

    const cotistaId = ref<number | null>(null)
    const userLevel = ref<number>(ACCESS_LEVEL.COTISTA) 
    const numeroDaConta = ref<string | null>(null) 

    // ✅ Propriedade para armazenar o último payload de login para debug
    const lastLoginPayload = ref<any | null>(null);

    const isCotista = computed(() => userLevel.value >= ACCESS_LEVEL.COTISTA)
    const isOwner = computed(() => userLevel.value >= ACCESS_LEVEL.OWNER)
    const isAdmin = computed(() => userLevel.value >= ACCESS_LEVEL.ADMIN)

    // Função auxiliar para verificar acesso a partir de um nível.
    const hasAccess = computed(() => (requiredLevel: number) => {
        return userLevel.value >= requiredLevel;
    });

    const setUser = (userData: AnyUser) => {
        // [Conteúdo do setUser mantido igual ao V4.5]
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
        if (userData.numeroDaConta !== undefined) {
            numeroDaConta.value = userData.numeroDaConta
        }

        if (process.client) {
            localStorage.setItem('authUser', JSON.stringify(user.value))
            localStorage.setItem('authLevel', String(userLevel.value)) 
            if (cotistaId.value !== null) {
                localStorage.setItem('authCotistaId', String(cotistaId.value))
            }
            if (numeroDaConta.value !== null) {
                localStorage.setItem('authNumeroDaConta', numeroDaConta.value)
            }
        }
    }

    // ✅ CRÍTICO: Função `login` agora assume que 'data' é o objeto de resposta PLANO da API
    const login = (data: ApiAuthResponse) => {
        // ✅ Armazenar o payload completo para debug e persistir no localStorage
        lastLoginPayload.value = data; 
        if (process.client) {
            localStorage.setItem('debugLastLoginPayload', JSON.stringify(data));
        }

        token.value = data.token || null
        
        // ✅ CRÍTICO: Mapeamento dos dados da resposta PLANO da API para o objeto `user` do store.
        // As propriedades são lidas diretamente de `data` (o objeto de resposta da API no root)
        user.value = {
            id: data.userId, 
            userId: data.userId,
            cpf: data.cpf,
            nome: data.nome,
            sobrenome: data.sobrenome,
            email: data.email,
            telefone: data.telefone,
            roleLevel: data.roleLevel,
            roleName: data.roleName,
            cotistaId: data.cotistaId,
            numeroDaConta: data.numeroDaConta, // ✅ Lendo numeroDaConta diretamente do root da resposta da API
        }
        isAuthenticated.value = true

        cotistaId.value = data.cotistaId ? Number(data.cotistaId) : null 
        userLevel.value = data.roleLevel ?? ACCESS_LEVEL.COTISTA 
        numeroDaConta.value = data.numeroDaConta ?? null // ✅ Lendo numeroDaConta diretamente do root da resposta da API

        if (process.client) {
            if (token.value) localStorage.setItem('authToken', token.value)
            
            // Persistindo o objeto user completo
            localStorage.setItem('authUser', JSON.stringify(user.value))
            
            localStorage.setItem('authLevel', String(userLevel.value)) 
            if (cotistaId.value !== null) {
                localStorage.setItem('authCotistaId', String(cotistaId.value))
            }
            if (numeroDaConta.value !== null) {
                localStorage.setItem('authNumeroDaConta', numeroDaConta.value)
            }
        }
        initialized.value = true
    }

    const logout = () => {
        // [Conteúdo do logout mantido]
        token.value = null
        user.value = null
        isAuthenticated.value = false

        cotistaId.value = null
        userLevel.value = ACCESS_LEVEL.COTISTA
        numeroDaConta.value = null
        lastLoginPayload.value = null;
        if (process.client) {
            localStorage.removeItem('debugLastLoginPayload');
        }

        if (process.client) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('authUser')
            localStorage.removeItem('authCotistaId')
            localStorage.removeItem('authLevel') 
            localStorage.removeItem('authNumeroDaConta')
        }
        initialized.value = true
    }

    const init = async () => {
        // ✅ COMO ESTAVA: if (initialized.value) return
        // ✅ COMO ESTÁ: Garante que o retorno é uma Promise resolvida
        if (initialized.value) return Promise.resolve() 
        
        if (!process.client) {
            initialized.value = true
            return Promise.resolve() // ✅ Garante que o SSR também resolve a Promise
        }
         
        try {
            const savedToken = localStorage.getItem('authToken')
            const savedUser = localStorage.getItem('authUser')
            const savedCotistaId = localStorage.getItem('authCotistaId')
            const savedLevel = localStorage.getItem('authLevel') 
            const savedNumeroDaConta = localStorage.getItem('authNumeroDaConta')
            const savedDebugPayload = localStorage.getItem('debugLastLoginPayload');
            if (savedDebugPayload) {
                lastLoginPayload.value = JSON.parse(savedDebugPayload);
            }

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
                numeroDaConta.value = savedNumeroDaConta || null

            } else {
                token.value = null
                user.value = null
                isAuthenticated.value = false
                cotistaId.value = null
                userLevel.value = ACCESS_LEVEL.COTISTA 
                numeroDaConta.value = null
            }
        } catch (err) {
            console.error('auth.init: erro inesperado', err)
        } finally {
            initialized.value = true
        }
        
        return Promise.resolve() // ✅ CRÍTICO: Garante que a Promise retorne e o 'await' no middleware possa prosseguir.
    }

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
        cotistaId,
        numeroDaConta, 
        lastLoginPayload,
    }
})
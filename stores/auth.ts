// /stores/auth.ts - V5.3 - CRÍTICO: Persistência de userLevel via Cookie (user_level) para acesso imediato no SSR e correção do cabeçalho.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCookie } from '#app' 

type AnyUser = Record<string, any>
type ApiAuthResponse = {
    // ... (Omitindo tipos para manter a concisão, mas o arquivo real deve conter TUDO)
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

export const ACCESS_LEVEL = {
    COTISTA: 0,
    GERENTE: 1,
    ADMIN: 2,
    OWNER: 3,
};

export const useAuthStore = defineStore('auth', () => {
    
    // 🛑 CRÍTICO 1: Cookie para o token.
    const authToken = useCookie<string | null>('auth_token', { 
        maxAge: 60 * 60 * 24 * 7, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', 
    })
    
    // 🛑 CRÍTICO 2: NOVO Cookie para o nível de acesso (userLevel).
    const authLevel = useCookie<number | null>('user_level', {
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    })

    const token = computed(() => authToken.value)
    
    const user = ref<AnyUser | null>(null)
    const isAuthenticated = ref(false)
    const initialized = ref(false)

    const cotistaId = ref<number | null>(null)
    // 🛑 userLevel agora é inicializado a partir do Cookie OU padrão.
    const userLevel = ref<number>(authLevel.value ?? ACCESS_LEVEL.COTISTA) 
    const numeroDaConta = ref<string | null>(null) 

    const lastLoginPayload = ref<any | null>(null);

    const isCotista = computed(() => userLevel.value >= ACCESS_LEVEL.COTISTA)
    const isOwner = computed(() => userLevel.value >= ACCESS_LEVEL.OWNER)
    const isAdmin = computed(() => userLevel.value >= ACCESS_LEVEL.ADMIN)

    const hasAccess = computed(() => (requiredLevel: number) => {
        return userLevel.value >= requiredLevel;
    });

    const setUser = (userData: AnyUser) => {
        // [Lógica setUser mantida...]
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
        // 🛑 CRÍTICO: setUser/login atualiza o Cookie do nível também.
        if (userData.roleLevel !== undefined) {
            userLevel.value = userData.roleLevel
            authLevel.value = userData.roleLevel // 🛑 NOVO: Define o Cookie de nível
        }
        if (userData.numeroDaConta !== undefined) {
            numeroDaConta.value = userData.numeroDaConta
        }

        if (process.client) {
            localStorage.setItem('authUser', JSON.stringify(user.value))
            // 🛑 REMOVIDO: localStorage.setItem('authLevel', String(userLevel.value)) // Agora está no Cookie
            if (cotistaId.value !== null) {
                localStorage.setItem('authCotistaId', String(cotistaId.value))
            }
            if (numeroDaConta.value !== null) {
                localStorage.setItem('authNumeroDaConta', numeroDaConta.value)
            }
        }
    }

    const login = (data: ApiAuthResponse) => {
        // [Lógica login mantida...]
        lastLoginPayload.value = data; 
        if (process.client) {
            localStorage.setItem('debugLastLoginPayload', JSON.stringify(data));
        }

        // 🛑 Define o token no Cookie.
        authToken.value = data.token || null
        
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
            numeroDaConta: data.numeroDaConta, 
        }
        isAuthenticated.value = true

        cotistaId.value = data.cotistaId ? Number(data.cotistaId) : null 
        userLevel.value = data.roleLevel ?? ACCESS_LEVEL.COTISTA 
        authLevel.value = data.roleLevel ?? ACCESS_LEVEL.COTISTA // 🛑 NOVO: Define o Cookie de nível
        numeroDaConta.value = data.numeroDaConta ?? null

        if (process.client) {
            localStorage.setItem('authUser', JSON.stringify(user.value))
            // 🛑 REMOVIDO: localStorage.removeItem('authLevel')
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
        // 🛑 CRÍTICO: Limpa os Cookies
        authToken.value = null
        authLevel.value = null
        
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
            localStorage.removeItem('authUser')
            localStorage.removeItem('authCotistaId')
            localStorage.removeItem('authLevel') // ⚠️ Se esta linha ainda existir, pode ser removida (já que migramos)
            localStorage.removeItem('authNumeroDaConta')
        }
        initialized.value = true
    }

    const init = async () => {
        if (initialized.value) return Promise.resolve() 
        
        const tokenValue = authToken.value
        
        if (!process.client) {
            // 🛑 CRÍTICO SSR: Se o token existe, define o isAuthenticated E o userLevel.
            if (tokenValue) {
                isAuthenticated.value = true 
                // 🛑 NOVO: Lê o nível do Cookie (user_level), que está na memória do ref.
                // O middleware agora tem o nível para checagem imediata.
                userLevel.value = authLevel.value ?? ACCESS_LEVEL.COTISTA 
            } else {
                userLevel.value = ACCESS_LEVEL.COTISTA // Garante o padrão
            }
            initialized.value = true
            return Promise.resolve() 
        }
        
        // Lógica do lado do Cliente (Hydration)
        try {
            // 🛑 ATENÇÃO: O nível agora é lido primariamente do Cookie (authLevel.value)
            const savedUser = localStorage.getItem('authUser')
            const savedCotistaId = localStorage.getItem('authCotistaId')
            const savedNumeroDaConta = localStorage.getItem('authNumeroDaConta')
            const savedDebugPayload = localStorage.getItem('debugLastLoginPayload');
            
            if (savedDebugPayload) {
                lastLoginPayload.value = JSON.parse(savedDebugPayload);
            }

            if (tokenValue && savedUser) {
                
                const parsed = JSON.parse(savedUser)
                // 🛑 ATENÇÃO: Como o user no localStorage NÃO tem todos os campos (nome/sobrenome/conta)
                // Precisamos garantir que eles estejam ali para o cabeçalho.
                
                const normalizedUser: AnyUser = {
                    ...parsed,
                    id: parsed.id ?? parsed.userId,
                }
                normalizedUser.userId = normalizedUser.id
                user.value = normalizedUser
                isAuthenticated.value = true
                
                cotistaId.value = savedCotistaId ? Number(savedCotistaId) : null
                // 🛑 userLevel lido do Cookie (authLevel.value) ou fallback para o que está no ref (que foi setado pelo Cookie)
                userLevel.value = authLevel.value ?? ACCESS_LEVEL.COTISTA
                numeroDaConta.value = savedNumeroDaConta || null
                
            } else {
                logout() 
            }
        } catch (err) {
            console.error('auth.init: erro inesperado', err)
            logout()
        } finally {
            initialized.value = true
        }
        
        return Promise.resolve() 
    }

    return {
        user,
        token, 
        isAuthenticated,
        initialized,
        isAdmin,
        isOwner,
        isCotista,
        userLevel, // 🛑 userLevel agora é SSR-safe.
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
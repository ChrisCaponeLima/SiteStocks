<script setup lang="ts">
import { ref, onMounted } from 'vue'
// 🛑 CRÍTICO: Importa a store para acessar o token.
import { useAuthStore } from '~/stores/auth' 

const { $api } = useNuxtApp(); 

useHead({
    title: 'Debug | Lista de Cotistas',
})

// Tipagem para os dados que vêm da API /api/cotistas (CotistaListItem[])
interface CotistaListItem {
    id: number;
    nomeCompleto: string;
    numeroDaConta: string;
}

const cotistas = ref<CotistaListItem[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const fetchCotistas = async () => {
    isLoading.value = true
    errorMessage.value = ''
    cotistas.value = []
    
    // 🛑 1. Acessa a Store e Garante a Hidratação
    const authStore = useAuthStore() 
    await authStore.init() // Garante que o token do localStorage foi lido.

    const token = authStore.token

    if (!token) {
        errorMessage.value = "Token não encontrado. Por favor, faça login."
        isLoading.value = false
        // Redirecionamento de conveniência em caso de debug:
        // navigateTo('/login')
        return 
    }
    
    try {
        // 🛑 2. Envia o token manualmente no cabeçalho
        const response = await $api<CotistaListItem[]>('/api/cotistas', {
             headers: {
                Authorization: `Bearer ${token}`
            }
        }) 
        cotistas.value = response
    } catch (e: any) {
        console.error('Erro ao buscar lista de cotistas (Debug):', e)
        
        // Formatação de mensagem de erro
        errorMessage.value = `Erro: ${e.response?.status} - ${e.data?.statusMessage || e.message || 'Erro de comunicação.'}`
        
        if (e.response?.status === 403) {
             errorMessage.value += " (Acesso Proibido. Verifique se o seu 'roleLevel' é >= 2)."
        } else if (e.response?.status === 401) {
             errorMessage.value += " (Token rejeitado. Tente fazer logout/login)."
        }
        
    } finally {
        isLoading.value = false
    }
}

// Chamar o fetch ao montar o componente
onMounted(fetchCotistas)
</script>

<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">🔍 Debug: Lista de Cotistas (API)</h1>
        
        <button @click="fetchCotistas" :disabled="isLoading" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 mb-6">
            {{ isLoading ? 'Buscando Dados do DB...' : 'Re-executar API /api/cotistas' }}
        </button>

        <div v-if="isLoading && !errorMessage" class="text-indigo-600">
            Carregando lista de cotistas (Checando autenticação e DB)...
        </div>

        <div v-else-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md shadow-md">
            <h2 class="font-bold mb-2">Falha na API:</h2>
            <p>{{ errorMessage }}</p>
            <p v-if="cotistas.length === 0" class="mt-2 text-sm">A lista não foi carregada devido ao erro acima. Verifique se o token é válido.</p>
        </div>

        <div v-else-if="cotistas.length > 0" class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">✅ Lista de Cotistas Carregada (Total: {{ cotistas.length }})</h2>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº da Conta</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="cotista in cotistas" :key="cotista.id">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ cotista.id }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{{ cotista.nomeCompleto }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ cotista.numeroDaConta }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div v-else class="text-gray-500 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            Nenhuma lista de cotistas retornada ou o array está vazio.
        </div>
    </div>
</template>

<style scoped>
/* Estilos Tailwind CSS */
</style>
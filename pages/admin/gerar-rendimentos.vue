// /pages/admin/gerar-rendimentos.vue - V9.4 - Correção Crítica do Parser: Remoção da string HTML do comentário inicial e garantia de quebras de linha estritas no template para resolver o erro de tag inválida persistente.

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth' 

useHead({
    title: 'Admin | Gerar Rendimentos Customizados',
})

// ✅ Mantém o middleware de proteção
definePageMeta({
    middleware: ['auth-admin']
})

// Tipagem para os dados que vêm da API /api/cotistas (inalterada)
interface CotistaApiItem {
    id: number;
    nomeCompleto: string;
    numeroDaConta: string;
}

// Tipagem para o estado reativo (Cotistas) (inalterada)
interface CotistaStateItem {
    id: number;
    nome: string;
    conta: string;
}

// --- VARIÁVEIS DE ESTADO E LÓGICA DO FORMULÁRIO ---
const selectedCotistaId = ref<number | null>(null)
const taxaRendimento = ref(0.04) 
const dataInicio = ref('2024-11-23') 
const dataFim = ref('2025-06-23') 

const isLoading = ref(false)
const isFetchingCotistas = ref(true) 
const message = ref('')
const isError = ref(false) 
const generatedMovements = ref<any[]>([])
const cotistas = ref<CotistaStateItem[]>([]) 


/**
 * Função que busca a lista de cotistas na API /api/cotistas.
 * 🛑 CRÍTICO V7.0: Executado APENAS no cliente, injetando o token manualmente
 */
const fetchCotistas = async () => {
    // 🛑 1. Garante que o fetch só roda no cliente (após a hidratação)
    if (!process.client) {
        isFetchingCotistas.value = false
        return
    }

    isFetchingCotistas.value = true
    message.value = ''
    isError.value = false

    const authStore = useAuthStore() 
    
    // 🛑 2. Garante que a store foi hidratada ANTES de tentar ler o token
    await authStore.init() 

    const token = authStore.token

    if (!token) {
        // Se a store não encontrou o token, isso é um problema de sessão (middleware deve resolver)
        isError.value = true
        message.value = "Sessão não detectada. Recarregue a página e tente fazer login."
        isFetchingCotistas.value = false
        return 
    }
    
    try {
        // 🛑 3. USA $FETCH (o fetch nativo do Nuxt, sem o interceptor $api)
        const response = await $fetch<CotistaApiItem[]>('/api/cotistas', {
             // 🛑 4. Envia o token manualmente no cabeçalho
             headers: {
                 Authorization: `Bearer ${token}`
             },
             // 🛑 5. CRÍTICO: Força o erro a ser capturado localmente
             _blockResponseError: true 
         }) 
        
        // Mapeia os campos da API para os campos esperados no template Vue
        cotistas.value = response.map(c => ({ 
            id: c.id, 
            nome: c.nomeCompleto,
            conta: c.numeroDaConta 
        }));
        
        isFetchingCotistas.value = false
        message.value = '' 

    } catch (e: any) {
        console.error('Erro ao buscar cotistas (Isolamento Máximo):', e)
        isFetchingCotistas.value = false
        
        const status = e.response?.status;
        const isAuthError = status === 401 || status === 403;

        if (isAuthError) {
             // 401/403: Indica falha de permissão ou token, mas não redireciona globalmente.
             message.value = `ERRO de Autorização (${status}) ao carregar cotistas. O token pode ser inválido. Por favor, tente recarregar a página e logar novamente.`;
        } else {
             message.value = `ERRO CRÍTICO (Isolamento Máximo): ${e.response?.status || 0} - ${e.data?.statusMessage || 'Falha de comunicação.'}`
        }
        isError.value = true
    } 
}

// 🛑 CRÍTICO V7.0: Chamada de API ativada apenas após a montagem do cliente.
onMounted(fetchCotistas)


// --- LÓGICA DE SUBMISSÃO (Otimizada) ---
const canSubmit = computed(() => {
    // Garante que a lista de cotistas não está carregando e não houve erro no carregamento da lista
    return !isLoading.value && 
           !isFetchingCotistas.value &&
           !isError.value && // Não submete se houve erro ao carregar a lista
           selectedCotistaId.value !== null && 
           taxaRendimento.value > 0 && 
           dataInicio.value !== '' && 
           dataFim.value !== ''
})

/**
 * Função para acionar a API de geração de rendimentos com dados customizados.
 * 🛑 CRÍTICO V9.0: Usa $fetch nativo e injeção manual de token.
 */
const gerarRendimentos = async () => {
    // Reseta apenas o status de erro e mensagem do formulário, mantendo o status de erro de cotistas, se houver
    if (isError.value && message.value.includes("ao carregar cotistas")) {
        // Se o erro for do fetch cotistas, não reseta a mensagem/status para manter o aviso.
    } else {
        message.value = '';
        isError.value = false;
    }
    generatedMovements.value = []

    if (!canSubmit.value) {
        // Se a falha for no carregamento de cotistas, canSubmit é falso, mas a mensagem já está lá.
        if (!isFetchingCotistas.value && !isError.value) {
            isError.value = true
            message.value = 'Preencha todos os campos obrigatórios e garanta que a taxa é positiva.'
        }
        return
    }

    if (!process.client) {
        isError.value = true;
        message.value = "Ação de submissão só pode ser executada no cliente.";
        return;
    }
    
    // 🛑 CRÍTICO V9.0: Injeção de token manual antes da requisição
    const authStore = useAuthStore() 
    await authStore.init() // Garante que o token está lido do localStorage
    const token = authStore.token

    if (!token) {
        isError.value = true
        message.value = "ERRO de Autorização (401): Token de sessão não encontrado após inicialização. Recarregue a página e faça login novamente."
        return 
    }

    isLoading.value = true
    
    try {
        const payload = {
            cotistaId: selectedCotistaId.value!,
            taxa: taxaRendimento.value,
            dataInicio: dataInicio.value,
            dataFim: dataFim.value,
        }

        // 🛑 V9.0: Usa $fetch nativo e injeta o token manualmente, resolvendo o problema de sincronização do $api.
        const response = await $fetch('/api/gerar-movimentacao-rendimento', {
            method: 'POST',
            body: payload,
            headers: {
                Authorization: `Bearer ${token}` // Injeção manual do token
            },
            _blockResponseError: true, // Mantém esta flag para tratamento local de erros
        }) as { success: boolean, count: number, taxaAplicada: number, message: string, movimentacoes: any[] }

        if (response.success) {
            isError.value = false
            message.value = response.message
            generatedMovements.value = response.movimentacoes
        } else {
            isError.value = true
            message.value = response.message || 'Erro desconhecido na geração de rendimentos.'
        }

    } catch (e: any) {
        isError.value = true
        const status = e.response?.status;
        const isAuthError = status === 401 || status === 403;

        if (isAuthError) {
            // Se for 401 ou 403, exibe uma mensagem específica.
            const authErrorMessage = status === 403 
                ? 'Nível de permissão insuficiente para executar esta ação. (Nível Requerido 2)' 
                : 'Sessão expirada. Tente recarregar a página e fazer login novamente.';
            message.value = `ERRO de Autorização (${status}): ${e.data?.statusMessage || authErrorMessage}`;
        } else {
            const errorMessage = e.data?.statusMessage || e.message || 'Ocorreu um erro ao comunicar com o servidor.'
            message.value = `ERRO: ${errorMessage}`
        }
        console.error('Erro na requisição da API de rendimento (POST):', e)
    } finally {
        isLoading.value = false
    }
}

const DIA_LANCAMENTO = 23
</script>

<template>

  <header pageTitle="Ajuste de Rendimentos" />

  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Administração de Lançamentos de Rendimento (Customizado)</h1>
    
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4">Parâmetros de Geração</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        <div class="md:col-span-1">
          <label for="cotistaId" class="block text-sm font-medium text-gray-700 mb-1">Cotista</label>
          <select
            id="cotistaId" 
            v-model.number="selectedCotistaId"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading || isFetchingCotistas"
          >
            <option :value="null" disabled>Selecione um cotista</option>
            <option 
                v-if="isFetchingCotistas" 
                :value="null" 
                disabled>
                Carregando lista...
            </option>
            <option 
                v-for="cotista in cotistas" 
                :key="cotista.id" 
                :value="cotista.id"
            >
                {{ cotista.nome }} ({{ cotista.conta }})
            </option>
          </select>
          <p v-if="isFetchingCotistas" class="text-sm text-gray-500 mt-1">Carregando lista...</p>
          <p v-if="isError && message.includes('cotistas')" class="text-sm text-red-500 mt-1">{{ message }}</p>
        </div> 
        
        <div class="md:col-span-1">
          <label for="taxa" class="block text-sm font-medium text-gray-700 mb-1">Taxa Mensal (Decimal)</label>
          <input
            id="taxa"
            v-model.number="taxaRendimento"
            type="number"
            step="0.0001"
            min="0"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: 0.04 para 4%"
            :disabled="isLoading"
          />
        </div> 
        
        <div class="md:col-span-1">
          <label for="dataInicio" class="block text-sm font-medium text-gray-700 mb-1">Mês Inicial (Dia {{ DIA_LANCAMENTO }})</label>
          <input
            id="dataInicio"
            v-model="dataInicio"
            type="date"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading"
          />
        </div> 
        
        <div class="md:col-span-1">
          <label for="dataFim" class="block text-sm font-medium text-gray-700 mb-1">Mês Final (Dia {{ DIA_LANCAMENTO }})</label>
          <input
            id="dataFim"
            v-model="dataFim"
            type="date"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading"
          />
        </div> 
        
      </div> 
      
      <button
        @click="gerarRendimentos"
        :disabled="!canSubmit"
        :class="[
          'w-full px-6 py-2 rounded-md font-semibold transition duration-150 ease-in-out mt-4',
          !canSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
        ]"
      >
        <span v-if="isLoading">Gerando Lançamentos...</span>
        <span v-else>Gerar Lançamentos de Rendimento</span>
      </button>

    </div> 
    
    <div v-if="message" :class="[
        'p-4 rounded-md mb-6',
        isError ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'
      ]">
      <p class="font-bold">{{ isError ? 'Erro na Operação' : 'Sucesso!' }}</p>
      <p>{{ message }}</p>
    </div>

    <div v-if="generatedMovements.length > 0" class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4">Lançamentos Criados ({{ generatedMovements.length }})</h2>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Mov.</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Lançamento</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="mov in generatedMovements" :key="mov.id">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ mov.id }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ new Date(mov.data).toLocaleDateString('pt-BR') }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">{{ Number(mov.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</td>
                    </tr>
                </tbody>
            </table>
        </div> 
    </div> 
  </div> 
</template>

<style scoped>
/* Estilos Tailwind CSS */
</style>
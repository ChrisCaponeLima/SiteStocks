// /pages/admin/gerar-rendimentos.vue - V10.0 - Refatoração de Arquitetura: Usa useFetch (SSR-safe) para carregar cotistas, removendo a complexidade da injeção manual de token e do onMounted.

<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({
    title: 'Admin | Gerar Rendimentos Customizados',
})

// ✅ Mantém o middleware de proteção para garantir que apenas admins tenham acesso
definePageMeta({
    middleware: ['auth-admin']
})

// Tipagem para os dados que vêm da API /api/cotistas (usada para o useFetch)
interface CotistaApiItem {
    id: number;
    nomeCompleto: string;
    numeroDaConta: string;
}

// Tipagem para o estado reativo (Cotistas)
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
const message = ref('')
const isError = ref(false) 
const generatedMovements = ref<any[]>([])

// --- 1. BUSCA DE COTISTAS (SSR-SAFE com useFetch) ---

// 1.1 useFetch para carregar a lista de cotistas. 
// O token de autenticação deve ser lido automaticamente via cookies/headers no SSR/CSR.
const { data: cotistasApiData, pending: isFetchingCotistas, error: fetchCotistasError } = await useFetch<CotistaApiItem[]>('/api/cotistas', {
    method: 'GET',
    // Não precisa de headers, pois confiamos que o cookie de sessão está sendo enviado.
    watch: false, // Busca única na carga da página
    transform: (response) => {
        // Mapeia os campos da API para os campos esperados no template Vue
        return response?.map(c => ({ 
            id: c.id, 
            nome: c.nomeCompleto,
            conta: c.numeroDaConta 
        })) || [];
    }
});

// 1.2 Mapeamento do resultado para o estado reativo
const cotistas = computed<CotistaStateItem[]>(() => cotistasApiData.value || []);


// 1.3 Lógica de tratamento de erro e mensagem do fetch inicial
const cotistasFetchMessage = computed(() => {
    if (fetchCotistasError.value) {
        const e = fetchCotistasError.value as any;
        const status = e.response?.status;
        const isAuthError = status === 401 || status === 403;
        
        isError.value = true; // Marca erro globalmente (necessário)

        if (isAuthError) {
            return `ERRO de Autorização (${status}) ao carregar cotistas. O token de sessão não foi enviado ou a permissão está incorreta.`;
        } else {
            return `ERRO CRÍTICO ao buscar cotistas: ${e.data?.statusMessage || 'Falha de comunicação.'}`
        }
    }
    return '';
});

// --- LÓGICA DE SUBMISSÃO (Otimizada) ---
const canSubmit = computed(() => {
    // Garante que a lista de cotistas não está carregando e NÃO houve erro no carregamento
    return !isLoading.value && 
           !isFetchingCotistas.value &&
           !fetchCotistasError.value && // CRÍTICO: Não submete se houve erro ao carregar a lista
           selectedCotistaId.value !== null && 
           taxaRendimento.value > 0 && 
           dataInicio.value !== '' && 
           dataFim.value !== ''
})

/**
 * Função para acionar a API de geração de rendimentos com dados customizados.
 * Usa $fetch nativo e confia no envio de cookies/headers pelo cliente.
 */
const gerarRendimentos = async () => {
    // Reseta apenas o status de erro e mensagem do formulário, mantendo o aviso de erro do fetch inicial, se houver
    if (fetchCotistasError.value) {
        // Se o erro for do fetch cotistas, não prossegue.
        message.value = cotistasFetchMessage.value;
        isError.value = true;
        return;
    }
    
    message.value = '';
    isError.value = false;
    generatedMovements.value = []

    if (!canSubmit.value) {
        isError.value = true
        message.value = 'Preencha todos os campos obrigatórios e garanta que a taxa é positiva.'
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

        // Usa $fetch, confiando no Nuxt para enviar o cookie de sessão.
        const response = await $fetch('/api/gerar-movimentacao-rendimento', {
            method: 'POST',
            body: payload,
            credentials: 'include', // Assegura que cookies/headers sejam enviados
            // A tipagem 'as' é mantida para garantir a estrutura do retorno
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
            const authErrorMessage = status === 403 
                 ? 'Nível de permissão insuficiente para executar esta ação.' 
                 : 'Sessão expirada. Tente fazer login novamente.';
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
  <Header pageTitle="Ajuste de Rendimentos" />

  <div class="container mx-auto p-4 max-w-4xl">
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
            :disabled="isLoading || isFetchingCotistas || !!fetchCotistasError"
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
          <p v-if="cotistasFetchMessage" class="text-sm text-red-500 mt-1">{{ cotistasFetchMessage }}</p>
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
            :disabled="isLoading || !!fetchCotistasError"
          />
        </div> 
        
        <div class="md:col-span-1">
          <label for="dataInicio" class="block text-sm font-medium text-gray-700 mb-1">Mês Inicial (Dia {{ DIA_LANCAMENTO }})</label>
          <input
            id="dataInicio"
            v-model="dataInicio"
            type="date"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading || !!fetchCotistasError"
          />
        </div> 
        
        <div class="md:col-span-1">
          <label for="dataFim" class="block text-sm font-medium text-gray-700 mb-1">Mês Final (Dia {{ DIA_LANCAMENTO }})</label>
          <input
            id="dataFim"
            v-model="dataFim"
            type="date"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading || !!fetchCotistasError"
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
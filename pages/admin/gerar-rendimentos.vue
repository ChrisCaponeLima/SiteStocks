// ~/pages/admin/gerar-rendimentos.vue - V2.1 - Script Final com conexão real de cotistas
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({
    title: 'Admin | Gerar Rendimentos Customizados',
})

// Tipagem para os dados que vêm da API /api/cotistas
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

// --- VARIÁVEIS DE ESTADO ---
const selectedCotistaId = ref<number | null>(null)
const taxaRendimento = ref(0.04) // Padrão 4%
const dataInicio = ref('2024-11-23') // Padrão
const dataFim = ref('2025-06-23') // Padrão

const isLoading = ref(false)
const isFetchingCotistas = ref(true)
const message = ref('')
const isError = ref(false)
const generatedMovements = ref<any[]>([])

// Cotistas agora inicializado como array vazio tipado
const cotistas = ref<CotistaStateItem[]>([]) 

/**
 * Função que busca a lista de cotistas na API /api/cotistas.
 */
const fetchCotistas = async () => {
    isFetchingCotistas.value = true
    try {
        // *** SUBSTITUIÇÃO REAL DA CHAMADA DE API ***
        const response = await $fetch<CotistaApiItem[]>('/api/cotistas', {
             // ** ATENÇÃO: Use a mesma string de token do verifyToken do auth.ts placeholder
             headers: { 'Authorization': 'Bearer valid-admin-token' } 
        })
        
        // Mapeia os campos da API para os campos esperados no template Vue
        cotistas.value = response.map(c => ({ 
            id: c.id, 
            nome: c.nomeCompleto,
            conta: c.numeroDaConta 
        }));
        
        // Fim da busca
        isFetchingCotistas.value = false
        message.value = '' // Limpa a mensagem se a busca for bem-sucedida

    } catch (e: any) {
        console.error('Erro ao buscar cotistas:', e)
        isFetchingCotistas.value = false
        message.value = `Erro ao carregar lista de cotistas: ${e.data?.statusMessage || 'Detalhe não disponível'}`
        isError.value = true
    }
}

onMounted(fetchCotistas)


// --- LÓGICA DE SUBMISSÃO ---
const canSubmit = computed(() => {
    return !isLoading.value && 
           selectedCotistaId.value !== null && 
           taxaRendimento.value > 0 && 
           dataInicio.value !== '' && 
           dataFim.value !== ''
})

/**
 * Função para acionar a API de geração de rendimentos com dados customizados.
 */
const gerarRendimentos = async () => {
  message.value = ''
  isError.value = false
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

    const response = await $fetch('/api/gerar-movimentacao-rendimento', {
      method: 'POST',
      body: payload,
      // ** ATENÇÃO: Ajuste seu método de obtenção de token aqui **
      headers: {
        'Authorization': 'Bearer valid-admin-token' 
      }
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
    const errorMessage = e.data?.statusMessage || e.message || 'Ocorreu um erro ao comunicar com o servidor.'
    message.value = `ERRO: ${errorMessage}`
    console.error('Erro na requisição da API de rendimento:', e)
  } finally {
    isLoading.value = false
  }
}

// Constante DIA_LANCAMENTO mantida para exibição na UI
const DIA_LANCAMENTO = 23
</script>

<template>
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
                v-for="cotista in cotistas" 
                :key="cotista.id" 
                :value="cotista.id"
            >
                {{ cotista.nome }} ({{ cotista.conta }})
            </option>
          </select>
          <p v-if="isFetchingCotistas" class="text-sm text-gray-500 mt-1">Carregando lista...</p>
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
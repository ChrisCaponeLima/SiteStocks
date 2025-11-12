// /pages/extrato.vue - V1.5 - FINAL: Remove o middleware redundante (Nível 0), que estava causando o erro de rota desconhecida. Mantém a lógica SSR-safe de useAsyncData.

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth' 
import { apiUrl } from '~/utils/apiClient' 

// ✅ CORREÇÃO: Remove a propriedade 'middleware'. A proteção de Nível 0 é feita pelo Layout.
definePageMeta({ 
 // NENHUM MIDDLEWARE DE ROTA DEFINIDO
})

useHead({
title: 'Meu Extrato Financeiro',
})

// Tipagem para os itens do extrato (Inalterado)
interface ExtratoItem {
id: number;
data: string;
tipo: 'APORTE' | 'RESGATE' | 'RENDIMENTO';
valor: number;
}

// --- VARIÁVEIS DE ESTADO E FILTROS ---
const authStore = useAuthStore();
const cotistaNome = ref('Cotista')
const message = ref('')

const startDate = ref('')
const endDate = ref('')

// Variável reativa para observar o cotistaId.
const reactiveCotistaId = computed(() => authStore.cotistaId);

// Computed property que gera os parâmetros de busca reativamente
const fetchQuery = computed(() => {
  const query: { startDate?: string, endDate?: string, cotistaId?: number } = {};
  
  // CRÍTICO: Usa reactiveCotistaId.value para que este computed dependa da store
  if (reactiveCotistaId.value) {
   query.cotistaId = reactiveCotistaId.value;
  } else {
   // Retorna nulo se o ID não estiver disponível.
   return null; 
  }

  if (startDate.value) query.startDate = startDate.value;
  if (endDate.value) query.endDate = endDate.value;

  return query;
})

// --- SSR/CSR DATA FETCHING (useAsyncData) ---
const { data, pending, error, refresh } = await useAsyncData(
  'extrato-data', 
  () => {
    const currentQuery = fetchQuery.value;
    
    if (currentQuery === null) {
      return Promise.resolve({ extrato: [], cotistaNome: 'Cotista Desconectado' });
    }
    
    return $fetch(
      apiUrl('/api/extrato'), 
      {
        method: 'GET',
        query: currentQuery, 
        credentials: 'include', 
      }
    )
  },
  {
    watch: [fetchQuery, reactiveCotistaId], 
    transform: (response) => {
      if (response?.cotistaNome) {
       cotistaNome.value = response.cotistaNome;
      }
      return response?.extrato || []; 
    },
    immediate: true, 
    lazy: false, 
  }
);

// Mapeamento do estado reativo do useAsyncData para a View (Inalterado)
const movimentacoes = computed<ExtratoItem[]>(() => data.value || []);
const isLoading = pending;
const isError = computed(() => !!error.value);


// --- WATCHERS E FUNÇÕES DE ESTADO --- 

watch(error, (newError) => {
  if (newError) {
    const e = newError as any;
    const errorMessage = e.data?.statusMessage || e.message || 'Ocorreu um erro ao comunicar com o servidor.'
    message.value = `ERRO: ${errorMessage}`
  }
});

watch(isLoading, (newLoading) => {
  if (!newLoading && !isError.value) {
    if (movimentacoes.value.length === 0) {
      message.value = 'Nenhuma movimentação encontrada para o período selecionado.';
    } else {
      message.value = ''; 
    }
  }
});


// --- FUNÇÕES DE LÓGICA --- 

/**
* Mapeia o tipo de movimentação para uma label amigável e cor
*/
const getTipoLabel = (tipo: ExtratoItem['tipo']) => {
switch (tipo) {
 case 'APORTE': return { text: 'Aporte', class: 'bg-blue-100 text-blue-800' };
 case 'RESGATE': return { text: 'Resgate', class: 'bg-red-100 text-red-800' };
 case 'RENDIMENTO': return { text: 'Rendimento', class: 'bg-green-100 text-green-800' };
 default: return { text: 'Outro', class: 'bg-gray-100 text-gray-800' };
}
}

/**
* Função acionada pelo botão. Apenas chama refresh.
*/
const applyFilters = () => {
  message.value = ''; 
  refresh(); 
}

</script>

<template>
<Header pageTitle="Extrato" />
<div class="container mx-auto p-4 max-w-5xl">
<h1 class="text-3xl font-bold mb-2">Extrato de Movimentações</h1>
<p class="text-xl text-gray-600 mb-6">Cotista: {{ cotistaNome }}</p>

<div class="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-col md:flex-row gap-4 items-end">
 <div class="flex-1 w-full">
 <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
 <input
  id="startDate"
  v-model="startDate"
  type="date"
  class="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 
 <div class="flex-1 w-full">
 <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
 <input
  id="endDate"
  v-model="endDate"
  type="date"
  class="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <button
 @click="applyFilters"
 :disabled="isLoading"
 :class="[
  'px-4 py-2 rounded-md font-semibold transition duration-150 ease-in-out w-full md:w-auto',
  isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
 ]"
 >
 <span v-if="isLoading">Buscando...</span>
 <span v-else>Aplicar Filtros</span>
 </button>
</div>

<div v-if="message && !isLoading" :class="[
 'p-4 rounded-md mb-6',
 isError ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
]">
<p class="font-bold">{{ isError ? 'Erro' : 'Aviso' }}</p>
<p>{{ message }}</p>
</div>

<div v-if="movimentacoes.length > 0" class="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
 <h2 class="text-xl font-semibold mb-4">Detalhes do Extrato ({{ movimentacoes.length }} lançamentos)</h2>
 
 <table class="min-w-full divide-y divide-gray-200">
 <thead class="bg-gray-50">
  <tr>
  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
  </tr>
 </thead>
 <tbody class="bg-white divide-y divide-gray-200">
  <tr v-for="mov in movimentacoes" :key="mov.id">
  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
   {{ new Date(mov.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
  </td>
  
  <td class="px-6 py-4 whitespace-nowrap">
   <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getTipoLabel(mov.tipo).class]">
   {{ getTipoLabel(mov.tipo).text }}
   </span>
  </td>
  
  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-right"
   :class="{ 'text-green-600': mov.tipo === 'RENDIMENTO' || mov.tipo === 'APORTE', 'text-red-600': mov.tipo === 'RESGATE' }">
   {{ mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
  </td>
  </tr>
 </tbody>
 </table>
</div>

<div v-else-if="!isLoading && !message" class="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
 Selecione um período e clique em "Aplicar Filtros" para ver suas movimentações.
</div>

</div>
</template>

<style scoped>
/* Estilos Tailwind CSS */
</style>
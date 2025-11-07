// /pages/extrato.vue - V1.0 - Componente de Extrato Financeiro para o cotista logado
<script setup lang="ts">
import { ref, onMounted } from 'vue'

useHead({
  title: 'Meu Extrato Financeiro',
})

// Tipagem para os itens do extrato
interface ExtratoItem {
    id: number;
    data: string;
    tipo: 'APORTE' | 'RESGATE' | 'RENDIMENTO';
    valor: number;
}

// --- VARIÁVEIS DE ESTADO ---
const movimentacoes = ref<ExtratoItem[]>([])
const cotistaNome = ref('Cotista')
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

const startDate = ref('')
const endDate = ref('')

// --- FUNÇÕES ---

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
 * Busca o extrato de movimentações na API.
 */
const fetchExtrato = async () => {
    isLoading.value = true
    isError.value = false
    message.value = ''
    movimentacoes.value = []

    const query: { startDate?: string, endDate?: string } = {};

    if (startDate.value) query.startDate = startDate.value;
    if (endDate.value) query.endDate = endDate.value;

    try {
        const response = await $fetch('/api/extrato', {
            method: 'GET',
            query: query,
            // ** ATENÇÃO: SUBSTITUIR PELO MÉTODO REAL DE OBTENÇÃO DO TOKEN DO USUÁRIO LOGADO **
            headers: {
                'Authorization': 'Bearer valid-user-token' 
            }
        }) as { cotistaNome: string, extrato: ExtratoItem[] }

        cotistaNome.value = response.cotistaNome || 'Cotista';
        movimentacoes.value = response.extrato;
        
        if (response.extrato.length === 0) {
            message.value = 'Nenhuma movimentação encontrada para o período selecionado.';
        }

    } catch (e: any) {
        isError.value = true
        const errorMessage = e.data?.statusMessage || e.message || 'Ocorreu um erro ao comunicar com o servidor.'
        message.value = `ERRO: ${errorMessage}`
        console.error('Erro na requisição do extrato:', e)
    } finally {
        isLoading.value = false
    }
}

// Busca o extrato ao carregar a página
onMounted(fetchExtrato)
</script>

<template>
  <div class="container mx-auto p-4">
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
            @click="fetchExtrato"
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
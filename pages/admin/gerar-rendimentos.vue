// /pages/admin/gerar-rendimentos.vue - V11.1 - Correção da População do Select de Cotistas (Verificação robusta do array de resposta da API)
<script setup lang="ts">
/**
 * 🔒 Este componente foi totalmente adaptado para a nova arquitetura segura baseada em JWT Cookie-only.
 * - Todas as chamadas de API usam `$api` (instância de ofetch com interceptors globais e baseURL dinâmica).
 * - Não há leitura manual de cookies, headers ou tokens.
 * - A autenticação é gerida automaticamente via cookies HTTPOnly.
 * - O uso de `useAsyncData` garante compatibilidade com SSR e evita erros de “token ausente”.
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

// 🧠 Define o título da página e middleware de proteção administrativa.
useHead({ title: 'Admin | Gerar Rendimentos Customizados' })
definePageMeta({ middleware: ['auth-admin'] })

// --------------------------------------------------------------
// 1️⃣ Tipagens e variáveis reativas
// --------------------------------------------------------------
interface CotistaApiItem {
  id: number
  nomeCompleto: string
  numeroDaConta: string
}

interface CotistaLocalItem {
  id: number
  nome: string // Mapeado de nomeCompleto
  conta: string // Mapeado de numeroDaConta
}

const authStore = useAuthStore()
const selectedCotistaId = ref<number | null>(null)
const taxaRendimento = ref(0.04)
const dataInicio = ref('2024-11-23')
const dataFim = ref('2025-06-23')
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)
const generatedMovements = ref<any[]>([])

// --------------------------------------------------------------
// 2️⃣ Carregamento seguro da lista de cotistas
// --------------------------------------------------------------
/**
 * 🧩 useAsyncData é usado no lugar de useFetch para:
 * - Garantir compatibilidade SSR e CSR (server/client).
 * - Permitir uso direto da instância `$api`, que já injeta token via cookie.
 * - Evitar chamadas duplicadas no client (watch: false).
 */
const { data: cotistasData, pending: isFetchingCotistas, error: cotistasError } =
  await useAsyncData<CotistaLocalItem[]>('cotistas-list', async () => {
    const nuxtApp = useNuxtApp()
    
    // 💡 Tipagem da resposta da API
    const response = await nuxtApp.$api<CotistaApiItem[]>('/cotistas', {
      method: 'GET',
      credentials: 'include', // 🧷 Garante envio do cookie JWT
    })

    // 💡 Correção: Verificação robusta para garantir que a resposta é um array válido
    if (!Array.isArray(response)) {
      console.error('API /cotistas retornou um formato inválido:', response)
      // Força um erro para que cotistasError seja acionado
      throw new Error("Resposta da API de cotistas não é uma lista válida.");
    }
    
    // Mapeamento de CotistaApiItem para CotistaLocalItem
    return response.map((c) => ({
      id: c.id,
      nome: c.nomeCompleto,
      conta: c.numeroDaConta,
    }))
  })

const cotistas = computed(() => cotistasData.value || [])

// --------------------------------------------------------------
// 3️⃣ Tratamento de erros de carregamento
// --------------------------------------------------------------
const cotistasFetchMessage = computed(() => {
  if (cotistasError.value) {
    const e = cotistasError.value as any
    const status = e?.response?.status
    isError.value = true
    if (status === 401 || status === 403) {
      return `ERRO de Autorização (${status}): Sessão expirada ou permissão insuficiente.`
    }
    return `ERRO CRÍTICO ao buscar cotistas: ${e?.data?.statusMessage || e?.message || 'Falha desconhecida.'}`
  }
  return ''
})

// --------------------------------------------------------------
// 4️⃣ Validação e submissão do formulário
// --------------------------------------------------------------
const canSubmit = computed(() => {
  return (
    !isLoading.value &&
    !isFetchingCotistas.value &&
    !cotistasError.value &&
    selectedCotistaId.value !== null &&
    taxaRendimento.value > 0 &&
    dataInicio.value !== '' &&
    dataFim.value !== ''
  )
})

/**
 * 📤 Envia os dados para a rota segura /api/gerar-movimentacao-rendimento.
 * - O token JWT é adicionado automaticamente via cookie (não manual).
 * - Usa `$api` global com baseURL dinâmica configurada no plugin 03.api.ts.
 */
const gerarRendimentos = async () => {
  if (!canSubmit.value) {
    isError.value = true
    message.value = 'Preencha todos os campos obrigatórios corretamente.'
    return
  }

  isLoading.value = true
  message.value = ''
  isError.value = false

  try {
    const nuxtApp = useNuxtApp()
    const payload = {
      cotistaId: selectedCotistaId.value!,
      taxa: taxaRendimento.value,
      dataInicio: dataInicio.value,
      dataFim: dataFim.value,
    }

    const response = await nuxtApp.$api('/gerar-movimentacao-rendimento', {
      method: 'POST',
      body: payload,
      credentials: 'include',
    })

    if (response.success) {
      message.value = response.message
      generatedMovements.value = response.movimentacoes
      isError.value = false
    } else {
      throw new Error(response.message || 'Erro desconhecido ao gerar rendimentos.')
    }
  } catch (e: any) {
    const status = e?.response?.status
    isError.value = true
    if (status === 401 || status === 403) {
      message.value = `ERRO de Autorização (${status}): Sessão expirada ou acesso negado.`
    } else {
      message.value = e?.data?.statusMessage || e?.message || 'Erro ao comunicar com o servidor.'
    }
    console.error('Erro ao gerar rendimentos:', e)
  } finally {
    isLoading.value = false
  }
}

// --------------------------------------------------------------
// 5️⃣ Constantes e helpers
// --------------------------------------------------------------
const DIA_LANCAMENTO = 23
</script>

<template>
  <Header pageTitle="Ajuste de Rendimentos" />

  <div class="container mx-auto p-4 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6">
      Administração de Lançamentos de Rendimento (Customizado)
    </h1>

    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4">Parâmetros de Geração</h2>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Cotista</label>
          <select
            v-model.number="selectedCotistaId"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            :disabled="isLoading || isFetchingCotistas"
          >
            <option :value="null" disabled>Selecione um cotista</option>
            <option v-if="isFetchingCotistas" disabled>Carregando lista...</option>
            <option v-for="cotista in cotistas" :key="cotista.id" :value="cotista.id">
              {{ cotista.nome }} ({{ cotista.conta }})
            </option>
          </select>
          <p v-if="cotistasFetchMessage" class="text-sm text-red-500 mt-1">
            {{ cotistasFetchMessage }}
          </p>
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Taxa Mensal (Decimal)</label>
          <input
            v-model.number="taxaRendimento"
            type="number"
            step="0.0001"
            min="0"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Ex: 0.04 para 4%"
            :disabled="isLoading"
          />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Mês Inicial</label>
          <input v-model="dataInicio" type="date" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>

        <div class="md:col-span-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Mês Final</label>
          <input v-model="dataFim" type="date" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
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

    <div
      v-if="message"
      :class="[
        'p-4 rounded-md mb-6',
        isError
          ? 'bg-red-100 border border-red-400 text-red-700'
          : 'bg-green-100 border border-green-400 text-green-700'
      ]"
    >
      <p class="font-bold">{{ isError ? 'Erro na Operação' : 'Sucesso!' }}</p>
      <p>{{ message }}</p>
    </div>

    <div v-if="generatedMovements.length > 0" class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold mb-4">
        Lançamentos Criados ({{ generatedMovements.length }})
      </h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID Mov.
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data Lançamento
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Valor (R$)
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="mov in generatedMovements" :key="mov.id">
              <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ mov.id }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ new Date(mov.data).toLocaleDateString('pt-BR') }}
              </td>
              <td class="px-6 py-4 text-sm font-bold text-green-600 text-right">
                {{ Number(mov.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tailwind já cobre a maioria dos estilos */
</style>
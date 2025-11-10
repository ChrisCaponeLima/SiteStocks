// /pages/pix-generator.vue - V2.0 - Integração do useAuthStore (Pinia) e envio correto do userId para o backend de reserva de PIX estático.
// Anteriormente: V1.6 - Atualização do ID fixo do cotista para COTISTA_ID = 5 para testes.

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'; // 🛑 NOVO: Importa o store de autenticação
import { storeToRefs } from 'pinia'; // 🛑 NOVO: Para manter a reatividade

// ➡️ Injeta a instância customizada de ofetch ($api)
const { $api } = useNuxtApp();

// --------------------------------------------------------------------------------
// ✅ INTEGRAÇÃO COM AUTH STORE
// --------------------------------------------------------------------------------
const authStore = useAuthStore();
// Obtém o cotistaId e o objeto user (que contém o id do usuário logado) de forma reativa
const { cotistaId, user } = storeToRefs(authStore);

// V1.1 - CONSTANTES DO RECEBEDOR (Para exibição no frontend)
const RECEIVER_NAME = 'Christiano Gomes de Lima'

// REMOVIDO: const COTISTA_ID = 5 (Agora é obtido dinamicamente)
// --------------------------------------------------------------------------------

// V1.0 - Variáveis de Estado para o Depósito
const depositAmount = ref<number | null>(null)
const pixPayload = ref<string | null>(null)
const isGenerating = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null) // Adicionado para mensagens de sucesso

// V1.0 - Função de formatação de moeda
const formatCurrency = (value: number | string | null): string => {
  if (value === null || isNaN(Number(value))) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

// V2.0 - Lógica de Geração e Persistência do Payload Pix (CHAMADA API)
const generatePixPayload = async () => {
  pixPayload.value = null
  errorMessage.value = null
  successMessage.value = null

  // 🛑 VERIFICAÇÕES DE PRÉ-REQUISITOS (Cotista e Valor)
  if (!cotistaId.value || cotistaId.value <= 0) {
    errorMessage.value = 'Erro de autenticação: ID do cotista não encontrado. Faça login novamente.';
    return;
  }
  if (!user.value?.id) {
    errorMessage.value = 'Erro de autenticação: ID do usuário logado (Nível 0) não encontrado.';
    return;
  }
  
  if (depositAmount.value === null || depositAmount.value <= 0) {
    errorMessage.value = 'Por favor, insira um valor de depósito válido (maior que R$ 0,00).'
    return
  }

  isGenerating.value = true
  
  try {
    // Comentário de Alteração:
    // ANTES: O endpoint usava o ID Fixo (5).
    // AGORA: Usa o cotistaId.value reativo do Pinia Store.
    // O body agora inclui o userId (ID do Nível 0 logado), que é crucial para a atualização do PixCopiaColaEstatico.
    const response = await $api(`/api/cotista/${cotistaId.value}/deposito`, {
        method: 'POST',
        body: {
            depositAmount: depositAmount.value, // Valor escolhido pelo usuário
           userId: user.value.id // ID do usuário Nível 0 logado (Para PixCopiaColaEstatico)
        }
    })

    if (response.pixPayload) {
        pixPayload.value = response.pixPayload
        successMessage.value = response.message || 'Solicitação de depósito registrada com sucesso.'
        errorMessage.value = null 
    } else {
        throw new Error('O servidor não retornou o Payload Pix após o registro.')
    }
    
  } catch (error: any) {
    console.error('Falha na geração do Pix:', error);
    // Captura a mensagem de erro do backend (ex: "Nenhum código PIX disponível no momento.")
    errorMessage.value = error.response?._data?.statusMessage || error.statusMessage || 'Falha desconhecida ao gerar e registrar o depósito.';
    successMessage.value = null;
  } finally {
    isGenerating.value = false
  }
}

// V1.0 - Copiar o código Pix para a área de transferência
const copyPixCode = () => {
  if (pixPayload.value) {
    navigator.clipboard.writeText(pixPayload.value)
    alert('Código Pix Copia e Cola copiado para a área de transferência!')
  }
}

// V1.0 - Configuração de SEO/Título da Página
useHead({
  title: `Depósito Pix - ${RECEIVER_NAME}`,
  meta: [
    { name: 'description', content: 'Gere seu QR Code Pix com valor estipulado para depósito.' }
  ],
})
</script>

<template>
    <Header pageTitle="Extrato" class="text-center">
      <h1 class="text-3xl font-extrabold text-blue-900 mb-2">
        Depósito Rápido via Pix
      </h1>
      <p class="text-gray-600">
        Estipule um valor para gerar o QR Code de pagamento e comece a investir na sua segurança!
      </p>
    </Header>
    <div class="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen">
  
    <section class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-5">
      <h2 class="text-xl font-bold text-blue-900">1. Informe o Valor do Aporte</h2>
      
      <div>
        <label for="deposit-value" class="block text-sm font-medium text-gray-700 mb-2">
          Valor do Depósito (R$)
        </label>
        <input
          id="deposit-value"
          v-model.number="depositAmount"
          type="number"
          placeholder="Ex: 50.00"
          :disabled="isGenerating"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg font-mono disabled:bg-gray-50"
          min="0.01"
        />
        
        <ClientOnly>
            <p class="mt-1 text-sm text-gray-500">Valor atual: {{ formatCurrency(depositAmount) }}</p>
        </ClientOnly>
      </div>

      <button
        @click="generatePixPayload"
        :disabled="isGenerating || depositAmount === null || depositAmount <= 0"
        class="w-full bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform shadow-md"
        :class="{'hover:bg-blue-800 hover:shadow-lg': !isGenerating, 'opacity-50 cursor-not-allowed': isGenerating}"
      >
        {{ isGenerating ? 'Registrando e Gerando QR Code...' : 'Gerar QR Code Pix' }}
      </button>

      <div v-if="errorMessage" class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage && !pixPayload" class="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
        {{ successMessage }}
      </div>
    </section>

    <ClientOnly>
        <section v-if="pixPayload" class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-5 text-center">
            <h2 class="text-xl font-bold text-blue-900">2. Escaneie para enviar o valor</h2>
            
            <div class="flex justify-center p-4 bg-white rounded-lg border-2 border-gray-200">
                <Qrcode 
                :value="pixPayload" 
                :size="250" 
                level="M" 
                class="shadow-xl" 
                />
            </div>

            <p class="text-sm text-gray-700 font-semibold">
                Recebedor: <span class="text-sm font-extrabold text-blue-700">{{ RECEIVER_NAME }}</span>
            </p>
            <p class="text-sm text-gray-700 font-semibold">
                Valor a ser enviado: <span class="text-lg font-extrabold text-green-600">{{ formatCurrency(depositAmount) }}</span>
            </p>

            <div class="mt-6">
                <h3 class="text-base font-bold text-blue-900 mb-2">Ou use o Pix Copia e Cola</h3>
                <div class="relative">
                <textarea
                    :value="pixPayload"
                    readonly
                    rows="3"
                    class="w-full p-3 border-dashed border-2 border-gray-300 bg-gray-50 rounded-lg resize-none font-mono text-xs overflow-hidden"
                ></textarea>
                <button
                    @click="copyPixCode"
                    class="absolute right-2 bottom-2 bg-blue-100 text-blue-900 p-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition duration-150"
                >
                    Copiar
                </button>
                </div>
            </div>

            <p class="text-xs text-red-700 mt-4 p-2 bg-red-50 rounded-lg border border-red-200">
                ⚠️ **Atenção:** A chave e o valor do Pix foram preenchidos. Certifique-se de que os dados do recebedor ({{ RECEIVER_NAME }}) e o valor exibido estão corretos antes de efetuar o pagamento.
                Esta solicitação foi **registrada** e aguarda confirmação de pagamento pelo seu gerente.
            </p>
        </section>
    </ClientOnly>
  
    <div v-if="!authStore.isAuthenticated" class="text-center p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg">
        <p>Aguardando autenticação do usuário para carregar IDs e permitir a geração do PIX.</p>
    </div>

  </div>
</template>

<style scoped>
/* Estilos adicionais específicos, se necessário. Tailwind já cobre o essencial. */
</style>
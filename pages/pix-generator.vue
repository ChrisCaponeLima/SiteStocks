<script setup lang="ts">
// /pages/pix-generator.vue - V1.6 - Atualização do ID fixo do cotista para COTISTA_ID = 5 para testes.
import { ref, computed } from 'vue'

// V1.1 - CONSTANTES DO RECEBEDOR (Para exibição no frontend)
const RECEIVER_NAME = 'Christiano Gomes de Lima'

// V1.6 - ID do Cotista Logado (FIXO para simulação)
// COMENTÁRIO: Alterado de 1 para 5 conforme solicitação.
const COTISTA_ID = 5 

// V1.0 - Variáveis de Estado para o Depósito
const depositAmount = ref<number | null>(null)
const pixPayload = ref<string | null>(null)
const isGenerating = ref(false)
const errorMessage = ref<string | null>(null)

// V1.0 - Função de formatação de moeda
const formatCurrency = (value: number | string | null): string => {
  if (value === null || isNaN(Number(value))) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

// V1.2 - Lógica de Geração e Persistência do Payload Pix (CHAMADA API)
const generatePixPayload = async () => {
  pixPayload.value = null
  errorMessage.value = null
  
  if (depositAmount.value === null || depositAmount.value <= 0) {
    errorMessage.value = 'Por favor, insira um valor de depósito válido (maior que R$ 0,00).'
    return
  }

  isGenerating.value = true
  
  try {
    // V1.6 - Chamando agora o endpoint /api/cotista/5/deposito
    const response = await $fetch(`/api/cotista/${COTISTA_ID}/deposito`, {
        method: 'POST',
        body: {
            depositAmount: depositAmount.value 
        }
    })

    if (response.pixPayload) {
        pixPayload.value = response.pixPayload
        errorMessage.value = null 
    } else {
        throw new Error('O servidor não retornou o Payload Pix após o registro.')
    }
    
  } catch (error: any) {
    console.error('Falha na geração do Pix:', error);
    errorMessage.value = error.statusMessage || 'Não foi possível gerar e registrar o depósito. Verifique o servidor.';
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
  <div class="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen">
    <header class="text-center">
      <h1 class="text-3xl font-extrabold text-blue-900 mb-2">
        Depósito Rápido via Pix
      </h1>
      <p class="text-gray-600">
        Estipule um valor para gerar o QR Code de pagamento e comece a investir na sua segurança!
      </p>
    </header>

    <section class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-5">
      <h2 class="text-xl font-bold text-blue-900">1. Informe o Valor</h2>
      
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
                Pagador: <span class="text-sm font-extrabold text-blue-700">{{ RECEIVER_NAME }}</span>
            </p>
            <p class="text-sm text-gray-700 font-semibold">
                Valor a ser pago: <span class="text-lg font-extrabold text-green-600">{{ formatCurrency(depositAmount) }}</span>
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

  </div>
</template>

<style scoped>
/* Estilos adicionais específicos, se necessário. Tailwind já cobre o essencial. */
</style>
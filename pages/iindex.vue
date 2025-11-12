// /pages/index.vue - V12.1 - Ajuste na leitura do campo 'userId' conforme padronização da Store V8.0.

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'; 
import { storeToRefs } from 'pinia'; 

// --------------------------------------------------------------------------------
// ✅ INTEGRAÇÃO COM AUTH STORE
// --------------------------------------------------------------------------------
const authStore = useAuthStore();
// Obtém o cotistaId e o objeto user de forma reativa.
const { cotistaId, user } = storeToRefs(authStore); 

// Variáveis computadas para exibição
// ✅ CORREÇÃO: Usando user.value?.userId conforme padronização da Store V8.0
const userId = computed(() => user.value?.userId || 'N/A');
const userEmail = computed(() => user.value?.email || 'N/A');
const userNomeCompleto = computed(() => {
  const nome = user.value?.nome || '';
  const sobrenome = user.value?.sobrenome || '';
  return (nome || sobrenome) ? `${nome} ${sobrenome}`.trim() : 'N/A';
});

// Mensagem de estado
const statusMessage = computed(() => {
  // A lógica de exibição está correta e agora se beneficia da correção na Store
  if (cotistaId.value && cotistaId.value > 0 && user.value) {
    return '✅ USUÁRIO AUTENTICADO E DADOS DISPONÍVEIS';
  } else if (cotistaId.value && cotistaId.value > 0) {
    return '⚠️ cotistaId ENCONTRADO, MAS DADOS DO USUÁRIO PENDENTES';
  } else {
    return '❌ USUÁRIO NÃO AUTENTICADO OU TOKEN INVÁLIDO';
  }
});
</script>

<template>
<div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
  
  <div class="card w-full max-w-lg text-blue-900 shadow-2xl">
    <h1 class="text-3xl font-extrabold mb-6 text-center text-primary">
      Validação do Estado de Autenticação
    </h1>

        <div 
      :class="{ 
        'bg-green-100 border-green-500': cotistaId && cotistaId > 0,
        'bg-red-100 border-red-500': !cotistaId || cotistaId <= 0,
      }"
      class="p-4 rounded-lg border-l-4 mb-8"
    >
      <p class="text-xl font-bold" :class="{ 'text-green-800': cotistaId && cotistaId > 0, 'text-red-800': !cotistaId || cotistaId <= 0 }">
        {{ statusMessage }}
      </p>
    </div>

        <div class="space-y-4">
      <div class="border-b pb-2">
        <p class="text-sm font-semibold text-gray-600">ID do Cotista (cotistaId)</p>
        <p class="text-xl font-mono text-primary break-all">{{ cotistaId || '0' }}</p>
      </div>

      <div class="border-b pb-2">
        <p class="text-sm font-semibold text-gray-600">Nome Completo</p>
        <p class="text-xl font-bold break-words">{{ userNomeCompleto }}</p>
      </div>
      
      <div class="border-b pb-2">
        <p class="text-sm font-semibold text-gray-600">Email</p>
        <p class="text-xl font-medium break-words">{{ userEmail }}</p>
      </div>

      <div class="border-b pb-2">
        <p class="text-sm font-semibold text-gray-600">ID do Usuário (user.id)</p>
        <p class="text-xl font-mono text-gray-800 break-all">{{ userId }}</p>
      </div>

            <div class="pt-4 border-t border-gray-200">
        <p class="text-sm font-semibold text-gray-600 mb-2">Dados do Objeto User (JSON)</p>
        <pre class="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto text-gray-700">{{ JSON.stringify(user, null, 2) }}</pre>
      </div>
    </div>
  </div>
</div>

</template>

<style scoped>
/* Estilo de cores e sombras para o look 'bancário' */
.card {
@apply bg-white rounded-xl p-6 shadow-xl; /* Sombra mais marcada e cantos bem definidos */
}
/* Cores customizadas que podem ser definidas no tailwind.config.js (sugestão) */
.text-primary { color: #0A2E59; } 
.bg-primary { background-color: #0A2E59; }
.text-secondary { color: #FFD700; }
.bg-secondary { background-color: #FFD700; }
.bg-accent { background-color: #34495e; }
</style>
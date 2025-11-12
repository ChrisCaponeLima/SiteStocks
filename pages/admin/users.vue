// /pages/admin/users.vue - V1.1 - CRÍTICO: Remoção da referência obsoleta ACCESS_LEVEL.GERENTE e substituição pelo número puro (1).
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// 🔑 Aplica o middleware de proteção Nível 1 (auth-level1)
definePageMeta({
 middleware: ['auth-level1'], 
 layout: 'admin', // Assumindo que você tem um layout 'admin'
 title: 'Manutenção de Usuários'
})

const authStore = useAuthStore()

// O nível mínimo para esta rota é 1, conforme auth-level1.
const MIN_REQUIRED_LEVEL = 1; 

// Verifica se o middleware falhou ou se o usuário não está logado
// A checagem de nível agora usa o número puro (1) e a função hasAccess (V6.3 da Store)
if (!authStore.isAuthenticated || !authStore.hasAccess(MIN_REQUIRED_LEVEL)) {
  // A navegação de login é tratada pelo middleware, mas este é um fail-safe
  if (process.client) {
    console.warn('Redirecionamento não esperado: Acesso não autorizado.');
  }
}
</script>

<template>
 <div class="page-container">
    <AdminUserListTable />
 </div>
</template>

<style scoped>
/* Adicione estilos específicos para o container da página, se necessário */
.page-container {
  padding: 20px;
}
</style>
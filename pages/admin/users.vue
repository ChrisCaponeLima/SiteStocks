// /pages/admin/users.vue - V1.2 - REFACTOR: Remoção da checagem redundante de nível, confiando no middleware 'auth-level1'.

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth' // Mantido apenas para referência/futuro uso, mas não usado diretamente para checagem.

// 🔑 Aplica o middleware de proteção Nível 1 (auth-level1)
// O middleware deve garantir que o usuário tenha roleLevel >= 1 ou redirecionar para /login.
definePageMeta({
middleware: ['auth-level1'], 
layout: 'admin', // Assumindo que você tem um layout 'admin'
title: 'Manutenção de Usuários'
})

// Não é necessário executar a lógica de checagem de nível aqui.
// A página está protegida pela diretiva definePageMeta.

// IMPORTANTE: Se o erro 403 persistir, o problema está no middleware (auth-level1)
// ou na injeção do token/roleLevel no lado do cliente/servidor.
</script>

<template>
  <Header pageTitle="Manutenção de Usuários" />
 
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
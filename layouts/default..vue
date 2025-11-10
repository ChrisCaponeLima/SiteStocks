// /layouts/default.vue - V1.5 - Garante hidratação da authStore antes de montar o Header
<template>
  <div>
    <AppHeader />
    <slot />
  </div>
</template>

<script setup>
// ✅ Correção crítica:
// Assegura que o Header sempre monta com authStore já hidratada
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// ✅ O init é SSR-safe no seu código e restaura:
// token (cookie)
// userLevel (cookie)
// user (localStorage)
// numeroDaConta (localStorage)
// cotistaId (localStorage)
await authStore.init()
</script>

// /app.vue - V1.2 - Ponto de entrada com Layout e importação de CSS corrigida
<script setup lang="ts">
// IMPORTAÇÃO CORRIGIDA: Usa o caminho relativo que funcionou para resolver o erro anterior.
import '../../assets/css/main.css' 
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
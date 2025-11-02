// /components/Header.vue - V1.8 - Foco no Título (Revertendo Lógica de Store)
<template>
<header class="flex items-center justify-between p-4 shadow-md bg-[#141B35] sticky top-0 z-10">
<div class="flex items-center space-x-3">
<NuxtLink to="/" class="focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-lg">
 <img
 src="/images/logo_ts_transp1.png"
 alt="SiteStocks Logo"
 class="h-12 w-auto object-contain" 
 />
 </NuxtLink>
 
  <h1 v-if="pageTitle" class="text-lg font-bold text-classic-gold">{{ pageTitle }}</h1>
</div>

<div class="flex items-center gap-4 relative">
<div> 
    <span class="font-medium text-classic-gold mr-3 text-sm">
    Cida
  </span>
 
 <div class="relative inline-block">
 <button
 class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-yellow-400 text-blue-900 focus:outline-none border-2 border-yellow-500"
 >
  <span class="text-sm font-bold">CM</span>
 </button>
 
 </div>
</div>
</div>
</header>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    pageTitle: { type: String, default: '' }
});

// A LÓGICA DE USUÁRIO DINÂMICA FOI REMOVIDA
</script>

<style scoped>
/* Definição de uma classe utilitária para a cor Dourada Clássica (#FFD700 - Ouro) */
.text-classic-gold {
 color: #D4B457;
}
</style>
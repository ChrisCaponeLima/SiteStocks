// /components/Header.vue - V1.20 - CRÍTICO: Remoção da importação ACCESS_LEVEL obsoleta que causa o erro SyntaxError.
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
 
 <div class="text-right">
  <span v-if="primeiroNome" class="font-medium text-classic-gold mr-3 text-sm block">
  {{ primeiroNome }}
  </span>
  
  <span v-if="authStore.numeroDaConta" class="text-gray-400 text-xs">
  {{ authStore.numeroDaConta }}
  </span>
  </div>
 
 <div class="relative inline-block">
 <button
  class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-yellow-400 text-blue-900 focus:outline-none border-2 border-yellow-500 transition-all duration-200"
  @click="toggleProfileMenu"
  aria-label="Abrir menu do perfil"
  :class="{ 'ring-2 ring-yellow-400': showProfileMenu }"
 >
  <span class="text-sm font-bold uppercase">{{ iniciaisNome }}</span>
 </button>
 
 
 <div
 v-if="showProfileMenu"
 class="absolute right-0 mt-2 w-48 bg-[#1F2C4D] border border-gray-700 rounded-md shadow-lg py-1 z-20"
 >
   <template v-if="authStore.isAdmin">
    <div class="px-4 py-2 text-xs font-semibold uppercase text-gray-500 border-b border-gray-700/50">
     Administração
    </div>
    <button
     @click="navigateToAdminRendimentos"
     class="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-[#2A3B5F] hover:text-yellow-300 transition-colors duration-150"
    >
     Gerar Rendimentos
    </button>
    
       <button
     @click="navigateToPixEstaticoCreator"
     class="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-[#2A3B5F] hover:text-yellow-300 transition-colors duration-150"
    >
     Criar PIX Estático
    </button>
       
    <hr class="border-gray-700/50 my-1">
   </template>
 
   <button
    @click="navigateToExtrato"
    class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2A3B5F] hover:text-white transition-colors duration-150"
   >
    Extrato
   </button>
     <hr class="border-gray-700/50 my-1">
 
  <button
  @click="handleLogout"
  class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2A3B5F] hover:text-red-300 transition-colors duration-150"
  >
  Sair
  </button>
 </div>
 </div> 
 </div>
 </header>
 </template>
 
<script setup>
 import { defineProps, ref, computed, onMounted, onUnmounted } from 'vue';
 // 🛑 ALTERAÇÃO CRÍTICA: Removendo ACCESS_LEVEL que está quebrado e causou o SyntaxError anterior.
 // ANTES: import { useAuthStore, ACCESS_LEVEL } from '~/stores/auth'; 
 import { useAuthStore } from '~/stores/auth'; 
 import { navigateTo } from '#app'; 
 
 const props = defineProps({
 pageTitle: { type: String, default: '' }
 });
 
 const authStore = useAuthStore(); 
 
 const showProfileMenu = ref(false); 
 
 // --- Lógica de Dados ---
 const primeiroNome = computed(() => {
 // Ajustado para usar authStore.user?.nome para segurança contra user ser null
 if (authStore.user?.nome) {
 return authStore.user.nome.split(' ')[0];
 }
 return '';
 });
 
 const iniciaisNome = computed(() => {
 // Ajustado para usar authStore.user?.nome para segurança contra user ser null
 if (authStore.user?.nome) {
 const partesNome = authStore.user.nome.split(' ');
 const primeiraInicial = partesNome[0].charAt(0).toUpperCase();
 const ultimaInicial = partesNome.length > 1 ? partesNome[partesNome.length - 1].charAt(0).toUpperCase() : '';
 return primeiraInicial + ultimaInicial;
 }
 return '??';
 });
 
 // --- Lógica de Interação ---
 const toggleProfileMenu = () => {
 showProfileMenu.value = !showProfileMenu.value;
 };
 
 const handleLogout = async () => {
 authStore.logout(); 
 showProfileMenu.value = false; 
 await navigateTo('/login', { replace: true }); 
 };
 
 // ✅ NOVO: Função para navegação do submenu de Administração (Gerar Rendimentos)
 const navigateToAdminRendimentos = () => {
 showProfileMenu.value = false;
 navigateTo('/admin/gerar-rendimentos');
 }
 
 // ✅ NOVO: Função para navegação do submenu de Administração (Criar PIX Estático)
 const navigateToPixEstaticoCreator = () => {
 // Comentário de alteração: Adiciona navegação para a página de criação de PIX estático.
 showProfileMenu.value = false;
 navigateTo('/admin/pix-estatico/PixEstaticoCreator');
 }
 
 // ✅ NOVO: Função para navegação do submenu de Extrato
 const navigateToExtrato = () => {
 showProfileMenu.value = false;
 navigateTo('/extrato');
 }
 
 onMounted(() => {
 if (process.client) {
  document.addEventListener('click', closeMenuOnClickOutside);
 }
 });
 
 onUnmounted(() => {
 if (process.client) {
  document.removeEventListener('click', closeMenuOnClickOutside);
 }
 });
 
 const closeMenuOnClickOutside = (event) => {
 const target = event.target;
 const isProfileButton = target.closest('button[aria-label="Abrir menu do perfil"]');
 const isProfileMenu = target.closest('.absolute.right-0.mt-2.w-48');
 
 if (!isProfileButton && !isProfileMenu) {
  showProfileMenu.value = false;
 }
 }
 </script>
 
 <style scoped>
 /* /components/Header.vue - V1.17 - Estilos específicos para o componente */
 
 .text-classic-gold {
 color: #D4B457;
 }
 </style>
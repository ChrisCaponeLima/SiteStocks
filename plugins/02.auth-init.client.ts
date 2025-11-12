// /plugins/02.auth-init.client.ts - V1.7 - CRÍTICO: REMOVIDO: Uso do hook e chamada authStore.init() que é obsoleto e causa o erro 'not a function'.

import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
// 🛑 O fluxo de autenticação agora é inicializado pelo /layouts/default.vue (chamada /me).
// Este plugin é redundante e está causando um erro de regressão.

nuxtApp.hook('app:beforeMount', async () => {
 if (process.client) {
 const authStore = useAuthStore();
 
 // 🛑 REMOVIDO: Condição !authStore.initialized
 // 🛑 REMOVIDO: await authStore.init();

 // Se houver a necessidade de forçar a limpeza de estados antigos aqui (opcional), pode-se fazê-lo.
 console.log('[Plugin 02.auth-init] Plugin obsoleto e inicialização da store de autenticação foi ignorada.');
 }
});
})
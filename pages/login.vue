<!-- /pages/login.vue - V12.7 - CORREÇÃO DE SINTAXE: Removendo o bloco <template> duplicado que causou o erro "[plugin:vite:vue] Invalid end tag".
// Anteriormente: V12.6 - Removendo o mapeamento e aninhamento redundante, e passando a resposta PLANA da API diretamente para authStore.login().
-->
<template>
   <div class="min-h-screen flex items-center justify-center overflow-hidden bg-blue-900 bg-opacity-90">
    
    <div class="w-full max-w-sm px-8 py-12">
     
     <ClientOnly>
      <div class="flex justify-center mb-8">
       <div class="p-4 rounded-full border-2 border-white/80">
        <svg class="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
       </div>
      </div>
  
      <h1 
       class="text-2xl text-white/90 font-light tracking-widest text-center mb-10 uppercase"
       style="letter-spacing: 4px;"
      >
       LOGIN
      </h1>
  
      <form @submit.prevent="handleLogin" class="space-y-8">
       
       <div>
        <div class="flex items-center border-b border-white/50 pb-2">
         <svg class="w-6 h-6 text-white/70 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
         </svg>
         <input
          type="text"
          id="cpf"
          v-model="credentials.cpf"
          placeholder="CPF"
          class="w-full bg-transparent text-white/90 placeholder-white/70 border-none focus:ring-0 focus:outline-none text-lg"
          required
         />
        </div>
       </div>
  
       <div>
        <div class="flex items-center border-b border-white/50 pb-2">
         <svg class="w-6 h-6 text-white/70 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 9a3 3 0 10-6 0v2h6V9z"></path>
         </svg>
         <input
          type="password"
          id="password"
          v-model="credentials.password"
          placeholder="Senha"
          class="w-full bg-transparent text-white/90 placeholder-white/70 border-none focus:ring-0 focus:outline-none text-lg"
          required
         />
        </div>
       </div>
  
       
       <div class="flex justify-end items-center text-sm pt-2">
        
        <NuxtLink to="/forgot-password" class="text-white/70 hover:text-white/90 transition duration-150">
         Esqueceu sua senha?
        </NuxtLink>
       </div>
       
       <div v-if="error" class="text-red-300 text-sm p-3 bg-red-800/50 rounded-lg">
        {{ error }}
       </div>
  
       <div class="pt-4">
        <button
         type="submit"
         :disabled="isLoading"
         class="w-full bg-white text-blue-900 font-bold py-3.5 rounded-full uppercase tracking-widest hover:bg-white/90 disabled:bg-white/50 disabled:text-gray-600 transition duration-150 shadow-lg"
        >
         {{ isLoading ? 'ENTRANDO...' : 'LOGIN' }}
        </button>
       </div>
      </form>
      
      <template #fallback>
       <div class="text-center p-8 text-white">Carregando formulário de login...</div>
      </template>
     </ClientOnly>
    </div>
   </div>
  </template>
  
  <script setup>
  // /pages/login.vue - V12.7 - CORREÇÃO DE SINTAXE: Removendo o bloco <template> duplicado que causou o erro.
  // A LÓGICA DE LOGIN FOI MANTIDA DA V12.6, PASSANDO A RESPOSTA PLANA DA API (V2.12) DIRETAMENTE PARA A STORE (V4.8).
  
  import { reactive, ref } from 'vue';
  import { useRouter } from 'vue-router'; 
  import { useAuthStore } from '~/stores/auth'; // <-- IMPORTAÇÃO DA STORE PINIA
  
  definePageMeta({
  layout: false 
  });
  
  const router = useRouter();
  const authStore = useAuthStore(); // <-- INSTÂNCIA DA STORE PINIA
  
  const credentials = reactive({
  cpf: '',
  password: ''
  });
  const isLoading = ref(false);
  const error = ref(null);
  
  
  const handleLogin = async () => {
  error.value = null;
  isLoading.value = true;
  
  try {
  const loginPayloadToSend = {
  cpf: credentials.cpf.trim(),
  password: credentials.password
  };
  
  // 1. Chamada à API (que retorna objeto PLANO: { token, userId, cpf, ..., numeroDaConta })
  const apiResponse = await $fetch('/api/auth', { 
  method: 'POST', 
  body: loginPayloadToSend,
  headers: { 'Content-Type': 'application/json' }
  });
  
  // ✅ CRÍTICO: Agora a Store Pinia V4.8 espera a resposta plana
  if (!apiResponse || !apiResponse.token || !apiResponse.userId) {
  throw new Error('AUTH_PAYLOAD_INVALID: Token ou ID de usuário ausente na resposta da API.');
  }
  
  // ✅ CORREÇÃO V12.6/V12.7: Chamada direta ao método 'login' da Store Pinia com a resposta PLANA da API
  if (typeof authStore.login === 'function') {
      // Passando o objeto PLANO da API diretamente, garantindo que 'numeroDaConta' seja incluído.
      authStore.login(apiResponse); 
  
    // Redirecionamento para a raiz
    await router.push({ path: '/', replace: true }); 
  
    credentials.password = '';
  } else {
      // Este erro só deve ocorrer se a função login não estiver definida na sua Store Pinia
      console.error('CRÍTICO: A Store Pinia (useAuthStore) não possui o método .login() definido ou não é uma função.');
    error.value = 'Erro interno do sistema: O método de login na Store está ausente.';
  }
  
  
  } catch (e) {
  const status = e.response?.status;
  const message = e.response?._data?.message;
  
  if (status === 401 || status === 403) {
  error.value = message || 'CPF ou senha incorretos.';
  } else if (e.message && e.message.includes('AUTH_PAYLOAD_INVALID')) {
  error.value = 'Resposta de login incompleta. Contate o administrador do sistema.';
  } else {
      // Mensagem de erro genérica para outras falhas na comunicação ou processamento
      error.value = 'Falha na comunicação com o servidor. Verifique sua conexão ou tente novamente.';
      console.error('Erro durante o login:', e);
  }
  } finally {
  isLoading.value = false;
  }
  };
  </script>
  
  <style scoped>
  /* /pages/login.vue - V12.7 - Estilos específicos para o componente */
  
  .bg-blue-900 {
   background-image: linear-gradient(180deg, #141A34 0%, #1C2A51 100%);
  }
  </style>
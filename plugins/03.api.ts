// /plugins/03.api.ts - V1.9 - CRÍTICO: Remoção de toda a lógica obsoleta (authStore.init, authStore.token, localStorage) para adequação ao fluxo JWT Cookie-only.

import { ofetch } from 'ofetch';
import type { FetchOptions } from 'ofetch';
import { useAuthStore } from '~/stores/auth';
import { watch, ref } from 'vue'; 

declare module '#app' {
 interface NuxtApp {
  $api: typeof ofetch;
 }
}

export default defineNuxtPlugin((nuxtApp) => {
 // 🛑 REMOVIDO: currentAuthToken reativo não é mais necessário, use o token da store.
 
 // ℹ️ COMENTÁRIO: Criação de uma instância customizada de `ofetch` para requisições autenticadas.
 const apiInstance = ofetch.create({
  // baseURL: '/api', 

  // ℹ️ COMENTÁRIO: Interceptor para adicionar o token de autenticação.
  async onRequest({ request, options }: { request: Parameters<typeof ofetch>[0], options: FetchOptions<'json'> }) {
   // 🛑 NOVO FLUXO: Apenas no cliente. No SSR, Nuxt já encaminha o cookie.
   if (process.client) {
    const authStore = useAuthStore();
    // 🛑 NOVO FLUXO: O token deve ser lido diretamente do Cookie, NÃO do localStorage ou Store.
    const tokenCookie = useCookie('auth_token'); 
    let tokenToUse: string | null = tokenCookie.value;

    // 🛑 REMOVIDO: Toda a lógica de `authStore.token`, `authStore.init()` e leitura de `localStorage`.
    
    // ℹ️ DEBUG: Loga o token que será usado
    console.log(`[API Interceptor] Requisição para: ${request}. Token a ser usado (Cookie): ${tokenToUse ? 'PRESENTE' : 'AUSENTE'}. (Length: ${tokenToUse?.length || 0})`);
    
    // ℹ️ COMENTÁRIO: Adiciona o token APENAS se `options.auth` não for explicitamente `false` E se o token existir.
    if (tokenToUse && options.auth !== false) {
     options.headers = options.headers || {};
     (options.headers as Record<string, string>).Authorization = `Bearer ${tokenToUse}`;
    } else {
      console.warn(`[API Interceptor] Não adicionando token para ${request}. Motivo: Token AUSENTE ou options.auth é false.`);
    }
   }
  },

  // ℹ️ COMENTÁRIO: Interceptor para tratamento de erros de resposta, especialmente 401.
  onResponseError({ request, response, options }) {
   if (process.client) {
    const authStore = useAuthStore(); 
    
    // 🛑 CRÍTICO V1.5: Adiciona verificação para _blockResponseError
    const shouldHandleGlobally = (options as any)._blockResponseError !== true;

    // ℹ️ DEBUG: Loga o erro 401/403 no interceptor
    if (response?.status === 401 || response?.status === 403) {
      console.error(`[API Interceptor - Erro ${response.status}] Requisição falhou: ${request}. Globalmente tratado: ${shouldHandleGlobally}. Mensagem: ${response.statusText}`);
    }

    // Se for 401, o usuário está autenticado E o erro não foi bloqueado localmente.
    // 🛑 CORREÇÃO: Usamos authStore.isAuthenticated (populado por /me) para checar se é um 401 de sessão expirada.
    if (response?.status === 401 && authStore.isAuthenticated.value && shouldHandleGlobally) {
     console.warn('[API Interceptor] Token expirado ou inválido detectado (401). Realizando logout automático e redirecionando.');
     authStore.logout();
     navigateTo('/login', { replace: true });
    }
    
    if (response?.status === 403 && shouldHandleGlobally) {
      console.error('[API Interceptor] Acesso Proibido (403) detectado globalmente. O componente deve tratar o erro.');
    }
   }
  }
 });

 // 🛑 REMOVIDO: Bloco `if (process.client)` com `currentAuthToken` e `watch` são obsoletos.

 // ℹ️ Comentário: Fornece a instância `apiInstance` como `$api` globalmente no NuxtApp.
 return {
  provide: {
   api: apiInstance // Injeta como $api
  }
 };
});
// /plugins/03.api.ts - V1.8 - CORREÇÃO CRÍTICA FINAL TOKEN POST (FORÇA LOCALSTORAGE + DEBUG): Adiciona debug logs no interceptor e força a leitura do token diretamente do localStorage no onRequest como último recurso, garantindo que o token esteja presente no header Authorization.

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
  // ℹ️ COMENTÁRIO: Variável reativa para armazenar o token atual (mantida, mas agora é menos crítica).
  const currentAuthToken = ref<string | null>(null);

  // ℹ️ COMENTÁRIO: Criação de uma instância customizada de `ofetch` para requisições autenticadas.
  const apiInstance = ofetch.create({
    // baseURL: '/api', 

    // ℹ️ COMENTÁRIO: Interceptor para adicionar o token de autenticação.
    async onRequest({ request, options }: { request: Parameters<typeof ofetch>[0], options: FetchOptions<'json'> }) {
      if (process.client) {
        const authStore = useAuthStore();
        let tokenToUse: string | null = null;

        // Tenta obter o token da store Pinia (abordagem padrão)
        tokenToUse = authStore.token;

        // 🛑 CRÍTICO V1.8: Se o token ainda estiver vazio, força a inicialização da store.
        if (!tokenToUse && typeof authStore.init === 'function') {
            console.warn(`[API Interceptor] Token nulo na store para ${request}. Tentando forçar init().`);
            await authStore.init(); // Força a re-hidratação
            tokenToUse = authStore.token; // Tenta obter o token novamente
        }

        // 🛑 CRÍTICO V1.8: Último recurso: Se o token ainda estiver vazio, tenta ler diretamente do localStorage.
        if (!tokenToUse) {
            console.warn(`[API Interceptor] Token ainda nulo após init() para ${request}. Tentando ler diretamente do localStorage.`);
            tokenToUse = localStorage.getItem('authToken');
            if (tokenToUse) {
                 // Opcional: Atualiza a store se encontrou no localStorage e a store não tinha.
                 // Isso pode ser uma forma de "re-hidratar" a store no meio do caminho.
                 if (!authStore.token) {
                     authStore.$patch({ token: tokenToUse, isAuthenticated: true });
                 }
            }
        }

        // ℹ️ DEBUG: Loga o token que será usado
        console.log(`[API Interceptor] Requisição para: ${request}. Token a ser usado: ${tokenToUse ? 'PRESENTE' : 'AUSENTE'}. (Length: ${tokenToUse?.length || 0})`);
        
        // ℹ️ COMENTÁRIO: Adiciona o token APENAS se `options.auth` não for explicitamente `false`.
        if (tokenToUse && options.auth !== false) {
          options.headers = options.headers || {};
          (options.headers as Record<string, string>).Authorization = `Bearer ${tokenToUse}`;
        } else {
            console.warn(`[API Interceptor] Não adicionando token para ${request}. Motivo: Token AUSENTE ou options.auth é false.`);
        }
      }
    },

    // ℹ️ COMENTÁRIO: Interceptor para tratamento de erros de resposta, especialmente 401 (inalterado da V1.5).
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
        if (response?.status === 401 && authStore.isAuthenticated && shouldHandleGlobally) {
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

  // ℹ️ COMENTÁRIO: Observador para manter `currentAuthToken` sincronizado (mantido, mas agora é menos crítico).
  if (process.client) {
    const authStore = useAuthStore();
    currentAuthToken.value = authStore.token; 
    
    watch(() => authStore.token, (newToken) => {
      currentAuthToken.value = newToken;
    }, { immediate: true }); 
  }

  // ℹ️ Comentário: Fornece a instância `apiInstance` como `$api` globalmente no NuxtApp.
  return {
    provide: {
      api: apiInstance // Injeta como $api
    }
  };
});
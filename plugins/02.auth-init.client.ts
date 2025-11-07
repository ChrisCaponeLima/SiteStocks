// /plugins/02.auth-init.client.ts - V1.6 - Usa app:beforeMount para garantir o contexto Pinia (getActivePinia fix)
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  // ✅ CORREÇÃO: Usamos o hook 'app:beforeMount' para garantir que o Pinia (já com persistência) esteja ativo.
  nuxtApp.hook('app:beforeMount', async () => {
    if (process.client) {
      // A chamada ao useAuthStore() agora é segura DENTRO deste hook.
      const authStore = useAuthStore();
      
      if (!authStore.initialized) {
        // Aguarda a inicialização síncrona da store (V4.0).
        await authStore.init();
      }
    }
  });
})
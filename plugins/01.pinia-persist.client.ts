// /plugins/01.pinia-persist.client.ts - V2.0 - Correção CRÍTICA: Uso de hook app:created para aplicar persistência
import { createPersistedState } from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    // 🚨 CORREÇÃO: Usamos o hook 'app:created' (após a instância do Pinia ser criada, mas antes da montagem)
    // para garantir que a instância exista e evitar o Erro 500 no SSR.
    nuxtApp.hook('app:created', (app) => {
      // O acesso à instância do Pinia através do Vue App é a forma mais segura no hook 'app:created'.
      const piniaInstance = app.config.globalProperties.$pinia;

      if (piniaInstance) {
        piniaInstance.use(
          createPersistedState({
            storage: localStorage,
          })
        );
      }
    });
  }
});
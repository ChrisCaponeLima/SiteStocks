<!-- /layouts/default.vue - V2.0 - Arquitetura segura HTTP-only -->
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { navigateTo, useRoute } from '#app'
import Header from '~/components/xHeader.vue'

const authStore = useAuthStore()
const route = useRoute()

/*
 ------------------------------------------------------
 1. SSR: Validação imediata via /api/auth/me
 ------------------------------------------------------
 - Sempre roda no SSR antes do template renderizar.
 - Se o token no cookie for válido, recebe payload do usuário.
 - Se token inválido ou expirado → retorna null e status 401.
*/
const { data: meResponse, error } = await useAsyncData(
  'auth:me',
  () => $fetch('/api/auth/me'),
  {
    lazy: false,
    server: true,
    transform: (response: any) => {
      return response && response.user ? response : null
    }
  }
)

/*
 ------------------------------------------------------
 2. Preenchimento imediato da store (SSR + CSR)
 ------------------------------------------------------
*/
authStore.fillAuthStore(meResponse.value)

if (error.value || !authStore.isAuthenticated) {
  authStore.fillAuthStore(null)
}

/*
 ------------------------------------------------------
 3. Regras de Rotas Públicas / Privadas
 ------------------------------------------------------
*/
const publicPages = ['/login']
const authRequired = !publicPages.includes(route.path)

/*
 ------------------------------------------------------
 4. Redirecionamento SSR → Antes de qualquer renderização
 ------------------------------------------------------
*/
if (authRequired && !authStore.isAuthenticated) {
  await navigateTo('/login', { replace: true })
}

if (authStore.isAuthenticated && route.path === '/login') {
  await navigateTo('/', { replace: true })
}

/*
 ------------------------------------------------------
 5. Se o código chegou aqui:
    - Usuário autenticado
    - Ou rota pública
 ------------------------------------------------------
*/
</script>

<template>
  <div>
    <Header />
    <slot />
  </div>
</template>

<!-- /layouts/default.vue - V2.3 - SSR persistente com Cookie HTTP-only -->
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import Header from '~/components/Header.vue'
import { useRoute, navigateTo, useAsyncData } from '#app'

const authStore = useAuthStore()
const route = useRoute()

// Páginas públicas (não exigem autenticação)
const publicPages = ['/login', '/forgot-password']

/*
 ------------------------------------------------------
 SSR + CSR: Validação via /api/auth/me
 ------------------------------------------------------
*/
const { data: meData, error } = await useAsyncData(
  'auth-me',
  () => $fetch('/api/auth/me'),
  {
    server: true,
    lazy: false,
    transform: (res: any) => res || null,
  }
)

// Preenche store (SSR)
if (meData.value) {
  authStore.fillAuthStore(meData.value)
} else {
  authStore.fillAuthStore(null)
}

// Redirecionamentos automáticos (SSR seguro)
if (!publicPages.includes(route.path) && !authStore.isAuthenticated) {
  await navigateTo('/login', { replace: true })
}

if (authStore.isAuthenticated && route.path === '/login') {
  await navigateTo('/', { replace: true })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Header />
    <main>
      <slot />
    </main>
  </div>
</template>

<!-- /pages/login.vue - V14.1 - Ajuste final para arquitetura HTTP-only -->
<template>
  <div class="min-h-screen flex items-center justify-center overflow-hidden bg-blue-900 bg-opacity-90">

    <div class="w-full max-w-sm px-8 py-12">

      <!-- Ícone -->
      <div class="flex justify-center mb-8">
        <div class="p-4 rounded-full border-2 border-white/80">
          <svg class="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
      </div>

      <h1
        class="text-2xl text-white/90 font-light tracking-widest text-center mb-10 uppercase"
        style="letter-spacing: 4px;">
        LOGIN
      </h1>

      <form @submit.prevent="handleLogin" class="space-y-8">

        <!-- CPF -->
        <div>
          <div class="flex items-center border-b border-white/50 pb-2">
            <svg class="w-6 h-6 text-white/70 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>

            <input
              type="text"
              v-model="credentials.cpf"
              placeholder="CPF"
              class="w-full bg-transparent text-white/90 placeholder-white/70 border-none focus:ring-0 focus:outline-none text-lg"
              required
            />
          </div>
        </div>

        <!-- Senha -->
        <div>
          <div class="flex items-center border-b border-white/50 pb-2">
            <svg class="w-6 h-6 text-white/70 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M15 9a3 3 0 10-6 0v2h6V9z"/>
            </svg>

            <input
              type="password"
              v-model="credentials.password"
              placeholder="Senha"
              class="w-full bg-transparent text-white/90 placeholder-white/70 border-none focus:ring-0 focus:outline-none text-lg"
              required
            />
          </div>
        </div>

        <!-- Forgot password -->
        <div class="flex justify-end items-center text-sm pt-2">
          <NuxtLink
            to="/forgot-password"
            class="text-white/70 hover:text-white/90 transition duration-150">
            Esqueceu sua senha?
          </NuxtLink>
        </div>

        <!-- Error -->
        <div v-if="error" class="text-red-300 text-sm p-3 bg-red-800/50 rounded-lg">
          {{ error }}
        </div>

        <!-- Button -->
        <div class="pt-4">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-white text-blue-900 font-bold py-3.5 rounded-full uppercase tracking-widest
                   hover:bg-white/90 disabled:bg-white/50 disabled:text-gray-600
                   transition duration-150 shadow-lg">

            {{ isLoading ? 'ENTRANDO...' : 'LOGIN' }}

          </button>
        </div>

      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({
  cpf: '',
  password: ''
})

const isLoading = ref(false)
const error = ref<string | null>(null)

const handleLogin = async () => {
  error.value = null
  isLoading.value = true

  try {
    const payload = {
      cpf: credentials.cpf.trim(),
      password: credentials.password
    }

    // (1) LOGIN: cria cookie HttpOnly
    await $fetch('/api/auth', {
      method: 'POST',
      body: payload
    })

    credentials.password = ''

    // (2) Busca dados da sessão via Cookie
    const me = await $fetch('/api/auth/me')

    // (3) Preenche a store com segurança
    authStore.fillAuthStore(me)

    // (4) Update DOM
    await nextTick()
    isLoading.value = false

    // (5) Redirect seguro
    router.push('/')

  } catch (e: any) {
    const status = e?.response?.status
    const msg = e?.response?._data?.message

    if (status === 401 || status === 403) {
      error.value = msg || 'CPF ou senha incorretos.'
    } else {
      error.value = 'Falha ao comunicar com o servidor. Tente novamente.'
    }

    isLoading.value = false
  }
}
</script>

<style scoped>
.bg-blue-900 {
  background-image: linear-gradient(180deg, #141A34 0%, #1C2A51 100%);
}
</style>

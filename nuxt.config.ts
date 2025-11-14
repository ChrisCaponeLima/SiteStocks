// /nuxt.config.ts - V6.4 - Adição do suporte a runtimeConfig.public.apiBase para uso dinâmico no plugin 03.api.ts.

export default defineNuxtConfig({
  // ✅ Habilita SSR (essencial para persistência de sessão via cookie)
  ssr: true,

  devtools: { enabled: true },

  // ✅ CSS global
  css: ['~/assets/css/main.css'],

  // ✅ Módulos utilizados
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'nuxt-qrcode',
  ],

  // ✅ Configurações de runtime
  runtimeConfig: {
    // Somente servidor (ex: Prisma)
    databaseUrl: process.env.DATABASE_URL,

    // Configuração pública (acessível no cliente)
    public: {
      // 🆕 Base URL dinâmica para $api
      // Em dev: '/api'
      // Em prod: pode apontar para um domínio/API externa via variável de ambiente NUXT_PUBLIC_API_BASE
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      apiBaseServer: process.env.NUXT_PUBLIC_API_BASE_SERVER,
      apiBaseClient: process.env.NUXT_PUBLIC_API_BASE_CLIENT,
    },
  },

  // ✅ Nitro - evita empacotamento de libs server-side
  nitro: {
    externals: {
      external: ['bcryptjs'],
    },
  },
});

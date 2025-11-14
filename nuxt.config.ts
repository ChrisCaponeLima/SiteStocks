// /nuxt.config.ts - V6.4.1 - Garantias de fallback para apiBaseServer/apiBaseClient
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
      /**
       * apiBase: base pública padrão. Em dev fica '/api'.
       * Para produção, você pode setar NUXT_PUBLIC_API_BASE (ex: '/api' ou 'https://site-stocks.vercel.app')
       *
       * apiBaseServer / apiBaseClient: variáveis opcionais. Se não forem fornecidas,
       * caem de volta para `apiBase` (evita undefined).
       */
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      apiBaseServer:
        process.env.NUXT_PUBLIC_API_BASE_SERVER ||
        process.env.NUXT_PUBLIC_API_BASE ||
        '/api',
      apiBaseClient:
        process.env.NUXT_PUBLIC_API_BASE_CLIENT ||
        process.env.NUXT_PUBLIC_API_BASE ||
        '/api',
    },
  },

  // ✅ Nitro - evita empacotamento de libs server-side
  nitro: {
    externals: {
      external: ['bcryptjs'],
    },
  },
});

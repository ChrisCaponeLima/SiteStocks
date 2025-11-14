// /nuxt.config.ts - V6.4.1 - Garantias de runtimeConfig e fallbacks para NUXT_PUBLIC_API_BASE
export default defineNuxtConfig({
  // Habilita SSR para preservar cookies HTTPOnly e permitir fetch SSR-safe
  ssr: true,

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt', // necessário para useAuthStore funcionar em plugins
    'nuxt-qrcode',
  ],

  // runtimeConfig: server-only + public
  runtimeConfig: {
    // somento servidor (e.g. Prisma)
    databaseUrl: process.env.DATABASE_URL,

    public: {
      /**
       * Para produção: definir a variável NUXT_PUBLIC_API_BASE em Vercel.
       * Ex: https://api.site-stocks.vercel.app  OR  "/api" (quando front+api mesmo host)
       *
       * Observação: mantemos apiBaseServer/apiBaseClient para casos especiais.
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

  // Nitro externals para evitar empacotar libs server-side (ex.: bcrypt)
  nitro: {
    externals: {
      external: ['bcryptjs'],
    },
  },
})

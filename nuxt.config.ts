// /nuxt.config.ts - V6.4.2 - ESTÁVEL PARA VERCEL
// 🔧 Unificado apiBase para ambiente server/client
// 🔧 Compatível com execução serverless da Vercel
// 🔧 Mantém SSR e Cookie-only JWT funcionando

export default defineNuxtConfig({
  ssr: true,

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'nuxt-qrcode',
  ],

  runtimeConfig: {
    // Server-only
    databaseUrl: process.env.DATABASE_URL,

    public: {
      /**
       * apiBase:
       * - Em dev → "/api"
       * - Em produção:
       *    SE o backend rodar no mesmo domínio => "/api"
       *    SE o backend for externo => "https://api.site-stocks.vercel.app/api"
       *
       * Vercel NÃO usa apiBaseServer/apiBaseClient.
       */
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },

  nitro: {
    externals: {
      external: ['bcryptjs'],
    },
  },
})

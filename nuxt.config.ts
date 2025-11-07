// /nuxt.config.ts - V6.3 - Adição do módulo '@pinia/nuxt' para resolver o erro 'getActivePinia' no plugin de inicialização.
// Removida a linha "import { defineNuxtConfig from 'nuxt'"

export default defineNuxtConfig({
// ESSENCIAL: Habilitar o SSR
ssr: true,

// Configuração padrão de desenvolvimento
devtools: { enabled: true },

// Caminho para o arquivo CSS de entrada global/Tailwind
css: [
 '~/assets/css/main.css'
],

// Módulos usados no projeto
modules: [
 '@nuxtjs/tailwindcss',
    // V6.3 - Adição essencial do módulo Pinia para que useAuthStore funcione
    '@pinia/nuxt',
  // V6.2 - Adição do módulo 'nuxt-qrcode' (Solução 1 para o gerador de Pix)
  'nuxt-qrcode'
],

// Configuração para disponibilizar variáveis de ambiente no runtime.
runtimeConfig: {
 // Variável SOMENTE para o Servidor (onde o Prisma roda)
 databaseUrl: process.env.DATABASE_URL, 
 
 // Configuração pública (acessível no cliente)
 public: {}
},

// ----------------------------------------------------------------------
// ✅ CORREÇÃO PÓS-BUILD: Configuração do Nitro para Externalizar Módulos
// O pacote 'bcryptjs' é de uso exclusivo do servidor (API endpoints). 
// Esta configuração impede que o Vite/Nuxt tente empacotá-lo para o cliente,
// resolvendo o erro "Cannot find package 'bcryptjs'".
// ----------------------------------------------------------------------
nitro: {
 externals: {
 external: ['bcryptjs'],
 }
}
// ----------------------------------------------------------------------
});
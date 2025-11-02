// /nuxt.config.cjs - V3.0 - ALTERAÇÃO PARA MÓDULO COMMONJS (CJS) PARA RESOLVER ERRO DE IMPORTAÇÃO
// Removida a linha "import { defineNuxtConfig } from 'nuxt'"

const { defineNuxtConfig } = require('nuxt'); // Usa require em vez de import

module.exports = defineNuxtConfig({
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
    '@nuxtjs/tailwindcss'
  ],

  // Configuração para disponibilizar variáveis de ambiente no runtime.
  runtimeConfig: {
    // Variável SOMENTE para o Servidor (onde o Prisma roda)
    databaseUrl: process.env.DATABASE_URL, 
    
    // Configuração pública (acessível no cliente)
    public: {}
  }
});
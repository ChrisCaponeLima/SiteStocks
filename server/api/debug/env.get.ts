// /server/api/debug/env.get.ts - V1.0
// 🐞 DEBUG: Exibe o estado real das variáveis de ambiente no servidor (sem expor valores sensíveis).

import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {

  return {
    success: true,
    // MOSTRA APENAS SE ESTÃO CARREGADAS, NÃO O VALOR
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      NITRO_PRESET: process.env.NITRO_PRESET || null,

      DATABASE_URL: !!process.env.DATABASE_URL,
      CRON_JOB_SECRET: !!process.env.CRON_JOB_SECRET,
      NUXT_PUBLIC_API_BASE: !!process.env.NUXT_PUBLIC_API_BASE,

      // COMPARAÇÃO EXTRA — importante para descobrir erro de nome
      'env keys loaded': Object.keys(process.env).filter(k =>
        k.toUpperCase().includes('CRON') ||
        k.toUpperCase().includes('NUXT') ||
        k.toUpperCase().includes('API') ||
        k.toUpperCase().includes('DATABASE')
      ),
    },

    message: 'DEBUG ENV ativo. Nenhum valor sensível foi exposto.'
  }
})

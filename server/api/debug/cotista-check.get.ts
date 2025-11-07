// /server/api/debug/cotista-check.get.ts - V1.1 - Endpoint de diagnóstico atualizado para verificar a presença do Cotista ID 5.
import { defineEventHandler } from 'h3'
import { usePrisma } from '~/server/utils/prisma'

/**
 * Endpoint de diagnóstico para verificar se o Cotista com ID 5 está presente
 * e funcionando corretamente no DB. 
 * Rota: /api/debug/cotista-check
 */
export default defineEventHandler(async () => {
    const prisma = usePrisma()
    // V1.1 - ATUALIZADO: Usando o ID 5 conforme solicitação do cliente.
    const COTISTA_ID_TEST = 5; 

    try {
        const cotista = await prisma.cotista.findUnique({
            where: { id: COTISTA_ID_TEST },
            select: { 
                id: true,
                numeroDaConta: true,
            }
        });

        if (cotista) {
            return {
                status: 'SUCESSO',
                message: `Cotista ID ${COTISTA_ID_TEST} encontrado. O problema 500 não é de chave estrangeira/cotista ausente.`,
                cotista: cotista
            };
        } else {
            return {
                status: 'FALHA - CHAVE ESTRANGEIRA',
                message: `Cotista ID ${COTISTA_ID_TEST} NÃO encontrado. Você precisa criar um registro na tabela 'Cotista' com id = 5.`,
            };
        }
    } catch (error: any) {
        console.error('ERRO CRÍTICO no acesso ao DB:', error);
        
        return {
            status: 'ERRO CRÍTICO - INFRAESTRUTURA',
            message: 'Ocorreu um erro ao tentar acessar a tabela Cotista. Verifique a conexão do Neon (DATABASE_URL) ou se as migrações foram aplicadas.',
            details: error.message,
            code: error.code || null,
        };
    }
});
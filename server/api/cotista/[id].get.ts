// /server/api/cotista/[id].get.ts - V1.7 - OTIMIZAÇÃO: Utiliza a nova função 'authorizeCotista' para validação e autorização.
import { defineEventHandler, createError, H3Event, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/db' 
import { authorizeCotista } from '~/server/utils/auth' // ✅ Importando a nova função

// Tipo de dados de retorno da API 
interface CotistaData {
  id: number;
  numeroDaConta: string;
}

export default defineEventHandler(async (event: H3Event): Promise<CotistaData> => {
    try { 
        // 1. EXTRAÇÃO E VALIDAÇÃO DE ID
        const cotistaIdParam = getRouterParam(event, 'id');
        const requestedCotistaId = Number(cotistaIdParam);

        if (isNaN(requestedCotistaId)) {
            throw createError({ statusCode: 400, statusMessage: 'ID do Cotista na rota é inválido.' });
        }

        // 2. AUTENTICAÇÃO E AUTORIZAÇÃO CENTRALIZADAS
        // Se autorizado, retorna o payload. Se não, lança um erro 401 ou 403.
        const authPayload = authorizeCotista(event, requestedCotistaId); 
        // console.log('Cotista autorizado:', authPayload); // Para depuração, se necessário

        // 3. BUSCA NO BANCO DE DADOS
        const cotistaData = await prisma.cotista.findUnique({
            where: { id: requestedCotistaId },
            select: {
                id: true,
                numeroDaConta: true, 
            }
        })
            
            if (!cotistaData) {
                throw createError({ statusCode: 404, statusMessage: `Cotista ID ${requestedCotistaId} não encontrado.` })
            }

        // 4. RETORNO DOS DADOS
        return {
            id: cotistaData.id,
            numeroDaConta: cotistaData.numeroDaConta, 
        }

    } catch (error: any) {
        console.error(`ERRO no endpoint /api/cotista/[id].get.ts para ID ${getRouterParam(event, 'id')}:`, error);

        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erro interno inesperado no servidor ao buscar dados do cotista.',
            message: 'Verifique os logs do servidor para mais detalhes.'
        });
    }
})
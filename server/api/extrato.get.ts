// /server/api/extrato.get.ts - V2.2 - CORREÇÃO CRÍTICA: Removida a tag <script setup> injetada incorretamente. Reverte obtenção do cotistaId para QUERY para espelhar a API Summary funcional.

import { defineEventHandler, createError, getQuery, H3Event } from 'h3'
import { prisma } from '~/server/utils/db' 
// import { verifyToken } from '~/server/utils/auth' // Removido
// import { parse as parseCookie } from 'cookie' // Removido

// Tipo de dados esperado, agora lido do contexto do evento (MANTIDO para tipagem, mas não usado diretamente para autenticação)
interface AuthPayload {
userId: number
role: string
roleLevel: number
cotistaId?: number; 
}

// Tipagem para os parâmetros da query
interface ExtratoQuery {
startDate?: string;
endDate?: string;
cotistaId?: string; // ✅ cotistaId na tipagem de query
}

export default defineEventHandler(async (event: H3Event) => {
// 1. OBTENÇÃO DO cotistaId (Espelhando a API Summary funcional)
const query = getQuery<ExtratoQuery>(event)
const { startDate, endDate } = query;
const cotistaId = Number(query.cotistaId);

// Garante que o cotistaId é obrigatório.
if (isNaN(cotistaId) || cotistaId <= 0) {
 throw createError({ 
 statusCode: 400, 
 statusMessage: 'ID do cotista é obrigatório e inválido na requisição.' 
 });
}

try {
 // 2. LÓGICA DE BUSCA DO EXTRATO
 
 // 2.1 Busca o nome do cotista
 const cotista = await prisma.cotista.findUnique({
 where: { id: cotistaId },
 select: { 
  user: {
  select: {
   nome: true
  }
  }
 }
 });
 
 const cotistaNome = cotista?.user?.nome || `ID ${cotistaId}`;
 
 // 2.2 Monta as condições de filtro de data
 const dateFilter: { gte?: Date, lte?: Date } = {};
 if (startDate) {
 const start = new Date(startDate);
 start.setHours(0, 0, 0, 0); 
 dateFilter.gte = start;
 }
 if (endDate) {
 const end = new Date(endDate);
 end.setHours(23, 59, 59, 999); 
 dateFilter.lte = end;
 }
 
 // 2.3 Busca as movimentações (filtra pelo cotistaId da query)
 const extrato = await prisma.movimentacaoCotista.findMany({
 where: {
  cotistaId: cotistaId,
  ...(startDate || endDate ? { dataMovimentacao: dateFilter } : {})
 },
 orderBy: {
  dataMovimentacao: 'asc' // Extrato em ordem cronológica
 },
 select: {
  id: true,
  dataMovimentacao: true,
  tipo: true,
  valor: true,
 }
 })
 
 // 2.4 Mapeia o resultado
 const mappedExtrato = extrato.map(item => ({
 id: item.id,
 data: item.dataMovimentacao.toISOString(), 
 tipo: item.tipo as 'APORTE' | 'RESGATE' | 'RENDIMENTO',
 valor: item.valor.toNumber(),
 }));


 return {
 cotistaNome: cotistaNome,
 extrato: mappedExtrato
 }

} catch (error: any) {
 console.error(`Erro ao buscar extrato para Cotista ID ${cotistaId}:`, error)
 throw createError({
 statusCode: 500,
 statusMessage: `Erro interno ao buscar o extrato: ${error.message || 'Detalhe não disponível'}`
 })
} 
})
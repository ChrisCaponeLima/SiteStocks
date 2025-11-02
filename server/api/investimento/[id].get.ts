// /server/api/investimento/[id].get.ts - V1.0 - Simulação de API Route para dados de cotista
import { defineEventHandler, getRouterParam } from 'h3'

// Variável para simular dados de um banco de dados
const DADOS_SIMULADOS = {
  1: {
    id: 1,
    nome: 'Cida Miranda',
    capitalInicial: 50000,
    fundo: {
      nome: 'Jaguar Alpha Fundo',
      taxaAdm: 0.005, // 0.5% ao mês (corrigido para algo mais realista)
      taxaBenchmark: 0.003, // 0.3% ao mês (Poupança/CDI)
      historicoRentabilidade: [
        // Simulando 9 meses de investimento (Nov/24 a Jul/25)
        { mesAno: '2024-11-01', valorFundo: 50250.00, valorPoupanca: 50150.00 },
        { mesAno: '2024-12-01', valorFundo: 50501.25, valorPoupanca: 50300.45 },
        { mesAno: '2025-01-01', valorFundo: 50753.75, valorPoupanca: 50451.35 },
        { mesAno: '2025-02-01', valorFundo: 51007.52, valorPoupanca: 50602.71 },
        { mesAno: '2025-03-01', valorFundo: 51262.56, valorPoupanca: 50754.54 },
        { mesAno: '2025-04-01', valorFundo: 51518.87, valorPoupanca: 50906.84 },
        { mesAno: '2025-05-01', valorFundo: 51776.47, valorPoupanca: 51059.61 },
        { mesAno: '2025-06-01', valorFundo: 52035.35, valorPoupanca: 51212.87 },
        { mesAno: '2025-07-01', valorFundo: 52295.53, valorPoupanca: 51366.62 } // Mês Atualizado
      ],
    },
    // Removido o campo 'analise' para ser gerado pelo LLM no frontend
  },
  // Aqui entrariam outros IDs, se necessário
};

/**
 * Define o manipulador de eventos para a rota /api/investimento/[id].
 * Esta função é executada no lado do servidor (Server Route).
 */
export default defineEventHandler((event) => {
  // 1. Obtém o parâmetro 'id' da URL (o '1' em /api/investimento/1)
  const id = getRouterParam(event, 'id');
  const cotistaId = Number(id);

  if (isNaN(cotistaId) || !DADOS_SIMULADOS[cotistaId]) {
    // 2. Lança um erro se o ID for inválido ou não encontrado
    throw createError({
      statusCode: 404,
      statusMessage: `Cotista com ID ${id} não encontrado.`,
    });
  }

  // 3. Retorna os dados do cotista
  return DADOS_SIMULADOS[cotistaId];
});
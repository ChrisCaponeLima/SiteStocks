// /pages/index.vue - V4.0 - Refatoração do layout para design elegante e profissional
<script setup lang="ts">
// IMPORTS E LÓGICA (MANTIDA INTEGRALMENTE)
import { ref, computed } from 'vue'

// Verificação de Variáveis: Mantendo COTISTA_ID em maiúsculas por ser uma constante global de contexto
const COTISTA_ID = 1

// Busca dos dados no nosso Server API Route
const { data: cotista, pending, error } = await useFetch(`/api/investimento/${COTISTA_ID}`)

// Variáveis para a Análise LLM
// Verificação de Variáveis: analysisResult, isGenerating, showAnalysis estão no padrão camelCase.
const analysisResult = ref('')
const isGenerating = ref(false)
const showAnalysis = ref(false)

// Variáveis computadas
const formatCurrency = (value: number | string) => {
return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

// Valores principais
const initialInvestment = computed(() => Number(cotista.value?.capitalInicial || 0))
const fundRate = computed(() => Number(cotista.value?.fundo?.taxaAdm || 0.04))
const historico = computed(() => cotista.value?.fundo?.historicoRentabilidade || [])

const currentFundValue = computed(() => {
if (historico.value.length === 0) return initialInvestment.value
return Number(historico.value[historico.value.length - 1].valorFundo)
})

const currentPoupancaValue = computed(() => {
if (historico.value.length === 0) return initialInvestment.value
return Number(historico.value[historico.value.length - 1].valorPoupanca)
})

const totalEarnings = computed(() => currentFundValue.value - initialInvestment.value)

// Dados para o Gráfico de Linha (Crescimento)
const growthChartData = computed(() => {
const labels = ['Out/24 (Início)']
const fundHistory = [initialInvestment.value]
const poupancaHistory = [initialInvestment.value]

historico.value.forEach((item) => {
 const date = new Date(item.mesAno)
 const monthLabel = `${date.toLocaleString('pt-BR', { month: 'short' })}/${date.getFullYear().toString().slice(-2)}`
 labels.push(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1))
 fundHistory.push(Number(item.valorFundo))
 poupancaHistory.push(Number(item.valorPoupanca))
})

if (labels.length > 1) {
 labels[labels.length - 1] += ' (Atual)'
}

return {
 labels,
 datasets: [
 {
  label: 'Fundo de Investimento',
  data: fundHistory,
  borderColor: '#0A2E59', 
  backgroundColor: 'rgba(10, 46, 89, 0.1)', 
  fill: true,
  tension: 0.3
 },
 {
  label: 'Poupança',
  data: poupancaHistory,
  borderColor: '#3498db', 
  backgroundColor: 'rgba(52, 152, 219, 0.1)', 
  fill: true,
  tension: 0.3
 }
 ]
}
})

// Opções do Gráfico de Linha (Necessário para passar como prop)
const growthChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { ticks: { callback: (value: number) => formatCurrency(value) } }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: any) => {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
          return label;
        }
      }
    }
  }
}))


// Dados para o Gráfico de Donut (Composição)
const compositionDonutData = computed(() => {
return {
 labels: ['Capital Inicial', 'Rendimentos'],
 datasets: [{
 data: [initialInvestment.value, totalEarnings.value],
 backgroundColor: ['#0A2E59', '#FFD700'], 
 borderColor: '#FFFFFF',
 borderWidth: 4,
 hoverOffset: 8
 }]
}
})

// Opções do Donut Chart (Adicionado)
const compositionDonutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        // Usa a cor primária para o texto da legenda
        color: '#0A2E59', 
        font: {
          size: 14,
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.parsed;
          const total = initialInvestment.value + totalEarnings.value;
          const percentage = ((value / total) * 100).toFixed(1) + '%';
          return `${context.label}: ${formatCurrency(value)} (${percentage})`;
        }
      }
    }
  }
}))


// Dados para a Tabela Mês a Mês (MANTIDO)
const tableData = computed(() => {
return historico.value.map((item, index) => {
 const fundValue = Number(item.valorFundo)
 const poupancaValue = Number(item.valorPoupanca)
 
 let fundEarnings = 0
 let poupancaEarnings = 0
 
 if (index === 0) {
 fundEarnings = fundValue - initialInvestment.value;
 poupancaEarnings = poupancaValue - initialInvestment.value;
 } else {
 const prevFundValue = Number(historico.value[index - 1].valorFundo);
 const prevPoupancaValue = Number(historico.value[index - 1].valorPoupanca);
 fundEarnings = fundValue - prevFundValue;
 poupancaEarnings = poupancaValue - prevPoupancaValue;
 }

 return {
 month: index + 1,
 fundDisplay: formatCurrency(fundValue),
 poupancaDisplay: formatCurrency(poupancaValue),
 diffDisplay: formatCurrency(fundEarnings - poupancaEarnings)
 }
})
})

// Lógica de Geração de Análise (LLM) - MANTIDO
const generateAnalysis = async () => {
isGenerating.value = true
showAnalysis.value = true
analysisResult.value = ''

const initialInvestmentDisplay = initialInvestment.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 const currentFundValueDisplay = currentFundValue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const prompt = `Com base nos dados de investimento de Cida Miranda:
- Investimento Inicial: R$ ${initialInvestmentDisplay}
- Taxa de Rendimento Mensal do Fundo: ${fundRate.value * 100}%
- Período total de investimento: ${historico.value.length} meses (de 23/10/2024 a 24/06/2025)
- Valor Atual do Fundo: R$ ${currentFundValueDisplay}

Gere uma breve análise personalizada do desempenho deste investimento.
1. Destaque: A importância da taxa de juros e do tempo, usando os valores reais de Cida para ilustrar.
2. Sugestões de Aportes Mensais: Inclua sugestões de aportes mensais, como R$50, R$100, R$200, explicando o impacto qualitativo de cada um no crescimento do patrimônio (por exemplo, "aceleraria ainda mais o seu crescimento", "ampliaria significativamente seu patrimônio", "potencializaria seus ganhos"). Não calcule valores exatos de projeção, mas enfatize a ideia de aceleração e potencial.
3. Projeção Motivacional (Curta): Uma frase sobre o potencial de crescimento futuro se o investimento for mantido e com aportes consistentes.
4. Tom: Encorajador e informativo.
5. Formato: Um parágrafo coeso.
`
try {
 await new Promise(resolve => setTimeout(resolve, 2000)) 

 analysisResult.value = `Parabéns, Cida Miranda, seu investimento inicial de ${formatCurrency(initialInvestment.value)} no Fundo Jaguar Alpha demonstrou a força da rentabilidade de ${fundRate.value * 100}% ao mês. Seu patrimônio atual de ${formatCurrency(currentFundValue.value)} já supera significativamente a Poupança, comprovando que a escolha da taxa de juros correta é crucial para a multiplicação do capital ao longo do tempo. Para **acelerar ainda mais o seu crescimento**, aportes mensais de **R$50** já fariam uma grande diferença; **R$100** ampliaria significativamente seu patrimônio; e com **R$200**, você potencializaria seus ganhos, aproveitando o poder dos juros compostos. Continue acompanhando e investindo, pois seu dinheiro está trabalhando duro: **A consistência hoje garante a tranquilidade financeira de amanhã!**`

} catch (err) {
 analysisResult.value = 'Não foi possível gerar a análise. Tente novamente.'
} finally {
 isGenerating.value = false
}
}

// Configuração de SEO/Título da Página
useHead({
title: `Infográfico: Meu Investimento - ${cotista.value?.nome || 'Carregando'}`,
meta: [
 { name: 'description', content: 'Visualize a evolução do seu investimento com dados reais.' }
],
// REMOVIDO: A tag <style> com classes Tailwind não é a melhor prática para o useHead.
})
</script>

<template>
  <div v-if="pending" class="flex justify-center items-center min-h-[80vh] text-xl text-blue-900">
    <svg class="animate-spin -ml-1 mr-3 h-6 w-6 text-blue-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Carregando Dados do Investimento...
  </div>

  <div v-else-if="error || !cotista" class="max-w-4xl mx-auto p-8 text-center text-red-700 bg-red-50 rounded-lg m-4 shadow-lg">
    <h1 class="text-2xl font-bold mb-3">⚠️ Erro ao Carregar os Dados</h1>
    <p>Não foi possível buscar as informações do cotista. Verifique a conexão com o banco de dados e o ID.</p>
    <p v-if="error" class="mt-2 text-sm text-red-500">Detalhes: {{ error }}</p>
  </div>

  <div v-else class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

    <header class="text-center">
      <h1 class="text-3xl font-extrabold text-blue-900 mb-1">Olá, {{ cotista.nome }}!</h1>
      <p class="text-xl text-gray-500 max-w-3xl mx-auto">Seu Infográfico de Performance</p>
    </header>

    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card bg-blue-900 text-white p-5 rounded-xl shadow-lg transform transition duration-300 hover:scale-[1.02]">
        <h3 class="font-semibold text-lg text-yellow-300 mb-1">Patrimônio Atual (Fundo)</h3>
        <p class="text-4xl font-extrabold">{{ formatCurrency(currentFundValue) }}</p>
        <p class="text-sm text-gray-300 mt-1">Ganhos: {{ formatCurrency(totalEarnings) }}</p>
      </div>

      <div class="card bg-gray-100 text-blue-900 p-5 rounded-xl shadow-md border border-gray-200">
        <h3 class="font-semibold text-sm text-gray-600 mb-1">Se estivesse na Poupança</h3>
        <p class="text-2xl font-bold">{{ formatCurrency(currentPoupancaValue) }}</p>
      </div>

      <div class="card bg-gray-100 text-blue-900 p-5 rounded-xl shadow-md border border-gray-200">
        <h3 class="font-semibold text-sm text-gray-600 mb-1">Taxa Mensal do Fundo</h3>
        <p class="text-2xl font-bold">{{ fundRate * 100 }}% a.m.</p>
      </div>
    </section>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <section class="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 class="text-xl font-bold text-blue-900 mb-4">Evolução do Patrimônio vs. Poupança</h2>
        <div class="h-[40vh] min-h-[300px] w-full">
          <ClientOnly fallback-tag="div" fallback="Carregando Gráfico de Linha...">
            <charts-line-chart 
              :chart-data="growthChartData" 
              :chart-options="growthChartOptions" 
            />
          </ClientOnly>
        </div>
      </section>

      <section class="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col justify-between">
        <h2 class="text-xl font-bold text-blue-900 mb-4 text-center">Composição Atual (R$)</h2>
        <div class="h-[40vh] min-h-[300px] w-full flex items-center justify-center">
          <ClientOnly fallback-tag="div" fallback="Carregando Gráfico de Composição...">
            <charts-donut-chart
              :chart-data="compositionDonutData"
              :chart-options="compositionDonutOptions"
            />
          </ClientOnly>
        </div>
      </section>
    </div>

    <section class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
      <h2 class="text-xl font-bold text-blue-900 mb-4 flex items-center">
        <span class="mr-2">💡</span>
        Análise e Sugestões Personalizadas
      </h2>
      <button
        @click="generateAnalysis"
        :disabled="isGenerating"
        class="bg-yellow-400 text-blue-900 font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform shadow-md"
        :class="{'hover:bg-yellow-500 hover:shadow-lg': !isGenerating, 'opacity-50 cursor-not-allowed': isGenerating}"
      >
        {{ isGenerating ? 'Gerando Análise...' : 'Gerar Análise Personalizada ✨' }}
      </button>
      
      <div v-if="showAnalysis" class="mt-6 p-4 bg-yellow-50 rounded-lg text-left text-gray-800 border-l-4 border-yellow-600">
        <div v-if="isGenerating" id="loadingSpinner" class="text-center">
          <div class="animate-spin inline-block w-6 h-6 border-4 border-yellow-600 border-t-transparent rounded-full"></div>
          <p class="text-blue-900 mt-2">Gerando análise...</p>
        </div>
        <p v-else id="analysisText" class="mb-2 font-medium">{{ analysisResult }}</p>
      </div>
    </section>

    <section class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 class="text-xl font-bold text-blue-900 mb-4 text-center">Detalhes Mês a Mês (Comparativo)</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr class="border-b-2 border-blue-900 bg-gray-50 text-gray-600">
              <th class="p-3 font-bold">Mês</th>
              <th class="p-3 font-bold">Fundo de Investimento</th>
              <th class="p-3 font-bold">Poupança</th>
              <th class="p-3 font-bold text-center">Diferença de Ganhos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.month" class="border-b border-gray-100 hover:bg-blue-50/50 transition duration-150">
              <td class="p-3 font-semibold">{{ row.month }}</td>
              <td class="p-3">{{ row.fundDisplay }}</td>
              <td class="p-3">{{ row.poupancaDisplay }}</td>
              <td class="p-3 font-extrabold text-center" :class="{'text-green-600': row.diffDisplay.includes('R$'), 'text-red-600': !row.diffDisplay.includes('R$')}">
                {{ row.diffDisplay }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* Estilo de cores e sombras para o look 'bancário' */
.card {
  @apply bg-white rounded-xl p-6 shadow-xl; /* Sombra mais marcada e cantos bem definidos */
}
/* Cores customizadas que podem ser definidas no tailwind.config.js (sugestão) */
.text-primary { color: #0A2E59; } 
.bg-primary { background-color: #0A2E59; }
.text-secondary { color: #FFD700; }
.bg-secondary { background-color: #FFD700; }
.bg-accent { background-color: #34495e; }
</style>
// /pages/simulacao.vue - V1.0 - Simulação Genérica de Investimentos com reatividade
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, ArcElement } from 'chart.js'

// Necessário registrar os componentes do Chart.js que serão usados
ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, ArcElement)

// --- Estados Reativos (Inputs do Usuário) ---
const initialInvestment = ref(200000)
const monthlyContribution = ref(0)
const fundRate = ref(0.03) // 3% a.m.
const poupancaRate = ref(0.005) // 0.5% a.m.
const months = ref(6)

// --- Utilitários de Formatação ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value))
}

// --- Lógica de Simulação Centralizada (Função Computada) ---
const simulationData = computed(() => {
  let fundValue = initialInvestment.value
  let poupancaValue = initialInvestment.value
  
  const fundHistory = [fundValue]
  const poupancaHistory = [poupancaValue]
  const tableRows = []
  
  const totalContributions = monthlyContribution.value * (months.value - 1)
  
  // O loop de cálculo
  for (let i = 1; i <= months.value; i++) {
    // Adiciona o aporte antes de aplicar o juro (se não for o mês 1 - inicial)
    if (i > 1) {
      fundValue += monthlyContribution.value
      poupancaValue += monthlyContribution.value
    }
    
    const fundPrevious = fundValue
    const poupancaPrevious = poupancaValue
    
    // Aplica o juro
    fundValue *= (1 + fundRate.value)
    poupancaValue *= (1 + poupancaRate.value)
    
    // Guarda o histórico para o gráfico (ponto final do mês)
    fundHistory.push(fundValue)
    poupancaHistory.push(poupancaValue)
    
    // Calcula o ganho do mês
    const fundEarnings = fundValue - fundPrevious
    const poupancaEarnings = poupancaValue - poupancaPrevious
    
    tableRows.push({
      month: i,
      fundDisplay: formatCurrency(fundValue),
      poupancaDisplay: formatCurrency(poupancaValue),
      diffDisplay: formatCurrency(fundEarnings - poupancaEarnings)
    })
  }

  const finalFundValue = fundValue
  const finalPoupancaValue = poupancaValue
  const totalEarnings = finalFundValue - initialInvestment.value - totalContributions
  
  return {
    fundHistory, 
    poupancaHistory, 
    tableRows,
    finalFundValue,
    finalPoupancaValue,
    totalContributions,
    totalEarnings
  }
})

// --- Configuração dos Gráficos ---

let lineChartInstance: ChartJS | null = null
let donutChartInstance: ChartJS | null = null

// Gráfico de Linha (Crescimento)
const growthChartData = computed(() => {
  return {
    labels: Array.from({ length: months.value + 1 }, (_, i) => `Mês ${i}`),
    datasets: [
      {
        label: `Fundo de Investimento (${formatPercentage(fundRate.value)} a.m.)`,
        data: simulationData.value.fundHistory,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: `Poupança (${formatPercentage(poupancaRate.value)} a.m.)`,
        data: simulationData.value.poupancaHistory,
        borderColor: '#0D9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  }
})

// Gráfico de Donut (Composição)
const compositionDonutData = computed(() => {
  return {
    labels: ['Capital Inicial', 'Aportes Totais', 'Rendimentos'],
    datasets: [{
      data: [
        initialInvestment.value, 
        simulationData.value.totalContributions, 
        simulationData.value.totalEarnings
      ],
      backgroundColor: ['#1E3A8A', '#2563EB', '#FBBF24'],
      borderColor: '#FFFFFF',
      borderWidth: 4,
      hoverOffset: 8
    }]
  }
})

// Função para renderizar ou atualizar os gráficos
const renderCharts = () => {
  if (process.client) {
    const lineCtx = document.getElementById('lineChart') as HTMLCanvasElement
    const donutCtx = document.getElementById('donutChart') as HTMLCanvasElement

    // 1. Gráfico de Linha
    if (lineCtx) {
      if (lineChartInstance) {
        // Atualiza dados se o gráfico já existe
        lineChartInstance.data = growthChartData.value as any
        lineChartInstance.update()
      } else {
        // Cria o gráfico se não existe
        lineChartInstance = new ChartJS(lineCtx.getContext('2d') as CanvasRenderingContext2D, {
          type: 'line',
          data: growthChartData.value as any,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { ticks: { callback: (value) => formatCurrency(value as number) } }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
                    return label;
                  }
                }
              }
            }
          }
        })
      }
    }

    // 2. Gráfico de Donut
    if (donutCtx) {
      if (donutChartInstance) {
        // Atualiza dados se o gráfico já existe
        donutChartInstance.data = compositionDonutData.value as any
        donutChartInstance.update()
      } else {
        // Cria o gráfico se não existe
        donutChartInstance = new ChartJS(donutCtx.getContext('2d') as CanvasRenderingContext2D, {
          type: 'doughnut',
          data: compositionDonutData.value as any,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.label || '';
                    if (label) label += ': ';
                    if (context.parsed !== null) label += formatCurrency(context.parsed as number);
                    return label;
                  }
                }
              }
            }
          }
        })
      }
    }
  }
}

// --- Hooks de Ciclo de Vida e Watchers ---

// Cria os gráficos após a montagem do componente
onMounted(() => {
  renderCharts()
})

// Observa qualquer mudança nos inputs do usuário para atualizar os gráficos
watch([initialInvestment, monthlyContribution, fundRate, months], () => {
  renderCharts()
})

// Configuração de SEO/Título da Página
useHead({
  title: 'Simulação Dinâmica de Investimentos',
  meta: [
    { name: 'description', content: 'Simule o crescimento do seu investimento de forma dinâmica.' }
  ],
  // Replicando o CSS global para consistência
  style: [
    { children: `
        .chart-container { position: relative; margin: auto; height: 40vh; width: 100%; max-height: 400px; }
        .card { background-color: white; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.1); color: #1E3A8A; }
        body { font-family: 'Poppins', sans-serif; background-color: #F3F4F6; }
      ` }
  ]
})
</script>

<template>
  <div class="container mx-auto p-4 sm:p-6 lg:p-8 text-gray-800">

    <header class="text-center mb-10">
      <h1 class="text-4xl md:text-5xl font-bold text-[#1E3A8A] mb-2">Simulador de Juros Compostos</h1>
      <p class="text-lg text-gray-600 max-w-3xl mx-auto">Ajuste os parâmetros abaixo e veja a diferença que um investimento consistente e de alto rendimento pode fazer.</p>
    </header>

    <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

      <section class="card lg:col-span-3">
        <h2 class="text-2xl font-bold mb-4 text-center">Ajuste os Parâmetros da Simulação</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          <div class="flex flex-col">
            <label for="initial" class="font-semibold mb-1 text-sm">Capital Inicial (R$)</label>
            <input
              id="initial"
              type="number"
              v-model.number="initialInvestment"
              min="0"
              class="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>

          <div class="flex flex-col">
            <label for="monthly" class="font-semibold mb-1 text-sm">Aporte Mensal (R$)</label>
            <input
              id="monthly"
              type="number"
              v-model.number="monthlyContribution"
              min="0"
              class="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>

          <div class="flex flex-col">
            <label for="rate" class="font-semibold mb-1 text-sm">Taxa Mensal do Fundo (Ex: 0.04)</label>
            <input
              id="rate"
              type="number"
              step="0.001"
              v-model.number="fundRate"
              min="0"
              class="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>

          <div class="flex flex-col">
            <label for="months" class="font-semibold mb-1 text-sm">Período Total (Meses)</label>
            <input
              id="months"
              type="number"
              v-model.number="months"
              min="1"
              max="60"
              class="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>

        </div>
      </section>

      <section class="card md:col-span-2 lg:col-span-3">
        <h2 class="text-2xl font-bold text-center mb-2">A Jornada do Crescimento</h2>
        <p class="text-center text-gray-600 mb-6">A linha azul representa o Fundo de Investimento ({{ formatPercentage(fundRate) }} a.m.), comparado com a Poupança ({{ formatPercentage(poupancaRate) }} a.m.).</p>
        <div class="chart-container">
          <canvas id="lineChart"></canvas>
        </div>
      </section>

      <section class="card bg-[#2563EB] text-white">
        <h3 class="font-bold text-xl text-center mb-2">Resultado: Fundo</h3>
        <p class="text-center text-blue-100 mb-4">Valor final acumulado</p>
        <p class="text-5xl font-bold text-center">{{ formatCurrency(simulationData.finalFundValue) }}</p>
      </section>

      <section class="card bg-[#0D9488] text-white">
        <h3 class="font-bold text-xl text-center mb-2">Resultado: Poupança</h3>
        <p class="text-center text-teal-100 mb-4">Valor final acumulado</p>
        <p class="text-5xl font-bold text-center">{{ formatCurrency(simulationData.finalPoupancaValue) }}</p>
      </section>

      <section class="card">
        <h2 class="text-2xl font-bold text-center mb-2">De Onde Veio o Retorno?</h2>
        <p class="text-center text-gray-600 mb-6">Composição do valor final do Fundo de Investimento (Capital Inicial, Aportes, Rendimentos).</p>
        <div class="chart-container h-[45vh] max-h-[450px]">
          <canvas id="donutChart"></canvas>
        </div>
      </section>

      <section class="card md:col-span-2 lg:col-span-3">
        <h2 class="text-2xl font-bold text-center mb-4">Detalhes Mês a Mês</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b-2 border-[#1E3A8A]">
                <th class="p-3 font-semibold">Mês</th>
                <th class="p-3 font-semibold">Fundo de Investimento</th>
                <th class="p-3 font-semibold">Poupança</th>
                <th class="p-3 font-semibold">Diferença de Ganhos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in simulationData.tableRows" :key="row.month" class="border-b border-gray-200 hover:bg-gray-50">
                <td class="p-3">{{ row.month }}</td>
                <td class="p-3">{{ row.fundDisplay }}</td>
                <td class="p-3">{{ row.poupancaDisplay }}</td>
                <td class="p-3 text-green-600 font-semibold">{{ row.diffDisplay }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer class="card lg:col-span-3 text-center bg-gray-800 text-white">
        <h2 class="text-2xl font-bold mb-2">O Poder dos Juros Compostos</h2>
        <p class="text-gray-300 max-w-3xl mx-auto">A lição mais importante é que a consistência nos aportes e a escolha de uma taxa de juros superior são os segredos para o sucesso financeiro a longo prazo.</p>
      </footer>

    </main>
  </div>
</template>
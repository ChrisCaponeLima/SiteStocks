// /pages/index.vue - V11.2 - CRÍTICO: Correção do loop/carregamento eterno no useFetch, garantindo reatividade da query.

<script setup lang="ts">
import { ref, computed, watch } from 'vue' 
import { useAuthStore } from '~/stores/auth'; 
import { storeToRefs } from 'pinia'; 

// ➡️ Injeta a instância customizada de ofetch ($api) do plugin 03.api.ts
const { $api } = useNuxtApp();

// --------------------------------------------------------------------------------
// ✅ INTEGRAÇÃO COM AUTH STORE
// --------------------------------------------------------------------------------
const authStore = useAuthStore();
// Obtém o cotistaId e o objeto user (que contém o nome e sobrenome) de forma reativa.
const { cotistaId, user } = storeToRefs(authStore); 

// Variável de estado para controlar a visibilidade dos valores
const showValues = ref(true) 

// Função para alternar a visibilidade
const toggleValuesVisibility = () => {
showValues.value = !showValues.value
}


// --------------------------------------------------------------------------------
// ✅ INÍCIO DA BUSCA DE DADOS REAIS 
// --------------------------------------------------------------------------------

// 1. Dados Fixos do Cotista
const cotistaData = ref({
capitalInicial: 0,
fundoId: 0,
historicoRentabilidade: [] as { mesAno: string, valorFundo: number, valorPoupanca: number }[],
saldoTotal: 0,
totalGanhos: 0,
// Campos dinâmicos do cartão
dataCriacao: '1970-01-01T00:00:00Z', 
numeroDaConta: 'STOCKS-0000',
});

// 2. Buscando dados na API
const { pending, error, data } = useFetch('cotista/summary', {
// Busca só é feita se cotistaId > 0 (autenticado)
lazy: true,
 // 🛑 CORREÇÃO MANTIDA: Usar uma computada simples para o immediate
immediate: computed(() => cotistaId.value > 0), 
// ⚡️ CORREÇÃO CRÍTICA: Usar 'computed' para o 'query' garante que o useFetch re-execute com o novo cotistaId.
// ANTES: query: { cotistaId: cotistaId.value },
query: computed(() => ({ 
 cotistaId: cotistaId.value, 
})),
// 🚨 CORREÇÃO CRÍTICA 401: Usa a instância autenticada '$api' como fetcher.
$fetch: $api, 
// O 'watch' não é mais estritamente necessário se 'query' for um computed, mas vamos remover para evitar redundância.
// ANTES: watch: [cotistaId],
transform: (responseData: any) => {
 // Mapeia a resposta da API para a estrutura local (incluindo novos campos)
 return {
 capitalInicial: responseData.capitalInicial || 0,
 fundoId: responseData.fundoId || 0,
 historicoRentabilidade: responseData.historicoRentabilidade || [],
 saldoTotal: responseData.saldoTotal || 0,
 totalGanhos: responseData.totalGanhos || 0,
 // Mapeando campos do cartão
 dataCriacao: responseData.dataCriacao || '1970-01-01T00:00:00Z',
 numeroDaConta: responseData.numeroDaConta || 'STOCKS-0000',
 };
}
});

// ✅ CORREÇÃO: Atualiza cotistaData se 'data' for preenchido com sucesso
watch(data, (newVal) => {
if (newVal) {
 cotistaData.value = newVal;
}
}, { immediate: true }); 


// --------------------------------------------------------------------------------
// ✅ CÁLCULO DINÂMICO DOS DETALHES DO CARTÃO
// --------------------------------------------------------------------------------

// 1. Número do Cartão Virtual (TTMM-DDXX-0000-UUUU)
const formattedCardNumber = computed(() => {
const date = new Date(cotistaData.value.dataCriacao);
// Mês + 1, formatado para 2 dígitos (MM)
const MM = (date.getMonth() + 1).toString().padStart(2, '0');
// Dia, formatado para 2 dígitos (DD)
const DD = date.getDate().toString().padStart(2, '0');
// Ano Atual (TT)
const TT = new Date().getFullYear().toString().slice(-2);
// UUUU (ID da Conta)
let UUUU = '0000';
const match = cotistaData.value.numeroDaConta.match(/(\d+)$/);
if (match && match[1]) {
 UUUU = match[1].padStart(4, '0').slice(-4); 
}

// PADDING FIXO
const PADDING_2D = '42';
const PADDING_4D = '0000'; 

// Formato: 2508 2042 0000 1005
const Bloco1 = `${TT}${MM}`; // TT + MM
const Bloco2 = `${DD}${PADDING_2D}`; // DD + 42
const Bloco3 = PADDING_4D;
const Bloco4 = UUUU;

return `${Bloco1} ${Bloco2} ${Bloco3} ${Bloco4}`;
});

// 2. Data de Validade (VALID THRU: Mês de Cadastro / Ano Atual + 6)
const formattedValidThru = computed(() => {
try {
 const creationDate = new Date(cotistaData.value.dataCriacao);
 // Mês de cadastro (MM), formatado para 2 dígitos
 const month = (creationDate.getMonth() + 1).toString().padStart(2, '0');
 
 // Ano de expiração: Ano atual + 6 anos (últimos 2 dígitos)
 const currentYear = new Date().getFullYear();
 const expiryYear = (currentYear + 6).toString().slice(-2);
 
 return `${month}/${expiryYear}`; // Ex: 08/31 (se o ano atual for 25)
} catch {
 return '01/99'; // Fallback
}
});


// --------------------------------------------------------------------------------
// FIM DO CÁLCULO DINÂMICO DOS DETALHES DO CARTÃO
// --------------------------------------------------------------------------------


// Variáveis para a Análise LLM (INALTERADAS)
const analysisResult = ref('')
const isGenerating = ref(false)
const showAnalysis = ref(false)

// Variáveis computadas
const formatCurrency = (value: number | string) => {
return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

// Valores principais (AJUSTADOS PARA USAR cotistaData.value)
const initialInvestment = computed(() => Number(cotistaData.value?.capitalInicial || 0))
const fundRate = computed(() => 0.02) // Taxa mockada, pois o endpoint não retorna 'taxaAdm'
const historico = computed(() => cotistaData.value?.historicoRentabilidade || [])

// ✅ AJUSTE: Usando o saldoTotal da API
const currentFundValue = computed(() => {
return Number(cotistaData.value.saldoTotal) 
})

// ✅ AJUSTE: Usando o totalGanhos da API
const totalEarnings = computed(() => Number(cotistaData.value.totalGanhos)) 


const currentPoupancaValue = computed(() => {
// O cálculo da Poupança precisa de ajuste para ser real; por enquanto, retorna o último valor do histórico (se existir)
if (historico.value.length === 0) return initialInvestment.value
return Number(historico.value[historico.value.length - 1].valorPoupanca)
})


// Dados para o Gráfico de Linha (Crescimento) - (INALTERADAS na lógica)
const growthChartData = computed(() => {
const labels = ['Início'] // Rótulo inicial simplificado
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

// Opções do Gráfico de Linha (Necessário para passar como prop) - INALTERADAS
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


// Dados para o Gráfico de Donut (Composição) - INALTERADOS
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

// Opções do Donut Chart (Adicionado) - INALTERADAS
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


// Dados para a Tabela Mês a Mês (MANTIDO) - INALTERADOS
const tableData = computed(() => {
return historico.value.map((item, index) => {
const fundValue = Number(item.valorFundo)
const poupancaValue = Number(item.valorPoupanca)

let fundEarnings = 0
let poupancaEarnings = 0

if (index === 0) {
// Assumindo que o primeiro item do histórico é o primeiro mês de rendimento
// O valor total de rendimentos até este mês é calculado pela diferença com o capital inicial
fundEarnings = fundValue - initialInvestment.value; 
poupancaEarnings = poupancaValue - initialInvestment.value;
} else {
// Para os meses seguintes, a diferença é em relação ao mês anterior
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

// Lógica de Geração de Análise (LLM) - ✅ AJUSTADO PARA USAR O NOME COMPLETO
const generateAnalysis = async () => {
isGenerating.value = true
showAnalysis.value = true
analysisResult.value = ''

// ✅ V9.0 - Usa Nome e Sobrenome
const userName = `${user.value?.nome || ''} ${user.value?.sobrenome || 'Investidor(a)'}`.trim();
const initialInvestmentDisplay = initialInvestment.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentFundValueDisplay = currentFundValue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const prompt = `Com base nos dados de investimento de ${userName}:
- Investimento Inicial: R$ ${initialInvestmentDisplay}
- Taxa de Rendimento Mensal do Fundo: ${fundRate.value * 100}%
- Período total de investimento: ${historico.value.length} meses
- Valor Atual do Fundo: R$ ${currentFundValueDisplay}

Gere uma breve análise personalizada do desempenho deste investimento.
1. Destaque: A importância da taxa de juros e do tempo, usando os valores reais de ${userName} para ilustrar.
2. Sugestões de Aportes Mensais: Inclua sugestões de aportes mensais, como R$50, R$100, R$200, explicando o impacto qualitativo de cada um no crescimento do patrimônio (por exemplo, "aceleraria ainda mais o seu crescimento", "ampliaria significativamente seu patrimônio", "potencializaria seus ganhos"). Não calcule valores exatos de projeção, mas enfatize a ideia de aceleração e potencial.
3. Projeção Motivacional (Curta): Uma frase sobre o potencial de crescimento futuro se o investimento for mantido e com aportes consistentes.
4. Tom: Encorajador e informativo.
5. Formato: Um parágrafo coeso.
`
try {
await new Promise(resolve => setTimeout(resolve, 2000)) 

// ✅ V9.0 - O texto da análise agora usa a variável 'userName'
analysisResult.value = `Parabéns, ${userName}, seu investimento inicial de ${formatCurrency(initialInvestment.value)} no Fundo Jaguar Alpha demonstrou a força da rentabilidade de ${fundRate.value * 100}% ao mês. Seu patrimônio atual de ${formatCurrency(currentFundValue.value)} já supera significativamente a Poupança, comprovando que a escolha da taxa de juros correta é crucial para a multiplicação do capital ao longo do tempo. Para **acelerar ainda mais o seu crescimento**, aportes mensais de **R$500** já fariam uma grande diferença; **R$1.000** ampliaria significativamente seu patrimônio; e com **R$2.000** você potencializaria seus ganhos, aproveitando o poder dos juros compostos. Continue acompanhando e investindo, pois seu dinheiro está trabalhando duro: **A consistência hoje garante a tranquilidade financeira de amanhã!**`

} catch (err) {
analysisResult.value = 'Não foi possível gerar a análise. Tente novamente.'
} finally {
isGenerating.value = false
}
}

// --------------------------------------------------------------------------------
// ✅ NOVA FUNÇÃO: Navegação para a página de Depósito PIX (Nível 0)
// --------------------------------------------------------------------------------

const goToAportePage = () => {
navigateTo('/pix-generator'); 
}

// --------------------------------------------------------------------------------
// ✅ FIM DA NOVA FUNÇÃO
// --------------------------------------------------------------------------------


// Configuração de SEO/Título da Página (MANTIDO)
useHead({
title: computed(() => `Infográfico: Meu Investimento - ${authStore.user?.nome || 'Carregando'}`),
meta: [
{ name: 'description', content: 'Visualize a evolução do seu investimento com dados reais.' }
],
})
</script>

<template>
<Header pageTitle="Sua Conta" />

<div v-if="pending || cotistaId <= 0 || !cotistaData" class="flex justify-center items-center min-h-[80vh] text-xl text-blue-900">
<svg class="animate-spin -ml-1 mr-3 h-6 w-6 text-blue-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
</svg>
Carregando Dados do Investimento...
</div>

<div v-else-if="error" class="max-w-4xl mx-auto p-8 text-center text-red-700 bg-red-50 rounded-lg m-4 shadow-lg">
<h1 class="text-2xl font-bold mb-3">⚠️ Erro ao Carregar os Dados</h1>
<p>Houve um erro na busca dos dados do cotista.</p>
<p v-if="error" class="mt-2 text-sm text-red-500">Detalhes: {{ error.message }}</p>
</div>

<div v-else class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

<header class="text-center relative">
<h1 class="text-3xl font-extrabold text-blue-900 mb-1">
<span v-if="showValues">{{ formatCurrency(currentFundValue) }}</span>
<span v-else>**********</span>
</h1>
<p class="text-sm text-gray-300 mt-1">
Ganhos:
<span v-if="showValues">{{ formatCurrency(totalEarnings) }}</span>
<span v-else>********</span>
</p>

<button @click="toggleValuesVisibility" class="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full">
<svg v-if="showValues" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
</svg>
<svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.25 0 2.484.195 3.656.556m-2.107 2.107L10.5 9.45m0 0l-1.5-1.5M10.5 9.45L8 7m3.5 6.05l-1.5-1.5M12 12c.563-.563 1.05-1.125 1.463-1.667l1.01-1.01M21 21l-9-9"></path>
</svg>
</button>
</header>

<section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div class="bg-blue-900 text-[#B4BEC7] px-5 py-1 rounded-xl shadow-xl transform transition duration-300 hover:scale-[1.02] relative overflow-hidden aspect-[485/315] w-full h-full">

<img src="/images/ct_blue.png" alt="Fundo do Cartão de Crédito" class="absolute inset-0 w-full h-full object-cover z-0">


<div class="relative z-10 h-full flex flex-col justify-end p-4 pb-10">

<p class="text-xl sm:text-2xl font-mono font-bold tracking-wider mb-4" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.7), 2px 2px 3px rgba(0,0,0,0.5);">
 {{ formattedCardNumber }}
</p>

<div class="flex justify-between items-center text-sm sm:text-base font-semibold">

 <p class="uppercase" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.7);">
 {{ `${user?.nome || ''} ${user?.sobrenome || 'COTISTA'}`.toUpperCase() }}
</p>

<p style="text-shadow: 1px 1px 2px rgba(0,0,0,0.7);">
 VALID THRU: {{ formattedValidThru }} </p>
</div>
</div>
</div>
<section class="mt-8">
<h2 class="text-xl font-bold text-blue-900 mb-4">Ações Rápidas</h2>

<div class="flex overflow-x-auto snap-x snap-mandatory space-x-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">

 <div 
 @click="goToAportePage" 
 class="snap-center min-w-[50%] sm:min-w-[calc(100%/3)] md:min-w-[calc(100%/4)] flex-shrink-0 cursor-pointer"
 >
 <div class="bg-blue-100 p-4 rounded-xl shadow-md flex flex-col items-center text-center h-full hover:bg-blue-200 transition duration-150">
 <span class="text-3xl mb-2">💰</span>
 <p class="font-semibold text-blue-900">Aporte</p>
 </div>
</div>

<div class="snap-center min-w-[50%] sm:min-w-[calc(100%/3)] md:min-w-[calc(100%/4)] flex-shrink-0">
 <div class="bg-green-100 p-4 rounded-xl shadow-md flex flex-col items-center text-center h-full hover:bg-green-200 transition duration-150">
 <span class="text-3xl mb-2">🐷</span>
 <p class="font-semibold text-blue-900">Cofrinho</p>
 </div>
</div>

<div class="snap-center min-w-[50%] sm:min-w-[calc(100%/3)] md:min-w-[calc(100%/4)] flex-shrink-0">
 <div class="bg-yellow-100 p-4 rounded-xl shadow-md flex flex-col items-center text-center h-full hover:bg-yellow-200 transition duration-150">
 <span class="text-3xl mb-2">🔒</span>
 <p class="font-semibold text-blue-900">Segurança</p>
 </div>
</div>

<div class="snap-center min-w-[50%] sm:min-w-[calc(100%/3)] md:min-w-[calc(100%/4)] flex-shrink-0">
 <div class="bg-purple-100 p-4 rounded-xl shadow-md flex flex-col items-center text-center h-full hover:bg-purple-200 transition duration-150">
 <span class="text-3xl mb-2">🚀</span>
 <p class="font-semibold text-blue-900">Investir</p>
</div>
</div>
</div>
</section>
<div class="card bg-gray-100 text-blue-900 p-5 rounded-xl shadow-md border border-gray-200">
<h3 class="font-semibold text-sm text-gray-600 mb-1">Valor Atual do Fundo</h3>
<p class="text-2xl font-bold">{{ formatCurrency(currentFundValue) }}</p>
</div>

<div class="card bg-gray-100 text-blue-900 p-5 rounded-xl shadow-md border border-gray-200">
<h3 class="font-semibold text-sm text-gray-600 mb-1">Total de Ganhos</h3>
<p class="text-2xl font-bold">{{ formatCurrency(totalEarnings) }}</p>
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
// /components/charts/LineChart.vue - V2.0 - Adicionado FillerPlugin para resolver erro de 'fill:true'
<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  Filler as FillerPlugin, // Importação do Filler Plugin
  type ChartData,
} from 'chart.js'
import type { Options } from 'chart.js';

// Registro dos componentes necessários do Chart.js + o FillerPlugin (Correção do erro de log)
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  FillerPlugin 
)

interface Props {
    // PADRONIZAÇÃO DE VARIÁVEIS: Usando camelCase
    chartData: ChartData<'line'>;
    chartOptions: Options<'line'>;
}

// Define as props que serão passadas para o componente
const { chartData, chartOptions } = defineProps<Props>()

</script>

<template>
  <div class="h-96 w-full">
    <Line 
      :data="chartData" 
      :options="chartOptions" 
      aria-label="Gráfico de rentabilidade do investimento"
    />
  </div>
</template>
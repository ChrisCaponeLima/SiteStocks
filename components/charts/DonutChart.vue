// /components/charts/DonutChart.vue - V1.0 - Componente Donut Chart Wrapper
<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartData,
} from 'chart.js'
import type { Options } from 'chart.js';

// Registro dos componentes necessários do Chart.js
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface Props {
    // PADRONIZAÇÃO DE VARIÁVEIS: Usando camelCase
    chartData: ChartData<'doughnut'>;
    chartOptions: Options<'doughnut'>;
}

// Define as props que serão passadas para o componente
const { chartData, chartOptions } = defineProps<Props>()

</script>

<template>
  <Doughnut 
    :data="chartData" 
    :options="chartOptions" 
    aria-label="Gráfico de composição do patrimônio"
  />
</template>
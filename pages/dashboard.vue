// /pages/dashboard.vue - V1.0 - Criação da página Dashboard e conversão da lógica do simulador para Vue.
<template>
  <div class="dashboard-wrapper">
    <header class="dashboard-header">
      <div class="logo-area">
        <img src="/images/logo_ts_white.png" alt="Jaguar Investimentos Logo" class="logo">
      </div>
      <div class="welcome-info">
        <i class="fas fa-user-circle"></i>
        <span>Olá, Zé! Bem-vindo(a) à sua área.</span>
      </div>
      <div class="user-actions">
        <NuxtLink to="#"><i class="fas fa-cog"></i> Configurações</NuxtLink>
        <NuxtLink to="/login"><i class="fas fa-sign-out-alt"></i> Sair</NuxtLink>
      </div>
    </header>

    <main class="dashboard-main container">
      <section class="big-numbers-grid">
        <div class="big-number-card">
          <div class="label">Cotação Atual</div>
          <div class="value">R$ 10.000,00</div>
          <div class="sub-value">Fundo Jaguar Investimentos</div>
        </div>
        <div class="big-number-card">
          <div class="label">Mín. X Semanas</div>
          <div class="value">R$ 9,73</div>
          <div class="sub-value">Cotação Baixa</div>
        </div>
        <div class="big-number-card">
          <div class="label">Máx. X Semanas</div>
          <div class="value">R$ 10,58</div>
          <div class="sub-value">Cotação Alta</div>
        </div>
        <div class="big-number-card">
          <div class="label">Valorização Últimos 5 Meses</div>
          <div :class="['value', 'positive']">22%</div>
          <div class="sub-value">Fundo Jaguar Investimentos</div>
        </div>
        <div class="big-number-card">
          <div class="label">Seu Patrimônio Líquido</div>
          <div class="value">R$ 51.102,60</div>
          <div class="sub-value">Atualizado até hoje</div>
        </div>
      </section>

      <section class="chart-grid">
        <div class="chart-card full-width">
          <h3>Cotação Mês a Mês do Fundo</h3>
          <div class="chart-placeholder-large">Gráfico de Cotação (Placeholder para JS)</div>
        </div>
        <div class="chart-card">
          <h3>Resumo de Ativos do Fundo</h3>
          <div class="chart-placeholder-large">Gráfico de Resumo de Ativos (Placeholder para JS)</div>
        </div>
        <div class="chart-card">
          <h3>Seu Valor Patrimonial</h3>
          <div class="chart-placeholder-large">Gráfico do Seu Patrimônio (Placeholder para JS)</div>
        </div>
      </section>

      <section class="simulator-section">
        <h3>Simulador de Investimentos: Fundo Jaguar vs. Poupança (12 Meses)</h3>
        <form class="simulator-form" @submit.prevent="calcularSimulacao">
          <label for="valorInvestido">Valor a Investir (R$)</label>
          <input 
            type="number" 
            id="valorInvestido" 
            v-model.number="valorInvestido"
            placeholder="Ex: 50000" 
            min="100" 
            step="any" 
            required
          >
          <button type="submit" id="calcularSimulacao">Simular Agora</button>
        </form>
        
        <div class="simulator-results" id="simulatorResults">
          <div class="result-box">
            <div class="label">Montante Final (Poupança)</div>
            <div class="value">{{ formatCurrency(resPoupança) }}</div>
            <div class="sub-value">(Após Imposto de Renda)</div>
          </div>
          <div class="result-box">
            <div class="label">Montante Final (Fundo Jaguar)</div>
            <div class="value">{{ formatCurrency(resFundo) }}</div>
          </div>
          <div class="result-box">
            <div class="label">Valorização Patrimonial (Fundo)</div>
            <div :class="['value', { 'positive': valorizacaoFundo >= 0, 'negative': valorizacaoFundo < 0 }]">
              {{ formatCurrency(valorizacaoFundo) }}
            </div>
          </div>
          <div class="result-box">
            <div class="label">Variação Total: Fundo vs. Poupança</div>
            <div :class="['value', { 'positive': percentualVariacaoTotal >= 0, 'negative': percentualVariacaoTotal < 0 }]">
              {{ formatPercent(percentualVariacaoTotal) }}
            </div>
          </div>
        </div>
        
        <div class="dy-context">
          <p><strong>Observação sobre o simulador:</strong></p>
          <ul>
            <li>**Fundo Jaguar:** Utilizamos a rentabilidade média de 2,21% ao mês (baseado nos seus dados) para o cálculo, sem incidência de imposto de renda, pois o IR é geralmente aplicado na fonte apenas no resgate e não entra no cálculo de crescimento mensal, mas a rentabilidade final é líquida de taxas internas.</li>
            <li>**Poupança:** Utilizamos uma taxa de poupança hipotética de 0.5% ao mês (dado atual é geralmente Taxa Selic * 0,7 + TR, para fins de simulação, um valor fixo). O imposto de renda da poupança é isento.</li>
            <li>**Fórmula base:** $M = C \times (1 + i)^n$</li>
            <li>Este simulador é para fins ilustrativos e não garante rendimentos futuros. A rentabilidade pode variar.</li>
          </ul>
        </div>
      </section>

      <section class="dividend-yield-section">
        <h3>Comparador de Dividend Yield</h3>
        <div class="dy-comparison-grid">
          <div class="dy-item">
            <div class="category">Seu Fundo</div>
            <div class="percentage">10,67%</div>
            <div class="sub-value">(DY do Fundo Jaguar)</div>
          </div>
          <div class="dy-item">
            <div class="category">Setor (Papéis)</div>
            <div class="percentage">11,23%</div>
            <div class="sub-value">(Média do Setor)</div>
          </div>
          <div class="dy-item">
            <div class="category">Mercado (IPCA+)</div>
            <div class="percentage">~6.5%</div>
            <div class="sub-value">(Referência de Mercado)</div>
          </div>
        </div>
        <p class="dy-context">Cálculo baseado no Dividend Yield (DY) dos últimos 12 meses do Fundo em comparação com o seu Setor. Para a base do cálculo utilizamos a média dos dividendos pagos dos últimos 12 meses no valor de **R$ 0,10** e a cotação atual no valor de **R$ 9,91**. Os dados são para fins ilustrativos e podem não refletir a realidade do mercado.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useHead } from '#app';

// ----------------------------------------------------
// 1. Meta Tags (Substitui o <head>)
// ----------------------------------------------------

useHead({
  title: 'Área do Investidor | Jaguar Investimentos',
  meta: [
    { name: 'description', content: 'Dashboard do investidor com dados de cotação e simulador de rentabilidade.' }
  ]
  // As tags de Fontes e Font Awesome já devem estar no nuxt.config.ts ou no layout
});

// ----------------------------------------------------
// 2. Lógica do Simulador (Substitui o <script> estático)
// ----------------------------------------------------

// Variáveis reativas de entrada e saída
const valorInvestido = ref(0);
const resFundo = ref(0);
const resPoupança = ref(0);

// Constantes de simulação
const n = 12; // Número de períodos (meses)
const i_fundo = 0.0221; // Rentabilidade mensal do Fundo (2,21% de exemplo)
const i_poupanca_anual_exemplo = 0.06; // Exemplo: 6% ao ano
const i_poupanca_mensal = Math.pow((1 + i_poupanca_anual_exemplo), (1/12)) - 1; // Conversão para mensal

/**
 * Função principal que executa o cálculo da simulação.
 */
function calcularSimulacao() {
  const C = valorInvestido.value;

  if (C <= 0 || isNaN(C)) {
    alert('Por favor, insira um valor válido para investir (mínimo R$ 100).');
    resFundo.value = resPoupança.value = 0;
    return;
  }

  // Montante Final Fundo Jaguar: M = C * (1 + i)^n
  resFundo.value = C * Math.pow((1 + i_fundo), n);
  
  // Montante Final Poupança
  resPoupança.value = C * Math.pow((1 + i_poupanca_mensal), n);
}

// ----------------------------------------------------
// 3. Computed Properties para Resultados
// ----------------------------------------------------

/**
 * Calcula a valorização patrimonial no Fundo (apenas o lucro).
 */
const valorizacaoFundo = computed(() => {
  return resFundo.value - valorInvestido.value;
});

/**
 * Calcula a variação percentual total: Fundo vs. Poupança.
 */
const percentualVariacaoTotal = computed(() => {
  if (resPoupança.value === 0) return 0;
  return ((resFundo.value - resPoupança.value) / resPoupança.value) * 100;
});

// ----------------------------------------------------
// 4. Funções de Formatação
// ----------------------------------------------------

/**
 * Formata um número para moeda brasileira (R$).
 * @param {number} value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata um número para porcentagem (%).
 * @param {number} value
 */
function formatPercent(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + '%';
}
</script>

<style scoped>
/* Estilos específicos desta página (dashboard) 
  Copiei o bloco <style> do seu HTML e adicionei ao <style scoped> 
*/
.dashboard-header {
  background: var(--color-primary, #004d40); /* Valor padrão para o caso de não ter var */
  color: var(--color-text-light, white);
  padding: 25px 40px;
  text-align: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
/* ... TODO O SEU CSS ESPECÍFICO AQUI ... */
.dashboard-header .logo {
  max-width: 150px;
}
.dashboard-header .welcome-info {
  font-size: 1.1em;
  display: flex;
  align-items: center;
}
.dashboard-header .welcome-info i {
  margin-right: 10px;
  color: var(--color-secondary, gold);
}
.dashboard-header .user-actions a {
  color: var(--color-text-light, white);
  text-decoration: none;
  margin-left: 20px;
  transition: color 0.3s ease;
}
.dashboard-header .user-actions a:hover {
  color: var(--color-secondary, gold);
}

.dashboard-main {
  padding: 20px; /* Ajuste para o padding de seção */
  background-color: #f0f8ff; 
}
/* A classe .container deve vir do CSS Global */

.big-numbers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 25px;
  margin-bottom: 50px;
}

.big-number-card {
  background-color: white; /* var(--color-bg-light) */
  padding: 25px;
  border-radius: 8px; /* var(--border-radius-card) */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  text-align: center;
  border-bottom: 4px solid var(--color-primary, #004d40); 
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.big-number-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.big-number-card .label {
  font-size: 0.95em;
  color: #666;
  margin-bottom: 10px;
}

.big-number-card .value {
  font-size: 2.2em;
  font-weight: 700;
  color: var(--color-primary, #004d40);
  margin-bottom: 5px;
}

.big-number-card .sub-value {
  font-size: 0.85em;
  color: #888;
}
.big-number-card .positive { color: #28a745; }
.big-number-card .negative { color: #dc3545; }

/* Continue com os estilos .chart-grid, .simulator-section, etc. aqui */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  margin-bottom: 50px;
}

.chart-card {
  background-color: white; 
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.chart-card h3 {
  font-size: 1.4em;
  color: var(--color-primary, #004d40);
  margin-bottom: 20px;
  text-align: center;
}

.chart-placeholder-large {
  min-height: 400px;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 1.2em;
  border-radius: 8px;
  margin-top: 20px;
}

.simulator-section {
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  margin-bottom: 50px;
}

.simulator-section h3 {
  font-size: 1.6em;
  color: var(--color-primary, #004d40);
  margin-bottom: 25px;
  text-align: center;
}

.simulator-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 400px;
  margin: 0 auto 30px;
}

.simulator-form label {
  font-weight: 600;
  color: var(--color-text-dark, #333);
}

.simulator-form input {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1em;
}

.simulator-form button {
  padding: 15px;
  font-size: 1.1em;
  border: none;
  border-radius: 8px;
  background-color: var(--color-accent, #ffc107);
  color: var(--color-text-light, white);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.simulator-form button:hover {
  background-color: var(--color-primary, #004d40);
}

.simulator-results {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 30px;
  text-align: center;
}

.result-box {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.result-box .label {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 8px;
}
.result-box .value {
  font-size: 1.8em;
  font-weight: 700;
  color: var(--color-primary, #004d40);
}

/* Dividend Yield */
.dividend-yield-section {
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}
.dividend-yield-section h3 {
  font-size: 1.6em;
  color: var(--color-primary, #004d40);
  margin-bottom: 25px;
  text-align: center;
}
.dy-comparison-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  text-align: center;
}
.dy-item {
  padding: 20px;
  background-color: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.dy-item .category {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 5px;
}
.dy-item .percentage {
  font-size: 2em;
  font-weight: 700;
  color: var(--color-primary, #004d40);
}
.dy-context {
  font-size: 0.9em;
  line-height: 1.5;
  color: #777;
  margin-top: 25px;
  text-align: center;
}

/* Media Queries para Desktop */
@media (min-width: 768px) {
  .dashboard-header {
    padding: 25px 80px;
    text-align: left;
  }
  .dashboard-header .welcome-info {
    font-size: 1.2em;
  }
  .big-numbers-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr 1fr;
  }
  .simulator-results {
    grid-template-columns: repeat(2, 1fr);
  }
  .dy-comparison-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .chart-grid {
    grid-template-columns: 1fr 1fr;
  }
  .chart-card.full-width {
    grid-column: span 2;
  }
}
</style>
// /server/utils/financial.ts

import { Decimal } from "@prisma/client/runtime/library";

// ⚠️ NOTA: Em um ambiente real, esta taxa deveria vir de uma tabela no DB e ser atualizada periodicamente.
// Usaremos um valor placeholder para o cálculo.

const CDI_ANUAL_RATE = 0.1265; // Exemplo: 12.65% ao ano
const CDI_FACTOR = 1.15; // Fator 115% do CDI

/**
 * Calcula a taxa de rendimento mensal para 115% do CDI.
 * @returns A taxa decimal mensal (ex: 0.011477 para 1.1477%)
 */
export function calculateMonthlyEarningRate(): number {
    // CDI_mensal = (1 + CDI_anual)^(1/12) - 1
    const cdiMonthly = Math.pow((1 + CDI_ANUAL_RATE), (1/12)) - 1;

    // Rendimento da Caixinha = CDI_mensal * 1.15
    const earningRate = cdiMonthly * CDI_FACTOR;
    
    return earningRate;
}

/**
 * Aplica o rendimento ao saldo base.
 * @param balance O saldo sobre o qual aplicar.
 * @param rate A taxa de rendimento mensal.
 * @returns O valor do rendimento em R$.
 */
export function calculateEarningsAmount(balance: Decimal, rate: number): number {
    const amount = balance.toNumber() * rate;
    // Arredonda para 2 casas decimais (padrão de moeda)
    return Math.round(amount * 100) / 100; 
}
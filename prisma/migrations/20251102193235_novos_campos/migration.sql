/*
  Warnings:

  - You are about to alter the column `taxaAdm` on the `Fundo` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(4,4)`.
  - You are about to alter the column `rendimentoMes` on the `RentabilidadeMensal` table. The data in that column could be lost. The data in that column will be cast from `Real` to `Decimal(18,8)`.

*/
-- AlterEnum
ALTER TYPE "TipoMovimentacao" ADD VALUE 'RENDIMENTO';

-- AlterTable
ALTER TABLE "Fundo" ALTER COLUMN "taxaAdm" SET DATA TYPE DECIMAL(4,4);

-- AlterTable
ALTER TABLE "RentabilidadeMensal" ALTER COLUMN "rendimentoMes" SET DATA TYPE DECIMAL(18,8);

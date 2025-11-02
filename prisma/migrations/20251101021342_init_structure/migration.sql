-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('APORTE', 'RESGATE');

-- CreateTable
CREATE TABLE "Fundo" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "taxaAdm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dataInicio" DATE NOT NULL,

    CONSTRAINT "Fundo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotista" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpfCnpj" VARCHAR(18) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundoId" INTEGER NOT NULL,
    "capitalInicial" DECIMAL(18,2) NOT NULL,
    "aporteMensalPadrao" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Cotista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentabilidadeMensal" (
    "id" SERIAL NOT NULL,
    "fundoId" INTEGER NOT NULL,
    "mesAno" DATE NOT NULL,
    "valorFundo" DECIMAL(18,2) NOT NULL,
    "valorPoupanca" DECIMAL(18,2) NOT NULL,
    "rendimentoMes" REAL NOT NULL,

    CONSTRAINT "RentabilidadeMensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCotista" (
    "id" SERIAL NOT NULL,
    "cotistaId" INTEGER NOT NULL,
    "dataMovimentacao" DATE NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "MovimentacaoCotista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fundo_cnpj_key" ON "Fundo"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Cotista_cpfCnpj_key" ON "Cotista"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Cotista_email_key" ON "Cotista"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RentabilidadeMensal_fundoId_mesAno_key" ON "RentabilidadeMensal"("fundoId", "mesAno");

-- CreateIndex
CREATE INDEX "MovimentacaoCotista_cotistaId_dataMovimentacao_idx" ON "MovimentacaoCotista"("cotistaId", "dataMovimentacao");

-- AddForeignKey
ALTER TABLE "Cotista" ADD CONSTRAINT "Cotista_fundoId_fkey" FOREIGN KEY ("fundoId") REFERENCES "Fundo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentabilidadeMensal" ADD CONSTRAINT "RentabilidadeMensal_fundoId_fkey" FOREIGN KEY ("fundoId") REFERENCES "Fundo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCotista" ADD CONSTRAINT "MovimentacaoCotista_cotistaId_fkey" FOREIGN KEY ("cotistaId") REFERENCES "Cotista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

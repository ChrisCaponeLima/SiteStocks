/*
  Warnings:

  - You are about to drop the column `cpfCnpj` on the `Cotista` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Cotista` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `Cotista` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[numeroDaConta]` on the table `Cotista` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numeroDaConta` to the `Cotista` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Cotista_cpfCnpj_key";

-- DropIndex
DROP INDEX "public"."Cotista_email_key";

-- AlterTable
ALTER TABLE "Cotista" DROP COLUMN "cpfCnpj",
DROP COLUMN "email",
DROP COLUMN "nome",
ADD COLUMN     "numeroDaConta" VARCHAR(20) NOT NULL,
ALTER COLUMN "fundoId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "password" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "sobrenome" VARCHAR(100) NOT NULL,
    "telefone" VARCHAR(15),
    "email" VARCHAR(100) NOT NULL,
    "cotistaId" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cotistaId_key" ON "User"("cotistaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cotista_numeroDaConta_key" ON "Cotista"("numeroDaConta");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cotistaId_fkey" FOREIGN KEY ("cotistaId") REFERENCES "Cotista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

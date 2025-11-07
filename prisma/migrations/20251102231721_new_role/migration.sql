-- migration.sql - FINAL (Corrigido P3018)

-- 1. Cria a tabela RoleLevel e seus índices
CREATE TABLE "RoleLevel" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "level" INTEGER NOT NULL,

  CONSTRAINT "RoleLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleLevel_name_key" ON "RoleLevel"("name");

CREATE UNIQUE INDEX "RoleLevel_level_key" ON "RoleLevel"("level");

-- 2. RESOLUÇÃO DO ERRO P3018: Insere os dados padrão (IDs 1, 2, 3)
-- Isso garante que o ID 1 exista antes de ser referenciado na tabela User.
INSERT INTO "RoleLevel" ("id", "name", "level") VALUES
(1, 'COTISTA', 0),
(2, 'ADMIN', 1),
(3, 'OWNER', 2)
ON CONFLICT ("id") DO NOTHING;

-- Garante que a sequência de IDs comece após os valores manuais inseridos.
SELECT setval(pg_get_serial_sequence('"RoleLevel"', 'id'), 3, true);

-- 3. Altera a tabela User (adiciona roleId e ultimoAcesso)
-- O DEFAULT 1 agora é seguro.
ALTER TABLE "User" ADD COLUMN   "roleId" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN   "ultimoAcesso" TIMESTAMP(3);

-- 4. Cria a Chave Estrangeira (ForeignKey)
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
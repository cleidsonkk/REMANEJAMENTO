-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN_PLANEJAMENTO', 'USUARIO_SECRETARIA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "RemanejamentoStatus" AS ENUM ('PENDENTE', 'REALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Secretaria" (
    "id" TEXT NOT NULL,
    "codigo" INTEGER NOT NULL,
    "nomeSecretaria" TEXT NOT NULL,
    "sigla" TEXT,
    "unidadeOrcamentaria" TEXT NOT NULL,
    "nomeSecretario" TEXT NOT NULL,
    "statusAtivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretariaCatalogItem" (
    "id" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "elemento" TEXT NOT NULL,
    "funcao" TEXT,
    "subFuncao" TEXT,
    "programa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecretariaCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "senhaHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "secretariaId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remanejamento" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "unidadeOrcamentaria" TEXT NOT NULL,
    "nomeSecretaria" TEXT NOT NULL,
    "nomeSecretario" TEXT NOT NULL,
    "nomeSolicitante" TEXT NOT NULL,
    "cpfSolicitante" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RemanejamentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataConclusao" TIMESTAMP(3),
    "destinoAcao" TEXT NOT NULL,
    "destinoFonte" TEXT NOT NULL,
    "destinoElemento" TEXT NOT NULL,
    "destinoValor" DECIMAL(14,2) NOT NULL,
    "origemAcao" TEXT NOT NULL,
    "origemFonte" TEXT NOT NULL,
    "origemElemento" TEXT NOT NULL,
    "origemValor" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Remanejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemanejamentoExecutado" (
    "id" TEXT NOT NULL,
    "remanejamentoId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL,
    "dataRemanejamento" TIMESTAMP(3) NOT NULL,
    "secretaria" TEXT NOT NULL,
    "unidadeOrcamentaria" TEXT NOT NULL,
    "nomeSecretario" TEXT NOT NULL,
    "nomeSolicitante" TEXT NOT NULL,
    "cpfSolicitante" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "adicaoAcao" TEXT NOT NULL,
    "adicaoFonte" TEXT NOT NULL,
    "adicaoElemento" TEXT NOT NULL,
    "adicaoValor" DECIMAL(14,2) NOT NULL,
    "anulacaoAcao" TEXT NOT NULL,
    "anulacaoFonte" TEXT NOT NULL,
    "anulacaoElemento" TEXT NOT NULL,
    "anulacaoValor" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemanejamentoExecutado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Secretaria_codigo_key" ON "Secretaria"("codigo");
CREATE INDEX "Secretaria_nomeSecretaria_idx" ON "Secretaria"("nomeSecretaria");
CREATE INDEX "Secretaria_statusAtivo_idx" ON "Secretaria"("statusAtivo");
CREATE UNIQUE INDEX "SecretariaCatalogItem_secretariaId_acao_fonte_elemento_key" ON "SecretariaCatalogItem"("secretariaId", "acao", "fonte", "elemento");
CREATE INDEX "SecretariaCatalogItem_secretariaId_idx" ON "SecretariaCatalogItem"("secretariaId");
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_secretariaId_idx" ON "User"("secretariaId");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE UNIQUE INDEX "Remanejamento_protocolo_key" ON "Remanejamento"("protocolo");
CREATE INDEX "Remanejamento_secretariaId_idx" ON "Remanejamento"("secretariaId");
CREATE INDEX "Remanejamento_solicitanteId_idx" ON "Remanejamento"("solicitanteId");
CREATE INDEX "Remanejamento_status_createdAt_idx" ON "Remanejamento"("status", "createdAt");
CREATE INDEX "Remanejamento_dataSolicitacao_idx" ON "Remanejamento"("dataSolicitacao");
CREATE UNIQUE INDEX "RemanejamentoExecutado_remanejamentoId_key" ON "RemanejamentoExecutado"("remanejamentoId");
CREATE UNIQUE INDEX "RemanejamentoExecutado_protocolo_key" ON "RemanejamentoExecutado"("protocolo");
CREATE INDEX "RemanejamentoExecutado_dataRemanejamento_idx" ON "RemanejamentoExecutado"("dataRemanejamento");
CREATE INDEX "RemanejamentoExecutado_cpfSolicitante_idx" ON "RemanejamentoExecutado"("cpfSolicitante");
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");
CREATE INDEX "AuditLog_entity_timestamp_idx" ON "AuditLog"("entity", "timestamp");

-- AddForeignKey
ALTER TABLE "SecretariaCatalogItem" ADD CONSTRAINT "SecretariaCatalogItem_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Remanejamento" ADD CONSTRAINT "Remanejamento_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Remanejamento" ADD CONSTRAINT "Remanejamento_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemanejamentoExecutado" ADD CONSTRAINT "RemanejamentoExecutado_remanejamentoId_fkey" FOREIGN KEY ("remanejamentoId") REFERENCES "Remanejamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

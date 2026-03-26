-- AlterTable
ALTER TABLE "Remanejamento"
ADD COLUMN "loteProtocolo" TEXT,
ADD COLUMN "loteSequencia" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "RemanejamentoExecutado"
ADD COLUMN "loteProtocolo" TEXT,
ADD COLUMN "loteSequencia" INTEGER NOT NULL DEFAULT 1;

-- Backfill existing records to preserve current semantics
UPDATE "Remanejamento"
SET "loteProtocolo" = "protocolo"
WHERE "loteProtocolo" IS NULL;

UPDATE "RemanejamentoExecutado"
SET "loteProtocolo" = "protocolo"
WHERE "loteProtocolo" IS NULL;

-- CreateIndex
CREATE INDEX "Remanejamento_loteProtocolo_loteSequencia_idx" ON "Remanejamento"("loteProtocolo", "loteSequencia");

-- CreateIndex
CREATE INDEX "RemanejamentoExecutado_loteProtocolo_loteSequencia_idx" ON "RemanejamentoExecutado"("loteProtocolo", "loteSequencia");

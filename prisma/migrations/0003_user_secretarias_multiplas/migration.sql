CREATE TABLE "UserSecretaria" (
    "userId" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSecretaria_pkey" PRIMARY KEY ("userId","secretariaId")
);

CREATE INDEX "UserSecretaria_secretariaId_idx" ON "UserSecretaria"("secretariaId");

ALTER TABLE "UserSecretaria"
ADD CONSTRAINT "UserSecretaria_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSecretaria"
ADD CONSTRAINT "UserSecretaria_secretariaId_fkey"
FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserSecretaria" ("userId", "secretariaId", "createdAt")
SELECT "id", "secretariaId", CURRENT_TIMESTAMP
FROM "User"
WHERE "secretariaId" IS NOT NULL
ON CONFLICT ("userId", "secretariaId") DO NOTHING;

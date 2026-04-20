import test from "node:test";
import assert from "node:assert/strict";

import { getBackupReadiness, getEmailDeliveryConfig } from "../services/operational-readiness.service";

test("marca o canal de e-mail como saudavel quando o SMTP esta completo", () => {
  const config = getEmailDeliveryConfig({
    SMTP_HOST: "smtp.prefeitura.gov.br",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_USER: "notificacoes@prefeitura.gov.br",
    SMTP_PASSWORD: "segredo",
    SMTP_FROM_EMAIL: "notificacoes@prefeitura.gov.br",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.status, "healthy");
});

test("marca o canal de e-mail como degradado quando foi desativado", () => {
  const config = getEmailDeliveryConfig({
    NOTIFICATION_EMAIL_ENABLED: "false",
    SMTP_HOST: "smtp.prefeitura.gov.br",
    SMTP_PORT: "587",
    SMTP_FROM_EMAIL: "notificacoes@prefeitura.gov.br",
  });

  assert.equal(config.enabled, false);
  assert.equal(config.status, "degraded");
});

test("marca a rotina de backup como saudavel quando os carimbos estao atuais", () => {
  const readiness = getBackupReadiness(
    {
      BACKUP_PROVIDER: "Neon automatic backups",
      BACKUP_FREQUENCY_HOURS: "24",
      BACKUP_LAST_SUCCESS_AT: "2026-04-20T03:00:00-03:00",
      BACKUP_LAST_RESTORE_TEST_AT: "2026-04-10T10:00:00-03:00",
    },
    new Date("2026-04-20T12:00:00-03:00"),
  );

  assert.equal(readiness.status, "healthy");
});

test("marca a rotina de backup como degradada quando o restore esta desatualizado", () => {
  const readiness = getBackupReadiness(
    {
      BACKUP_PROVIDER: "Neon automatic backups",
      BACKUP_FREQUENCY_HOURS: "24",
      BACKUP_LAST_SUCCESS_AT: "2026-04-20T03:00:00-03:00",
      BACKUP_LAST_RESTORE_TEST_AT: "2026-01-01T10:00:00-03:00",
    },
    new Date("2026-04-20T12:00:00-03:00"),
  );

  assert.equal(readiness.status, "degraded");
});

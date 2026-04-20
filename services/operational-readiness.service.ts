export type ReadinessStatus = "healthy" | "degraded" | "unhealthy";

export type EmailDeliveryConfig = {
  enabled: boolean;
  status: ReadinessStatus;
  detail: string;
  provider: string;
  host: string | null;
  port: number | null;
  secure: boolean;
  user: string | null;
  password: string | null;
  fromAddress: string | null;
  fromName: string;
  replyTo: string | null;
  adminRecipientOverrides: string[];
};

export type BackupReadiness = {
  status: ReadinessStatus;
  detail: string;
  provider: string | null;
  frequencyHours: number | null;
  lastSuccessAt: Date | null;
  lastRestoreTestAt: Date | null;
  ownerName: string | null;
  ownerEmail: string | null;
  runbookUrl: string | null;
};

function parseBoolean(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseEmailList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function hoursBetween(now: Date, previous: Date | null) {
  if (!previous) {
    return null;
  }

  return Math.max(0, (now.getTime() - previous.getTime()) / (1000 * 60 * 60));
}

function daysBetween(now: Date, previous: Date | null) {
  const hours = hoursBetween(now, previous);
  return hours === null ? null : hours / 24;
}

export function getEmailDeliveryConfig(env: NodeJS.ProcessEnv = process.env): EmailDeliveryConfig {
  const host = env.SMTP_HOST?.trim() || null;
  const port = parseInteger(env.SMTP_PORT);
  const secure = parseBoolean(env.SMTP_SECURE) ?? port === 465;
  const user = env.SMTP_USER?.trim() || null;
  const password = env.SMTP_PASSWORD?.trim() || null;
  const fromAddress = env.SMTP_FROM_EMAIL?.trim() || user || null;
  const fromName = env.SMTP_FROM_NAME?.trim() || "Prefeitura de Umbauba - Remanejamento";
  const replyTo = env.SMTP_REPLY_TO?.trim() || null;
  const provider = env.NOTIFICATION_EMAIL_PROVIDER_NAME?.trim() || host || "SMTP institucional";
  const adminRecipientOverrides = parseEmailList(env.NOTIFICATION_EMAIL_ADMIN_RECIPIENTS);
  const disabledByFlag = parseBoolean(env.NOTIFICATION_EMAIL_ENABLED) === false;
  const hasHost = !!host;
  const hasPort = !!port;
  const hasSender = !!fromAddress;
  const requiresAuth = !!user || !!password;
  const hasAuth = !requiresAuth || (!!user && !!password);

  if (disabledByFlag) {
    return {
      enabled: false,
      status: "degraded",
      detail: "Canal de e-mail institucional desativado por configuracao.",
      provider,
      host,
      port,
      secure,
      user,
      password,
      fromAddress,
      fromName,
      replyTo,
      adminRecipientOverrides,
    };
  }

  if (!hasHost || !hasPort || !hasSender || !hasAuth) {
    return {
      enabled: false,
      status: "degraded",
      detail: "Configuracao SMTP incompleta para notificacoes externas.",
      provider,
      host,
      port,
      secure,
      user,
      password,
      fromAddress,
      fromName,
      replyTo,
      adminRecipientOverrides,
    };
  }

  return {
    enabled: true,
    status: "healthy",
    detail: `Canal externo pronto para envio via ${provider}.`,
    provider,
    host,
    port,
    secure,
    user,
    password,
    fromAddress,
    fromName,
    replyTo,
    adminRecipientOverrides,
  };
}

export function getBackupReadiness(env: NodeJS.ProcessEnv = process.env, now = new Date()): BackupReadiness {
  const provider = env.BACKUP_PROVIDER?.trim() || null;
  const frequencyHours = parseInteger(env.BACKUP_FREQUENCY_HOURS);
  const lastSuccessAt = parseDate(env.BACKUP_LAST_SUCCESS_AT);
  const lastRestoreTestAt = parseDate(env.BACKUP_LAST_RESTORE_TEST_AT);
  const ownerName = env.BACKUP_OWNER_NAME?.trim() || null;
  const ownerEmail = env.BACKUP_OWNER_EMAIL?.trim() || null;
  const runbookUrl = env.BACKUP_RUNBOOK_URL?.trim() || null;

  if (!provider) {
    return {
      status: "degraded",
      detail: "Provedor ou rotina de backup ainda nao foram documentados no ambiente.",
      provider,
      frequencyHours,
      lastSuccessAt,
      lastRestoreTestAt,
      ownerName,
      ownerEmail,
      runbookUrl,
    };
  }

  if (!lastSuccessAt) {
    return {
      status: "degraded",
      detail: "Ultimo backup bem-sucedido ainda nao foi informado.",
      provider,
      frequencyHours,
      lastSuccessAt,
      lastRestoreTestAt,
      ownerName,
      ownerEmail,
      runbookUrl,
    };
  }

  const hoursSinceSuccess = hoursBetween(now, lastSuccessAt);
  const daysSinceRestore = daysBetween(now, lastRestoreTestAt);
  const maxBackupAge = frequencyHours ? Math.max(frequencyHours * 2, 24) : 48;

  if (hoursSinceSuccess !== null && hoursSinceSuccess > maxBackupAge) {
    return {
      status: "degraded",
      detail: `Ultimo backup registrado ha ${Math.round(hoursSinceSuccess)} horas, acima do limite operacional esperado.`,
      provider,
      frequencyHours,
      lastSuccessAt,
      lastRestoreTestAt,
      ownerName,
      ownerEmail,
      runbookUrl,
    };
  }

  if (!lastRestoreTestAt) {
    return {
      status: "degraded",
      detail: "Teste de restauracao ainda nao foi registrado no ambiente.",
      provider,
      frequencyHours,
      lastSuccessAt,
      lastRestoreTestAt,
      ownerName,
      ownerEmail,
      runbookUrl,
    };
  }

  if (daysSinceRestore !== null && daysSinceRestore > 60) {
    return {
      status: "degraded",
      detail: `Ultimo teste de restauracao registrado ha ${Math.round(daysSinceRestore)} dias.`,
      provider,
      frequencyHours,
      lastSuccessAt,
      lastRestoreTestAt,
      ownerName,
      ownerEmail,
      runbookUrl,
    };
  }

  return {
    status: "healthy",
    detail: `Backup documentado em ${provider} com restauracao validada.`,
    provider,
    frequencyHours,
    lastSuccessAt,
    lastRestoreTestAt,
    ownerName,
    ownerEmail,
    runbookUrl,
  };
}

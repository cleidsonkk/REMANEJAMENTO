import { UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getBackupReadiness, getEmailDeliveryConfig } from "@/services/operational-readiness.service";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type SystemHealthSnapshot = {
  status: HealthStatus;
  checkedAt: Date;
  uptimeSeconds: number;
  responseTimeMs: number;
  deployment: {
    environment: string;
    region: string;
    commitSha: string;
    commitRef: string;
  };
  checks: HealthCheck[];
  stats: {
    activeUsers: number;
    failedLoginsLast24h: number;
    pendingRemanejamentos: number;
    unreadNotifications: number;
  };
  operations: {
    email: ReturnType<typeof getEmailDeliveryConfig>;
    backup: ReturnType<typeof getBackupReadiness>;
  };
};

function getStatusWeight(status: HealthStatus) {
  if (status === "unhealthy") {
    return 3;
  }

  if (status === "degraded") {
    return 2;
  }

  return 1;
}

export function getOverallHealthStatus(checks: HealthCheck[]): HealthStatus {
  const highestWeight = checks.reduce((max, check) => Math.max(max, getStatusWeight(check.status)), 1);

  if (highestWeight >= 3) {
    return "unhealthy";
  }

  if (highestWeight === 2) {
    return "degraded";
  }

  return "healthy";
}

export function formatUptime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return `${minutes}min ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function getEnvironmentChecks() {
  const checks = [
    {
      key: "DATABASE_URL",
      label: "Banco configurado",
      present: !!process.env.DATABASE_URL,
    },
    {
      key: "NEXTAUTH_SECRET",
      label: "Segredo de autenticacao",
      present: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
    },
  ];

  return checks.map<HealthCheck>(({ key, label, present }) => ({
    key,
    label,
    status: present ? "healthy" : "unhealthy",
    detail: present ? "Variavel configurada." : "Variavel ausente no ambiente.",
  }));
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  const startedAt = Date.now();
  const environmentChecks = getEnvironmentChecks();
  const emailReadiness = getEmailDeliveryConfig();
  const backupReadiness = getBackupReadiness();

  let databaseCheck: HealthCheck = {
    key: "database",
    label: "Conexao com banco",
    status: "healthy",
    detail: "Banco respondeu normalmente.",
  };

  let stats = {
    activeUsers: 0,
    failedLoginsLast24h: 0,
    pendingRemanejamentos: 0,
    unreadNotifications: 0,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeUsers, failedLoginsLast24h, pendingRemanejamentos, unreadNotifications] = await Promise.all([
      prisma.user.count({
        where: {
          status: UserStatus.ATIVO,
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "LOGIN_FAILURE",
          timestamp: {
            gte: last24Hours,
          },
        },
      }),
      prisma.remanejamento.count({
        where: {
          status: "PENDENTE",
        },
      }),
      prisma.notification.count({
        where: {
          isRead: false,
        },
      }),
    ]);

    stats = {
      activeUsers,
      failedLoginsLast24h,
      pendingRemanejamentos,
      unreadNotifications,
    };
  } catch (error) {
    databaseCheck = {
      key: "database",
      label: "Conexao com banco",
      status: "unhealthy",
      detail: error instanceof Error ? error.message : "Falha ao consultar o banco.",
    };
  }

  const warningChecks: HealthCheck[] = [];

  if (databaseCheck.status === "healthy" && stats.failedLoginsLast24h >= 10) {
    warningChecks.push({
      key: "login_failures",
      label: "Falhas recentes de login",
      status: "degraded",
      detail: `${stats.failedLoginsLast24h} falhas registradas nas ultimas 24 horas.`,
    });
  }

  if (databaseCheck.status === "healthy" && stats.pendingRemanejamentos >= 15) {
    warningChecks.push({
      key: "pending_load",
      label: "Fila de remanejamentos",
      status: "degraded",
      detail: `${stats.pendingRemanejamentos} remanejamentos aguardando tratamento.`,
    });
  }

  const operationalChecks: HealthCheck[] = [
    {
      key: "email_delivery",
      label: "Canal externo de notificacoes",
      status: emailReadiness.status,
      detail: emailReadiness.detail,
    },
    {
      key: "backup_readiness",
      label: "Backup e restauracao",
      status: backupReadiness.status,
      detail: backupReadiness.detail,
    },
  ];

  const checks = [...environmentChecks, databaseCheck, ...warningChecks, ...operationalChecks];

  return {
    status: getOverallHealthStatus(checks),
    checkedAt: new Date(),
    uptimeSeconds: process.uptime(),
    responseTimeMs: Date.now() - startedAt,
    deployment: {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      region: process.env.VERCEL_REGION ?? "local",
      commitSha: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      commitRef: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    },
    checks,
    stats,
    operations: {
      email: emailReadiness,
      backup: backupReadiness,
    },
  };
}

export async function getPublicHealthSnapshot() {
  const snapshot = await getSystemHealthSnapshot();

  return {
    status: snapshot.status,
    checkedAt: snapshot.checkedAt,
    responseTimeMs: snapshot.responseTimeMs,
    deployment: snapshot.deployment,
  };
}

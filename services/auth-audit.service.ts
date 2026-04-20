import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_THROTTLE_WINDOW_MINUTES = 15;
const LOGIN_THROTTLE_WINDOW_MS = LOGIN_THROTTLE_WINDOW_MINUTES * 60 * 1000;

type TimestampRow = {
  timestamp: Date;
};

function getThrottleWindowStart(now = new Date()) {
  return new Date(now.getTime() - LOGIN_THROTTLE_WINDOW_MS);
}

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeIp(value?: string | null) {
  if (!value) {
    return null;
  }

  const firstValue = value.split(",")[0]?.trim() ?? "";
  return firstValue || null;
}

export function getClientIp(request: Request) {
  return normalizeIp(
    request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip"),
  );
}

export function getLoginThrottleState(args: {
  cpfFailures: Date[];
  ipFailures: Date[];
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const cpfBlockedUntil =
    args.cpfFailures.length >= LOGIN_FAILURE_LIMIT
      ? new Date(args.cpfFailures[0].getTime() + LOGIN_THROTTLE_WINDOW_MS)
      : null;
  const ipBlockedUntil =
    args.ipFailures.length >= LOGIN_FAILURE_LIMIT
      ? new Date(args.ipFailures[0].getTime() + LOGIN_THROTTLE_WINDOW_MS)
      : null;

  const blockedUntil =
    cpfBlockedUntil && ipBlockedUntil
      ? cpfBlockedUntil > ipBlockedUntil
        ? cpfBlockedUntil
        : ipBlockedUntil
      : cpfBlockedUntil ?? ipBlockedUntil;

  return {
    cpfFailures: args.cpfFailures.length,
    ipFailures: args.ipFailures.length,
    blockedUntil,
    isBlocked: !!blockedUntil && blockedUntil.getTime() > now.getTime(),
  };
}

async function listRecentCpfFailures(cpf: string, since: Date) {
  if (!cpf) {
    return [];
  }

  return prisma.auditLog.findMany({
    where: {
      action: "LOGIN_FAILURE",
      entity: "Auth",
      entityId: cpf,
      timestamp: {
        gte: since,
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    select: {
      timestamp: true,
    },
    take: LOGIN_FAILURE_LIMIT,
  });
}

async function listRecentIpFailures(ip: string, since: Date) {
  if (!ip) {
    return [];
  }

  return prisma.$queryRaw<TimestampRow[]>(
    Prisma.sql`
      SELECT "timestamp"
      FROM "AuditLog"
      WHERE "action" = 'LOGIN_FAILURE'
        AND "entity" = 'Auth'
        AND "timestamp" >= ${since}
        AND COALESCE("newData"->>'ip', '') = ${ip}
      ORDER BY "timestamp" DESC
      LIMIT ${LOGIN_FAILURE_LIMIT}
    `,
  );
}

export async function getCurrentLoginThrottle(args: { cpf: string; ip?: string | null; now?: Date }) {
  const now = args.now ?? new Date();
  const since = getThrottleWindowStart(now);
  const cpf = normalizeCpf(args.cpf);
  const ip = normalizeIp(args.ip);

  const [cpfFailures, ipFailures] = await Promise.all([listRecentCpfFailures(cpf, since), listRecentIpFailures(ip ?? "", since)]);

  return getLoginThrottleState({
    cpfFailures: cpfFailures.map((item) => item.timestamp),
    ipFailures: ipFailures.map((item) => new Date(item.timestamp)),
    now,
  });
}

export async function logLoginSuccess(args: { userId: string; cpf: string; ip?: string | null }) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: "LOGIN_SUCCESS",
      entity: "Auth",
      entityId: normalizeCpf(args.cpf) || null,
      newData: {
        cpf: normalizeCpf(args.cpf),
        ip: normalizeIp(args.ip),
      },
    },
  });
}

export async function logLoginFailure(args: { cpf: string; reason: string; ip?: string | null; blockedUntil?: Date | null }) {
  const cpf = normalizeCpf(args.cpf);
  const ip = normalizeIp(args.ip);

  await prisma.auditLog.create({
    data: {
      action: "LOGIN_FAILURE",
      entity: "Auth",
      entityId: cpf || null,
      newData: {
        cpf,
        reason: args.reason,
        ip,
        blockedUntil: args.blockedUntil?.toISOString() ?? null,
      },
    },
  });
}

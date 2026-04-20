type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown> & {
  event: string;
  level?: LogLevel;
};

function emit(level: LogLevel, payload: LogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };

  const message = JSON.stringify(entry);

  if (level === "error") {
    console.error(message);
    return;
  }

  if (level === "warn") {
    console.warn(message);
    return;
  }

  console.log(message);
}

export function logInfo(event: string, payload: Record<string, unknown> = {}) {
  emit("info", { event, ...payload });
}

export function logWarn(event: string, payload: Record<string, unknown> = {}) {
  emit("warn", { event, ...payload });
}

export function logError(event: string, payload: Record<string, unknown> = {}) {
  emit("error", { event, ...payload });
}

export function createRequestId(seed?: string | null) {
  return seed?.trim() || crypto.randomUUID();
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

export function reportServerError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logError(event, {
    ...context,
    error: serializeError(error),
  });
}

export function reportClientError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logError(event, {
    ...context,
    runtime: "client",
    error: serializeError(error),
  });
}

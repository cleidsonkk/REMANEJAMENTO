import type { RemanejamentoEntrySchema, RemanejamentoSchema } from "@/lib/validations/remanejamento";

export const REMANEJAMENTO_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;
const REMANEJAMENTO_DRAFT_VERSION = 4;

type StoredRemanejamentoDraft = {
  expiresAt: number;
  payload: Partial<RemanejamentoSchema>;
  version: number;
};

export function createEmptyRemanejamentoEntry(): RemanejamentoEntrySchema {
  return {
    destinoAcao: "",
    destinoFonte: "",
    destinoElemento: "",
    destinoValor: "" as never,
    origemAcao: "",
    origemFonte: "",
    origemElemento: "",
    origemValor: "" as never,
  };
}

export function buildRemanejamentoDraftKey(scopeKey: string) {
  return `remanejamento-draft-v${REMANEJAMENTO_DRAFT_VERSION}:${scopeKey || "anonymous"}`;
}

export function serializeRemanejamentoDraft(payload: Partial<RemanejamentoSchema>, now = Date.now()) {
  const value: StoredRemanejamentoDraft = {
    version: REMANEJAMENTO_DRAFT_VERSION,
    expiresAt: now + REMANEJAMENTO_DRAFT_TTL_MS,
    payload,
  };

  return JSON.stringify(value);
}

export function parseRemanejamentoDraft(
  raw: string,
  {
    fallbackSecretariaId,
    validSecretariaIds,
    now = Date.now(),
  }: {
    fallbackSecretariaId: string;
    validSecretariaIds: string[];
    now?: number;
  },
): Partial<RemanejamentoSchema> | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRemanejamentoDraft>;

    if (!Number.isFinite(parsed.expiresAt) || Number(parsed.expiresAt) <= now) {
      return null;
    }

    const payload = parsed.payload;
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const restoredSecretariaId =
      typeof payload.secretariaId === "string" && validSecretariaIds.includes(payload.secretariaId)
        ? payload.secretariaId
        : fallbackSecretariaId;

    return {
      secretariaId: restoredSecretariaId,
      justificativa: typeof payload.justificativa === "string" ? payload.justificativa : "",
      entries: Array.isArray(payload.entries) && payload.entries.length ? payload.entries : [createEmptyRemanejamentoEntry()],
    };
  } catch {
    return null;
  }
}

import test from "node:test";
import assert from "node:assert/strict";

import { formatUptime, getOverallHealthStatus } from "../services/system-health.service";

test("marca o sistema como degradado quando ha checks de atencao", () => {
  const status = getOverallHealthStatus([
    { key: "env", label: "Env", status: "healthy", detail: "ok" },
    { key: "queue", label: "Fila", status: "degraded", detail: "alto volume" },
  ]);

  assert.equal(status, "degraded");
});

test("marca o sistema como critico quando ha check unhealthy", () => {
  const status = getOverallHealthStatus([
    { key: "env", label: "Env", status: "healthy", detail: "ok" },
    { key: "db", label: "Banco", status: "unhealthy", detail: "offline" },
  ]);

  assert.equal(status, "unhealthy");
});

test("formata uptime em horas e minutos quando necessario", () => {
  assert.equal(formatUptime(45), "45s");
  assert.equal(formatUptime(125), "2min 5s");
  assert.equal(formatUptime(3725), "1h 2min");
});

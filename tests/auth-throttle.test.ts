import test from "node:test";
import assert from "node:assert/strict";

import { getLoginThrottleState } from "../services/auth-audit.service";

test("bloqueia login apos exceder o limite de falhas recentes", () => {
  const now = new Date("2026-04-20T12:00:00.000Z");
  const failures = [
    new Date("2026-04-20T11:59:00.000Z"),
    new Date("2026-04-20T11:57:00.000Z"),
    new Date("2026-04-20T11:55:00.000Z"),
    new Date("2026-04-20T11:53:00.000Z"),
    new Date("2026-04-20T11:51:00.000Z"),
  ];

  const state = getLoginThrottleState({
    cpfFailures: failures,
    ipFailures: [],
    now,
  });

  assert.equal(state.isBlocked, true);
  assert.equal(state.blockedUntil?.toISOString(), "2026-04-20T12:14:00.000Z");
});

test("nao bloqueia quando a quantidade de falhas ainda esta abaixo do limite", () => {
  const state = getLoginThrottleState({
    cpfFailures: [
      new Date("2026-04-20T11:59:00.000Z"),
      new Date("2026-04-20T11:57:00.000Z"),
      new Date("2026-04-20T11:55:00.000Z"),
      new Date("2026-04-20T11:53:00.000Z"),
    ],
    ipFailures: [],
    now: new Date("2026-04-20T12:00:00.000Z"),
  });

  assert.equal(state.isBlocked, false);
  assert.equal(state.blockedUntil, null);
});

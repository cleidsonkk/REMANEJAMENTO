import test from "node:test";
import assert from "node:assert/strict";

import { endOfDayInTimeZone, startOfDayInTimeZone } from "../lib/timezone";

test("converte o inicio e o fim do dia no horario de Brasilia para UTC", () => {
  assert.equal(startOfDayInTimeZone("2026-04-20").toISOString(), "2026-04-20T03:00:00.000Z");
  assert.equal(endOfDayInTimeZone("2026-04-20").toISOString(), "2026-04-21T02:59:59.999Z");
});

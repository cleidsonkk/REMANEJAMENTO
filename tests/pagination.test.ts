import test from "node:test";
import assert from "node:assert/strict";

import { getPaginationState, parsePageParam } from "../lib/pagination";

test("normaliza parametros invalidos de pagina para o fallback", () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam("0"), 1);
  assert.equal(parsePageParam("-5"), 1);
  assert.equal(parsePageParam("abc", 3), 3);
});

test("limita a pagina ao ultimo bloco disponivel", () => {
  const state = getPaginationState({
    page: 8,
    pageSize: 10,
    total: 37,
  });

  assert.equal(state.page, 4);
  assert.equal(state.totalPages, 4);
  assert.equal(state.skip, 30);
  assert.equal(state.hasPreviousPage, true);
  assert.equal(state.hasNextPage, false);
});

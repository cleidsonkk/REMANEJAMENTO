import test from "node:test";
import assert from "node:assert/strict";

import { canViewRemanejamento, hasRequiredRole } from "../lib/access-control";

test("administrador atende ao papel exigido", () => {
  assert.equal(hasRequiredRole("ADMIN_PLANEJAMENTO", "ADMIN_PLANEJAMENTO"), true);
});

test("usuário comum não atende ao papel administrativo", () => {
  assert.equal(hasRequiredRole("USUARIO_SECRETARIA", "ADMIN_PLANEJAMENTO"), false);
});

test("administrador pode visualizar qualquer remanejamento", () => {
  assert.equal(
    canViewRemanejamento({
      currentRole: "ADMIN_PLANEJAMENTO",
      currentUserId: "admin",
      ownerUserId: "user-1",
    }),
    true,
  );
});

test("usuário de secretaria só pode visualizar o próprio remanejamento", () => {
  assert.equal(
    canViewRemanejamento({
      currentRole: "USUARIO_SECRETARIA",
      currentUserId: "user-1",
      ownerUserId: "user-2",
    }),
    false,
  );
});

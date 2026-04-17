import assert from "node:assert/strict";
import test from "node:test";

import { userSchema } from "../lib/validations/user";

test("aceita senha forte no cadastro de usuário", () => {
  const result = userSchema.safeParse({
    nome: "Maria da Silva",
    cpf: "12345678901",
    email: "maria@prefeitura.gov.br",
    telefone: "",
    password: "SenhaSegura1",
    role: "ADMIN_PLANEJAMENTO",
    secretariaId: null,
    secretariaIds: [],
    status: "ATIVO",
  });

  assert.equal(result.success, true);
});

test("rejeita senha sem letras maiúsculas no cadastro de usuário", () => {
  const result = userSchema.safeParse({
    nome: "Maria da Silva",
    cpf: "12345678901",
    email: "maria@prefeitura.gov.br",
    telefone: "",
    password: "senhasegura1",
    role: "USUARIO_SECRETARIA",
    secretariaId: "sec-1",
    secretariaIds: ["sec-1"],
    status: "ATIVO",
  });

  assert.equal(result.success, false);
});

test("aceita usuário setorial vinculado a mais de uma secretaria", () => {
  const result = userSchema.safeParse({
    nome: "Operador Multissetorial",
    cpf: "98765432100",
    email: "operador@prefeitura.gov.br",
    telefone: "",
    password: "SenhaSegura1",
    role: "USUARIO_SECRETARIA",
    secretariaId: "sec-1",
    secretariaIds: ["sec-1", "sec-2"],
    status: "ATIVO",
  });

  assert.equal(result.success, true);
});

test("aceita administrador sem secretaria vinculada", () => {
  const result = userSchema.safeParse({
    nome: "Administrador Teste",
    cpf: "11122233344",
    email: "admin.teste@prefeitura.gov.br",
    telefone: "",
    password: "SenhaSegura1",
    role: "ADMIN_PLANEJAMENTO",
    secretariaId: null,
    secretariaIds: [],
    status: "ATIVO",
  });

  assert.equal(result.success, true);
});

test("normaliza espaços ao validar e-mail no cadastro de usuário", () => {
  const result = userSchema.safeParse({
    nome: "  Maria da Silva  ",
    cpf: "12345678901",
    email: "  maria@prefeitura.gov.br  ",
    telefone: "  ",
    password: "SenhaSegura1",
    role: "ADMIN_PLANEJAMENTO",
    secretariaId: null,
    secretariaIds: [],
    status: "ATIVO",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.nome, "Maria da Silva");
  assert.equal(result.data.email, "maria@prefeitura.gov.br");
});

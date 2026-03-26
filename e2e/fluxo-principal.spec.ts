import { expect, test } from "@playwright/test";

function uniqueDigits(length: number) {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return seed.slice(-length).padStart(length, "7");
}

async function login(page: import("@playwright/test").Page, cpf: string, password: string) {
  await page.goto("/login");
  await page.locator("#cpf").fill(cpf);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: "Acessar sistema" }).click(),
  ]);
  await expect(page.getByRole("heading", { name: /Centro executivo de acompanhamento or/ })).toBeVisible();
}

async function logout(page: import("@playwright/test").Page) {
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: /Encerrar sess/ }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Entrar no ambiente interno" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("fluxo crítico de produção: admin cria usuário, usuário solicita lote e admin executa", async ({ page }) => {
  const adminCpf = "07363032513";
  const adminPassword = "99105302";
  const suffix = uniqueDigits(6);
  const tempUserName = `Operador Teste ${suffix}`;
  const tempUserCpf = uniqueDigits(11);
  const tempUserEmail = `operador.${suffix}@umbauuba.se.gov.br`;
  const tempUserPassword = "Teste@123";
  let loteProtocolo = "";

  await test.step("admin entra e cadastra usuário setorial", async () => {
    await login(page, adminCpf, adminPassword);
    await page.goto("/dashboard/admin/usuarios");

    await page.locator("#nome:visible").scrollIntoViewIfNeeded();
    await page.locator("#nome:visible").fill(tempUserName);
    await page.locator("#cpf:visible").fill(tempUserCpf);
    await page.locator("#email:visible").fill(tempUserEmail);
    await page.locator("#telefone:visible").fill(`7999${suffix}`);
    await page.locator("#password:visible").fill(tempUserPassword);
    await page.locator("#role:visible").selectOption("USUARIO_SECRETARIA");
    await page.locator("#status:visible").selectOption("ATIVO");

    const primeiraSecretariaDisponivel =
      (await page.locator("#secretariaId:visible option").nth(1).getAttribute("value")) ?? "";
    await page.locator("#secretariaId:visible").selectOption(primeiraSecretariaDisponivel);

    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", { name: /Cadastrar usu/ }).click(),
    ]);

    const searchInput = page.locator('input[placeholder="Buscar por nome, CPF, e-mail ou secretaria"]:visible');
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill(tempUserName);
    await page.getByRole("button", { name: "Buscar" }).first().click();

    const userRow = page.locator("tbody tr").filter({ hasText: tempUserName }).last();
    await expect(userRow).toBeVisible();
  });

  await test.step("usuário setorial entra e registra lote com dois itens", async () => {
    await logout(page);

    await login(page, tempUserCpf, tempUserPassword);
    await page.goto("/dashboard/remanejamentos");
    const main = page.getByRole("main");

    await main.locator("#justificativa").scrollIntoViewIfNeeded();
    await main.locator("#justificativa").fill(`Lote de teste automatizado ${suffix} para validação do fluxo principal.`);

    await main.locator("#entries-0-destinoAcao-input").fill("4370");
    await main.locator("#entries-0-destinoFonte-input").fill("15000000");
    await main.locator("#entries-0-destinoElemento-input").fill("33903900");
    await main.locator("#entries-0-destinoValor").fill("15.000");
    await main.locator("#entries-0-origemAcao-input").fill("4370");
    await main.locator("#entries-0-origemFonte-input").fill("15000000");
    await main.locator("#entries-0-origemElemento-input").fill("33903000");
    await main.locator("#entries-0-origemValor").fill("15.000");

    await main.getByRole("button", { name: "Adicionar item" }).click();

    await main.locator("#entries-1-destinoAcao-input").fill("4371");
    await main.locator("#entries-1-destinoFonte-input").fill("17040000");
    await main.locator("#entries-1-destinoElemento-input").fill("33904700");
    await main.locator("#entries-1-destinoValor").fill("2.500,50");
    await main.locator("#entries-1-origemAcao-input").fill("4371");
    await main.locator("#entries-1-origemFonte-input").fill("17040000");
    await main.locator("#entries-1-origemElemento-input").fill("33904700");
    await main.locator("#entries-1-origemValor").fill("2.500,50");

    await Promise.all([
      page.waitForLoadState("networkidle"),
      main.getByRole("button", { name: "Registrar lote" }).click(),
    ]);

    const successMessage = page.locator("text=/Lote REM-.* registrado com 2 itens\\./").last();
    await expect(successMessage).toBeVisible();
    const text = (await successMessage.textContent()) ?? "";
    const match = text.match(/(REM-\d{8}-[A-Z0-9]+)/);
    loteProtocolo = match?.[1] ?? "";
    expect(loteProtocolo).not.toEqual("");

    await logout(page);
  });

  await test.step("admin confere e executa o lote", async () => {
    await login(page, adminCpf, adminPassword);
    await page.goto("/dashboard/remanejamentos");

    await page.locator('input[placeholder="Digite para localizar rapidamente"]:visible').fill(loteProtocolo);
    await page.getByRole("button", { name: "Aplicar" }).click();

    const loteRow = page.locator("tbody tr").filter({ hasText: loteProtocolo }).last();
    await expect(loteRow).toBeVisible();
    await loteRow.getByRole("button", { name: /Conferir e confirmar lote/ }).click();

    await expect(page.getByText(/Histórico e linha do tempo do lote/).last()).toBeVisible();
    await expect(page.getByText("Item 01").last()).toBeVisible();
    await expect(page.getByText("Item 02").last()).toBeVisible();

    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", { name: /Confirmar remanejamento do lote/ }).click(),
    ]);

    await page.goto("/dashboard/remanejamentos");
    await page.locator('input[placeholder="Digite para localizar rapidamente"]:visible').fill(loteProtocolo);
    await page.getByRole("button", { name: "Aplicar" }).click();
    const executedRow = page.locator("tbody tr").filter({ hasText: loteProtocolo }).last();
    await expect(executedRow.getByText("REALIZADO")).toBeVisible();
  });
});

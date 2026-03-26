# Sistema de Remanejamento Orçamentário

Aplicação institucional da Prefeitura de Umbaúba para controle de solicitações e execuções de remanejamento orçamentário entre secretarias municipais.

## O que ja esta implementado

- `Next.js` com App Router, layout institucional e paginas separadas por perfil
- `NextAuth` com login por CPF e senha
- `Prisma` com `PostgreSQL` e schema orientado ao dominio
- suporte a vários usuários na mesma secretaria
- importação automática da planilha `dados das secretaria.xlsx`
- catálogo orçamentário por secretaria para preencher `ação`, `fonte` e `elemento`
- solicitação de remanejamento com validação de igualdade entre adição e anulação
- fluxo administrativo para executar remanejamento e gerar registro imutavel em `RemanejamentoExecutado`
- auditoria de eventos relevantes
- dashboard com KPIs e graficos
- tabela paginada de executados com `TanStack Table`

## Estrutura

- `app/`: rotas, layouts e server actions
- `features/`: componentes por dominio
- `components/`: UI compartilhada
- `lib/`: autenticação, Prisma, validações e utilitários
- `services/`: regras e consultas de negocio
- `prisma/`: schema, migration e seed

## Como subir

1. Instale as dependencias:

```bash
npm install
```

2. Copie `.env.example` para `.env` e ajuste:

```env
DATABASE_URL="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://seu-projeto.vercel.app"
SEED_ADMIN_NAME="Administrador Planejamento"
SEED_ADMIN_EMAIL="admin@umbauuba.se.gov.br"
SEED_ADMIN_CPF="00000000000"
SEED_ADMIN_PASSWORD="SenhaForte123!"
```

3. Gere o client do Prisma, aplique a migration e rode o seed:

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

4. Inicie o projeto:

```bash
npm run dev
```

## Deploy na Vercel

- o projeto agora executa `prisma generate` automaticamente no `postinstall`
- a Vercel usa `npm run vercel-build`, que garante:

```bash
prisma generate && next build
```

- variáveis obrigatórias na Vercel:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`

## Testes automatizados

### Validacao e regra de negocio

```bash
npm test
```

### Fluxo ponta a ponta em navegador

```bash
npm run e2e
```

O projeto agora possui cobertura e2e com `Playwright` para o fluxo principal:

- login administrativo
- cadastro, edicao e inativacao/reativacao de secretaria
- cadastro, edicao e inativacao/reativacao de usuario
- login de usuario setorial
- solicitacao em lote com dois itens
- conferencia e execucao administrativa do lote

## Observacoes de dominio

- usuário de secretaria enxerga apenas seus próprios remanejamentos
- administrador possui visao global
- secretarias inativas não devem receber novos usuários
- a mesma secretaria pode ter vários usuários vinculados
- o seed carrega `nomeSecretario`, `unidadeOrcamentaria` e o catálogo institucional da planilha oficial

## Prontidao operacional

### Ja coberto na base atual

- autenticacao com controle por perfil
- fluxo principal de remanejamento com status e historico executado
- catalogo por secretaria importado da planilha oficial
- auditoria de eventos relevantes, inclusive login com sucesso e falha
- filtros e exportacao de executados
- build de producao e testes automatizados basicos
- testes ponta a ponta em navegador com Playwright para o fluxo principal

### Recomendado antes de homologar para uso real

- validar todos os fluxos com usuarios reais do orgao em ambiente de homologacao
- revisar politicas de senha e processo de redefinicao de acesso
- configurar segredos fortes definitivos e ambiente de deploy oficial
- monitorar logs de aplicacao e banco em ambiente publicado
- executar testes finais de responsividade em celular, tablet e desktop
- revisar permissao de administradores e dados iniciais antes da operacao

## Checklist final para uso real

- validar o catalogo importado com a equipe que domina a planilha oficial
- homologar o fluxo completo com administradores e usuarios reais
- revisar politica institucional de senha e troca periodica
- definir rotina de backup e contingencia do banco
- publicar ambiente oficial com segredos definitivos
- monitorar logs da aplicacao, autenticacao e banco
- revisar permissao de cada administrador antes da entrada em operacao
- executar `npm test`, `npm run e2e` e `npm run build` antes de cada liberacao

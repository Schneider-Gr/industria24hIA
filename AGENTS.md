<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Industria24h — regras do projeto

Espelhado de `../CLAUDE.md` (fonte de verdade). Atualize os dois arquivos juntos quando mudar uma regra.

## O Projeto

Reconstrução completa do portal **industria24h.com.br**, atualmente em
Bubble.io, para **Next.js + Supabase + PostgreSQL**. Toda a documentação
de engenharia reversa está em `/docs` (nível acima, `../docs`). Antes de implementar qualquer
funcionalidade, consulte:

- `../docs/database.md` — Data Types reais (70+ tipos, nomes confirmados no Bubble)
- `../docs/consignado-module.md` — módulo Consignado (descoberta recente, escopo à parte)
- `../docs/business-rules.md` — regras de negócio confirmadas
- `../docs/backend-workflows.md`, `../docs/privacy-rules.md`, `../docs/api-connector.md` — **rascunhos inferidos, ainda não validados** no editor Bubble real. Trate como hipótese, não como verdade, até que o arquivo diga explicitamente "confirmado"
- `../docs/migration.md` — status atual e prioridades

**Regra de ouro sobre as fontes:** nem tudo em `/docs` tem o mesmo grau de
confiança. Cada documento diz no topo se é "extração real", "rascunho
inferido" ou "especulativo". Nunca trate um rascunho inferido como se
fosse confirmado. Se um dado crítico (nome de campo, regra de negócio,
endpoint) só existe como inferência, pare e pergunte ao usuário em vez de
assumir e seguir em frente — principalmente em schema de banco e regras
financeiras (repasse, comissão, pagamento).

## Regras de Vibecoding

### 1. Dados e Backend — PROIBIDO mockar

- **PROIBIDO** o uso de dados mockados (hardcoded) em componentes visuais,
  a menos que explicitamente solicitado pelo usuário.
- Sempre crie uma **camada de persistência real** (ler/escrever em
  `.json` locais, SQLite, ou chamadas de API reais) — nunca `const data = [...]`
  fixo dentro de um componente para simular conteúdo dinâmico.
- Se a API/banco de dados ainda não existir, **crie primeiro os arquivos
  de serviço, schemas ou controllers** antes de tocar na interface. A
  ordem correta é: schema → service/repository → API route → UI.
- Prefira **falhar o build ou exibir um estado de erro real** a inventar
  mockups estáticos no front-end. Um `<ErrorState />` visível e honesto é
  sempre melhor que dados falsos que escondem que a integração não existe.
- Nunca simule uma resposta de API externa (Asaas, Bling, ViaCEP etc.)
  com um valor fixo "só para ver funcionando" — implemente a chamada
  real (mesmo que em sandbox) ou deixe o botão desabilitado com uma
  mensagem clara de "integração pendente".

### 2. Nunca invente schema

- Novos campos ou tipos de dados só entram no schema Prisma/Supabase se
  estiverem documentados em `../docs/database.md` como confirmados, **ou**
  se o usuário confirmar explicitamente nesta sessão.
- Se precisar de um campo que não existe na documentação, pare e
  pergunte — não crie um nome plausível e siga em frente. Isso já causou
  divergência real neste projeto (ver `../bubble-export/_especulativo/`,
  onde um documento inventou tipos como `Pedido`, `Cotacao`, `Empresa`
  que não existem no app real, cujos nomes reais são `LinhaItem`,
  `Loja_ecommerce`, `Produto_ecommerce`).

### 3. Segredos e credenciais

- Nunca escreva chaves de API, tokens ou senhas em texto puro em
  código, markdown, commits ou mensagens de log — sempre `.env`
  (adicionado ao `.gitignore`) ou secrets manager.
- Se encontrar uma credencial em texto puro em qualquer arquivo do
  projeto (inclusive em `/docs` ou `/bubble-export`), pare, avise o
  usuário e recomende rotacionar a credencial.
- `Cards`, `CardTime`, `credenciaisAPIs` (ver `../docs/privacy-rules.md`)
  são tipos sensíveis — qualquer código que os toque precisa de revisão
  extra antes de merge.

### 4. Docs primeiro, docs atualizados

Antes de codar, leia os docs relevantes em `../docs`. Se durante a
implementação uma regra de negócio ou campo se revelar diferente do
documentado, atualize o `.md` correspondente **na mesma sessão**,
marcando a fonte (ex.: "confirmado durante implementação de X em 2026-07").

### 5. Módulo Consignado — escopo separado

O módulo Consignado (`../docs/consignado-module.md`) é uma descoberta
recente e não estava no plano original. Não implemente funcionalidades
dele misturadas com o marketplace principal a menos que o usuário
peça explicitamente — trate como Fase 2 até segunda ordem.

### 6. Qualidade e commits

- Sem `console.log` esquecido em código de produção.
- Sem `any` no TypeScript sem justificativa em comentário.
- Commits pequenos e descritivos, em português, seguindo
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `docs:`, `refactor:`, `chore:`).
- Nunca commitar diretamente em `main` — sempre branch + PR, mesmo
  trabalhando sozinho, para manter histórico revisável.
- Rodar lint e testes antes de considerar uma tarefa concluída.

### 7. Identidade Git

Contas autorizadas a commitar neste repositório: `industria24hs`
(dedicada) https://github.com/Schneider-Gr **e** `revgrow7@gmail.com` (autorizada pelo dono em 2026-07-07).
Qualquer uma das duas pode fazer `git`/`commit` diretamente. Verificar com
`git config user.email` antes do primeiro commit de uma sessão nova; se não
for nenhuma das duas, corrigir antes de commitar (ver configuração de
`includeIf`/SSH já documentada para este ambiente).

### 8. RLS e segurança por padrão

Ao gerar schema/policies no Supabase: **negar por padrão, liberar
explicitamente**. O Bubble expõe todos os Data Types por padrão na Data
API, controlando acesso só via Privacy Rules — não replicar esse padrão
na migração. Cada tabela nova nasce com RLS ativado e sem policy até que
uma regra documentada (ou confirmada pelo usuário) seja implementada.

### 9. Migrations: numeração e verificação

As migrations vivem soltas em `supabase/migrations/` com prefixo numérico
manual (sem `supabase migration new`), e várias sessões trabalham em
worktrees paralelos — a colisão de número já aconteceu 3 vezes (0014, 0030,
0064). O CI tem o job `migrations-lint` (`.github/workflows/ci.yml`) que
falha com prefixo duplicado, e **enquanto master estiver colidido nenhum PR
do repo passa**, nem os de terceiros.

- Antes de **criar**: `git log --all --oneline -- supabase/migrations/00XX*`.
- Antes do **push/PR** (a criação não basta, outra sessão pode ter publicado
  no meio): `cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d`.
- Master já colidido? Renumerar é a primeira tarefa, antes de qualquer outra.
- **"Aplicada" só é fato com o objeto real no schema:** confirmar com
  `supabase db query --linked` (`to_regclass`, `information_schema`). O
  histórico (`migration list`) mente sob drift — neste projeto ele para em
  0057 enquanto o banco tem muito mais.
- DDL/DML sobre dado real: testar antes em `begin; … select <verificação>;
  rollback;`. Foi assim que se pegou um `UPDATE ... FROM` inválido (42P01)
  numa migration de comissão de afiliado.

## Checklist antes de abrir um PR

- [ ] Nenhum dado mockado no lugar de persistência real
- [ ] Nenhuma credencial em texto puro
- [ ] Schema usado bate com `../docs/database.md` (ou foi confirmado nesta sessão)
- [ ] RLS configurada para qualquer tabela nova
- [ ] Docs atualizados se o entendimento mudou
- [ ] Lint e testes passando
- [ ] Número de migration sem colisão (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` vazio)

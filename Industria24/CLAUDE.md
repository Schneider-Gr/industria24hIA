# CLAUDE.md — Industria24h

Este arquivo instrui qualquer instância do Claude Code trabalhando neste
repositório. Leia isto antes de gerar ou alterar qualquer código.

## O Projeto

Reconstrução completa do portal legado **industria24h.com.br** (Bubble.io)
para **Next.js + Supabase + PostgreSQL**, publicado em
**industria24.com.br**. Toda a documentação de engenharia reversa está em
`/docs`. Antes de implementar qualquer funcionalidade, consulte:

**Os dois domínios não são intercambiáveis.** `industria24h.com.br` (com
"h") é o app Bubble legado — correto em `/docs` e `/bubble-export`, que o
descrevem. `industria24.com.br` (sem "h") é este projeto: use-o em todo
código, metadata, e-mail, webhook e texto exibido ao usuário.

- `docs/database.md` — Data Types reais (70+ tipos, nomes confirmados no Bubble)
- `docs/consignado-module.md` — módulo Consignado (descoberta recente, escopo à parte)
- `docs/business-rules.md` — regras de negócio confirmadas
- `docs/backend-workflows.md`, `docs/privacy-rules.md`, `docs/api-connector.md` — **rascunhos inferidos, ainda não validados** no editor Bubble real. Trate como hipótese, não como verdade, até que o arquivo diga explicitamente "confirmado"
- `docs/migration.md` — status atual e prioridades

**Regra de ouro sobre as fontes:** nem tudo em `/docs` tem o mesmo grau de
confiança. Cada documento diz no topo se é "extração real", "rascunho
inferido" ou "especulativo". Nunca trate um rascunho inferido como se
fosse confirmado. Se um dado crítico (nome de campo, regra de negócio,
endpoint) só existe como inferência, pare e pergunte ao usuário em vez de
assumir e seguir em frente — principalmente em schema de banco e regras
financeiras (repasse, comissão, pagamento).

---

## Comandos

Todo comando roda dentro de `Industria24/web/`:

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run start    # roda o build
npm run lint     # eslint
```

Sem suite de testes automatizada em `web/`. Migrations e RLS se verificam
manualmente com `supabase db query --linked` (ver regra 9 abaixo).

---

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
  estiverem documentados em `docs/database.md` como confirmados, **ou**
  se o usuário confirmar explicitamente nesta sessão.
- Se precisar de um campo que não existe na documentação, pare e
  pergunte — não crie um nome plausível e siga em frente. Isso já causou
  divergência real neste projeto (ver `bubble-export/_especulativo/`,
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
- `Cards`, `CardTime`, `credenciaisAPIs` (ver `docs/privacy-rules.md`)
  são tipos sensíveis — qualquer código que os toque precisa de revisão
  extra antes de merge.

### 4. Docs primeiro, docs atualizados

Antes de codar, leia os docs relevantes em `/docs`. Se durante a
implementação uma regra de negócio ou campo se revelar diferente do
documentado, atualize o `.md` correspondente, marcando a fonte (ex.:
"confirmado durante implementação de X em 2026-07").

### 5. Qualidade e commits

- Sem `console.log` esquecido em código de produção.
- Sem `any` no TypeScript sem justificativa em comentário.
- Commits pequenos e descritivos, em português, seguindo
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `docs:`, `refactor:`, `chore:`).



### 6. RLS e segurança por padrão

Ao gerar schema/policies no Supabase: **negar por padrão, liberar
explicitamente**. O Bubble expõe todos os Data Types por padrão na Data
API, controlando acesso só via Privacy Rules — não replicar esse padrão
na migração. Cada tabela nova nasce com RLS ativado e sem policy até que
uma regra documentada (ou confirmada pelo usuário) seja implementada.

---

## Skills de projeto

45+ skills vivem em `Industria24/.claude/skills/` (espelhadas em
`Industria24/web/.claude/skills/`) e carregam automaticamente por
contexto — confira a skill do domínio antes de assumir uma regra de
negócio ou schema.

## Checklist antes de abrir um PR

- [ ] Nenhum dado mockado no lugar de persistência real
- [ ] Nenhuma credencial em texto puro
- [ ] Schema usado bate com `docs/database.md` (ou foi confirmado nesta sessão)
- [ ] RLS configurada para qualquer tabela nova
- [ ] Docs atualizados se o entendimento mudou
- [ ] Lint e testes passando


## Estrutura de diretórios

Caminhos a partir da raiz do repositório (`Industria24IA/`):

```
PRDs/                          10 PRDs em PDF (01-marca-propria … 10-impulsionamento-ads)
Industria24/
├── CLAUDE.md                  este arquivo
├── docs/                      engenharia reversa do Bubble + specs (ver "Regra de ouro" acima)
│   ├── database.md            Data Types confirmados
│   ├── business-rules.md      regras confirmadas
│   ├── backend-workflows.md   rascunho inferido
│   ├── bpmn/                  diagramas de processo
│   └── design-tokens/
├── bubble-export/             dump do app Bubble; `_especulativo/` NÃO é fonte confiável
├── web/                       ← a aplicação; todo código vive aqui
└── web-*/                     worktrees git de branches em andamento — NUNCA editar
```

Dentro de `Industria24/web/`:

```
src/app/                       Next.js App Router
│   ├── (admin)/ (seller)/ (afiliado)/ (parceiro)/    áreas por perfil
│   ├── api/                   route handlers
│   └── produto/ loja/ carrinho/ checkout/ pedido/ coletiva/ leilao/ corridas/ …
src/components/                admin, seller, afiliado, vitrine, carrinho, chat, bot, docs, termos
src/lib/                       asaas.ts, auth.ts, coletiva.ts, preco-faixa.ts, rate-limit.ts,
│                              cep.ts, maps.ts, email.ts, whatsapp.ts, agentes/, ai/, supabase/
supabase/migrations/           85 migrations, prefixo numérico manual (ver regra 9)
supabase/qa/  supabase/tests/
mcp-server/                    API pública para terceiros
scripts/  tools/  public/
```

**Trabalhe sempre em `Industria24/web/`.** Os diretórios `web-*` irmãos são
worktrees de outras sessões; editar neles reverte trabalho alheio.

## PRDs

Leia **todos** os PDFs em `PRDs/` antes de implementar ou alterar qualquer
feature de produto. Eles são a especificação funcional autoritativa e cobrem:
marca própria, afiliado logístico, leilão reverso, roteirização, centro de
distribuição, contrato de preço travado, antecipação de recebíveis, liquidação
relâmpago, compra coletiva e impulsionamento/ads. Se o código divergir de um
PRD, o PRD vence — pare e reporte a divergência antes de codar por cima.

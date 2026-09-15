---
prd_number: "035"
status: rascunho
priority: alta
created: 2026-09-15
issue: ""
depends_on: ["006"]
references:
  - "docs/prds/006-autenticacao-e-acesso-por-perfil.md — login, cadastro, confirmação e controle de acesso por perfil"
  - "src/lib/auth.ts (resolverDestinoPorPapel, ehAfiliado, ehParceiroLogistico, getMinhaLoja)"
  - "src/lib/gate-rotas.ts — rotas protegidas, onboarding e exceção de seller sem loja"
  - "src/app/seller/cadastro, src/app/cadastro, src/app/(afiliado)/afiliado/solicitar, src/app/(parceiro)/parceiro/cadastro"
---

# PRD 035: Links de acesso por perfil

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br), entrada de novos usuários e retorno de usuários existentes nos perfis seller, afiliado, parceiro logístico e comprador.
- **Estado atual**: existe um login único (`/login`) e duas telas de cadastro (`/seller/cadastro` e `/cadastro`). O sistema não sabe com que intenção a pessoa chegou: descobre o papel depois, olhando se a conta tem loja, afiliação ou cadastro de parceiro. Sem `next` na URL, o destino pós-login segue uma prioridade fixa (admin, loja, afiliação, parceiro, home).
- **Problema**:
  - Link divulgado para um público (ex.: seller no grupo de WhatsApp) não garante que a pessoa caia no passo certo daquele perfil.
  - A prioridade fixa leva a becos sem saída: quem pediu afiliação e ainda aguarda aprovação é mandado para `/afiliado` e barrado pelo painel, que só aceita afiliação aprovada ou suspensa *(inferência da leitura do código em 15/09, não reproduzida em produção)*.
  - Não há como medir de que canal/perfil vieram as contas novas.

## 2. Solução Proposta

### Visão de produto

- Cada perfil tem seus próprios links curtos de **entrar** e **cadastrar**, prontos para divulgação.
- O link grava na conta o **papel pretendido** e leva a pessoa direto ao próximo passo daquele perfil.
- O papel pretendido orienta destino e onboarding; o acesso real continua dependendo das aprovações de hoje.
- Uma conta pode acumular papéis pretendidos, sem perder os anteriores.

### Decisões de produto

1. Links por perfil definem o papel pretendido da conta. *(decidido pela dona em 15/09)*
2. O papel pretendido fica guardado nos dados da própria conta, sem tabela nova. *(decidido em 15/09)*
3. Entrar por link de outro perfil **acrescenta** o papel, nunca remove os anteriores. *(decidido em 15/09)*
4. O slug do perfil de loja é `seller`. *(decidido em 15/09)*
5. Papel pretendido **não** concede acesso: loja precisa estar criada (e ativa para vender), afiliação aprovada, parceiro não suspenso. Motivo: link público não pode furar a aprovação.
6. Não existe link de admin. Motivo: acesso de admin nunca é self-service (PRD 006, decisão 3).

### Fora do escopo

- Criar ou alterar a aprovação de loja, afiliação ou parceiro (continua como no PRD 006).
- Link por loja específica ou por campanha com parâmetros de UTM. *(premissa — confirme ou corrija)*
- Remover papel pretendido de uma conta pelo próprio usuário. *(premissa — confirme ou corrija)*
- Tela de escolha de perfil para conta com vários papéis. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Links de entrar por perfil

Como pessoa que já tem conta, quero abrir o link do meu perfil e entrar, para cair direto na área certa.

**Rules:**
- Links: `/entrar/seller`, `/entrar/afiliado`, `/entrar/parceiro` e `/entrar` (comprador).
- A tela de login mostra título e texto do perfil (ex.: "Acesse o painel da sua loja") e mantém e-mail/senha, "Esqueci a senha" e as mensagens do PRD 006.
- "Entrar com Google" aparece só no link de comprador, igual à regra atual de painéis internos.
- Após entrar, o papel do link é somado aos papéis pretendidos da conta e a pessoa segue para o destino da US03.

**Edge cases:**
- Pessoa já logada abre `/entrar/seller` → não pede login de novo; soma o papel e segue para o destino. *(premissa — confirme ou corrija)*
- Slug inexistente (ex.: `/entrar/admin`, `/entrar/xyz`) → tela de login comum, sem gravar papel.
- Login recusado → papel não é gravado; e-mail continua no campo.

### US02: Links de cadastro por perfil

Como pessoa nova, quero me cadastrar pelo link do meu perfil, para já começar pelo passo daquele perfil.

**Rules:**
- Links: `/cadastro/seller`, `/cadastro/afiliado`, `/cadastro/parceiro` e `/cadastro` (comprador).
- O papel pretendido é gravado na criação da conta, antes da confirmação do e-mail.
- O link de confirmação do e-mail leva ao próximo passo do perfil (US03).
- `/vender` e `/seller/cadastro` continuam funcionando e equivalem a `/cadastro/seller`.

**Edge cases:**
- E-mail já cadastrado → mensagem do PRD 006 com "Entrar" apontando para `/entrar/<perfil>` do mesmo link.
- Pessoa se cadastra por `/cadastro/afiliado` e depois abre `/entrar/seller` → conta passa a ter os dois papéis pretendidos.
- Conta criada antes desta feature (sem papel pretendido) → segue a prioridade atual até entrar por algum link de perfil. *(premissa — confirme ou corrija)*

### US03: Destino e próximo passo pelo papel pretendido

Como usuário que chegou por um link de perfil, quero ser levado ao passo em que estou naquele perfil, para não cair em tela que me barra.

**Rules:**
- Seller: sem loja → `/seller/minha-loja`; com loja em análise ou ativa → `/seller`.
- Afiliado: sem pedido ou com pedido em análise → `/afiliado/solicitar`, que já exibe o status de cada solicitação; aprovado ou suspenso → `/afiliado`. *(confirmado no código em 15/09: a página mostra `StatusBadge` por afiliação)*
- Parceiro: sem cadastro → `/parceiro/cadastro`; cadastrado e não suspenso → `/parceiro`; suspenso → mensagem de conta suspensa.
- Comprador: home, ou o `next` da URL quando existir.
- Com `next` explícito na URL, o `next` vence o papel pretendido, respeitando as mesmas proteções de redirecionamento de hoje.
- Login sem link de perfil usa o papel pretendido mais recente da conta; sem nenhum, usa a prioridade atual.

**Edge cases:**
- Afiliado com pedido pendente entra por `/entrar/afiliado` → vê a tela de acompanhamento, nunca o bloqueio `sem_acesso_afiliado`.
- Parceiro suspenso → mensagem clara de suspensão, sem loop de login.
- Conta com papel pretendido seller cuja loja foi inativada → `/seller`, que mostra a situação da loja. *(premissa — confirme ou corrija)*

### US04: Visibilidade do papel pretendido para o admin

Como admin, quero ver com que perfil cada conta chegou, para priorizar análise e medir os canais.

**Rules:**
- Na lista de usuários do admin, cada conta mostra os papéis pretendidos e os papéis efetivos (loja, afiliação, parceiro). *(premissa — confirme ou corrija)*
- O papel pretendido não é editável pelo admin nesta entrega. *(premissa — confirme ou corrija)*

**Edge cases:**
- Conta com papel pretendido seller e sem loja há mais de 2 dias → aparece como "seller sem loja" para acompanhamento. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Link de perfil (/entrar/<perfil> ou /cadastro/<perfil>)
   │
   ├── slug inválido ──▶ login/cadastro comum, sem papel
   │
   ▼
Tem conta?
   ├── não ──▶ cadastro ──▶ grava papel pretendido ──▶ confirma e-mail ──┐
   └── sim ──▶ login ok? ── não ──▶ mensagem (PRD 006), sem gravar papel │
                  │ sim                                                  │
                  ▼                                                      │
            soma papel pretendido ◀──────────────────────────────────────┘
                  │
                  ▼
        `next` na URL? ── sim ──▶ `next`
                  │ não
                  ▼
        Próximo passo do perfil
          seller:   tem loja? ── não ──▶ /seller/minha-loja
                              └─ sim ──▶ /seller
          afiliado: pedido? ── nenhum ──▶ /afiliado/solicitar
                            ├─ em análise ──▶ acompanhamento
                            └─ aprovado/suspenso ──▶ /afiliado
          parceiro: cadastro? ── não ──▶ /parceiro/cadastro
                             ├─ suspenso ──▶ aviso de suspensão
                             └─ ativo ──▶ /parceiro
          comprador: home
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Cada link `/entrar/<perfil>` e `/cadastro/<perfil>` abre com título e texto do perfil | Link divulgado precisa parecer feito para aquele público | Abrir os 8 links em produção |
| Cadastro por `/cadastro/seller` termina em `/seller/minha-loja` após confirmar o e-mail | Seller novo vai direto a criar a loja | Alias de QA do cadastro à confirmação |
| Entrar por um segundo perfil mantém o papel anterior | Conta acumula papéis (decisão 3) | Entrar por `/entrar/afiliado` e depois `/entrar/seller`; conferir os dois papéis na conta |
| Afiliado com pedido pendente nunca vê `sem_acesso_afiliado` ao entrar pelo link | Elimina beco sem saída | Conta de QA com afiliação pendente |
| Link de perfil não libera painel sem aprovação | Link público não fura a moderação | Conta com papel pretendido afiliado e sem aprovação tenta abrir `/afiliado` |
| `/entrar/admin` não grava papel nem dá acesso | Admin nunca self-service | Abrir o link logado com conta comum |
| `next` explícito vence o papel pretendido | Links internos (pedido, checkout) continuam funcionando | `/entrar/seller?next=/pedido/<id>` |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Contas seller novas vindas por link de perfil que criam loja em até 2 dias | A levantar (banco, após o lançamento) | ≥ 70% | 30 dias | ≥ 50% | Dono do produto |
| Acessos barrados por `sem_acesso_afiliado` / `sem_loja` logo após login | A levantar (auditoria de acesso negado) | Queda de 80% | 30 dias | Queda de 50% | Dono do produto |
| Contas novas com papel pretendido registrado | 0% (não existe hoje) | ≥ 90% das criadas por link | 30 dias | ≥ 70% | Dono do produto |

## 6. Milestones

### Milestone 1: Seller entra pelo próprio link e cai no passo certo

**Por que é um marco:** o público que motivou a feature (seller divulgado no grupo) passa a ter link próprio que leva a criar a loja ou ao painel, sem tela de bloqueio.

**Funcionalidades:** US01, US02, US03 (perfil seller e comprador)

**Checklist de aceite:**
- [ ] `/entrar/seller` e `/cadastro/seller` com título e texto do perfil
- [ ] Cadastro por `/cadastro/seller` termina em `/seller/minha-loja` após confirmar
- [ ] Papel pretendido seller gravado e somado a papéis anteriores
- [ ] `next` explícito continua vencendo
- [ ] `/entrar/admin` não grava papel nem dá acesso

**Aprovador:** Dono do produto

### Milestone 2: Afiliado e parceiro com links próprios

**Por que é um marco:** os outros dois perfis de entrada ganham o mesmo caminho direto e o beco sem saída do afiliado pendente some.

**Funcionalidades:** US01, US02, US03 (perfis afiliado e parceiro)

**Checklist de aceite:**
- [ ] `/entrar/afiliado`, `/cadastro/afiliado`, `/entrar/parceiro`, `/cadastro/parceiro` com texto do perfil
- [ ] Afiliado pendente vê acompanhamento da solicitação, nunca `sem_acesso_afiliado`
- [ ] Parceiro suspenso vê aviso de suspensão, sem loop
- [ ] Link não libera painel sem aprovação

**Aprovador:** Dono do produto

### Milestone 3: Admin enxerga de onde cada conta veio

**Por que é um marco:** o admin passa a priorizar análise e medir canais pelo perfil de chegada.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] Lista de usuários mostra papéis pretendidos e efetivos
- [ ] Contas seller sem loja há mais de 2 dias identificáveis

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Usuário interpreta o link como garantia de acesso ("entrei pelo link de afiliado e não vejo o painel") | Médio | Tela de acompanhamento explica o que falta (aprovação) | Pendente |
| Papel pretendido mais recente leva a destino inesperado para quem tem vários papéis | Baixo | `next` explícito vence; painéis continuam acessíveis pelo endereço | Monitorando |
| Tela de acompanhamento de afiliação pendente | Baixo | `/afiliado/solicitar` já exibe o status de cada solicitação (verificado no código em 15/09) | Mitigado |
| Links divulgados antes com `/vender` e `/seller/cadastro` | Baixo | Manter os dois funcionando e equivalentes a `/cadastro/seller` | Mitigado por regra |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 006 (login, cadastro, confirmação, acesso por perfil) | Interna | Em implementação; fluxo de seller validado em prod em 15/09 | Todos os milestones |
| Aprovação de afiliação e cadastro de parceiro existentes | Interna | Em produção | Milestone 2 |

## 8. Referências

- PRD 006 — `docs/prds/006-autenticacao-e-acesso-por-perfil.md`
- Issues #642, #646, #648 e PRs #643, #647, #649 — correções do fluxo de seller em 15/09/2026

## 9. Registro de Decisões

- **2026-09-15 (dona do produto):** links por perfil definem o papel pretendido; papel guardado nos dados da conta; novo papel soma aos anteriores; slug `seller`. Motivo: divulgar um link por público e levar cada pessoa ao passo certo sem bloqueio.
- **2026-09-15:** papel pretendido não substitui aprovação (loja, afiliação, parceiro) e não existe link de admin. Motivo: link público não pode furar moderação nem abrir a área mais sensível.
- **2026-09-15:** `depends_on: ["006"]`. Critério: esta feature pressupõe o login, o cadastro com confirmação de e-mail e o controle de acesso por perfil especificados no PRD 006; não pressupõe comportamento de outro PRD.

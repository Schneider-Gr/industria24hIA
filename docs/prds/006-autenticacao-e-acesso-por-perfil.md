---
prd_number: "006"
status: em-implementacao
priority: alta
created: 2026-07-31
issue: "466"
openspec: refazer-login-cadastro-loja-admin
depends_on: []
references:
  - "src/lib/auth.ts, src/lib/auth-actions.ts, src/lib/auth-erros.ts: sessão, login, cadastro, recuperação"
  - "src/lib/gate-rotas.ts: rotas protegidas, onboarding e exceção de seller sem loja"
  - "src/components/vitrine/FormularioLogin.tsx, FormularioCadastro.tsx, LoginModal.tsx: UI de login e cadastro"
  - "src/app/auth/callback/route.ts, src/app/auth/confirm/route.ts: callbacks OAuth e token_hash"
  - "src/app/seller/cadastro/page.tsx, src/app/cadastro/page.tsx: criação de conta (seller e comprador)"
  - "src/app/(seller)/seller/minha-loja: criação e edição da loja"
  - "src/app/(admin)/admin/lojas, src/components/admin/ModerarSituacaoLoja.tsx: aprovação da loja"
  - "Issues #642, #646 e PRs #643, #647 (correções de 15/09/2026)"
---

# PRD 006: Autenticação e Acesso por Perfil

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br), marketplace B2B multiloja com os perfis comprador, seller (loja), afiliado e admin, além do parceiro logístico (fora do escopo).
- **Estado atual (revisado em 15/09/2026, validado em produção)**:
  - Login único (`/login` e modal do header) com e-mail/senha para todos os perfis. "Entrar com Google" aparece só quando o destino não é painel interno (`/seller`, `/admin`, `/afiliado`, `/parceiro`).
  - Duas telas de criação de conta: `/seller/cadastro` ("Vender no 24h", destino pós-confirmação `/seller/minha-loja`) e `/cadastro` (comprador). A conta é a mesma; o papel vem do que a pessoa faz depois.
  - Conta nasce não confirmada. O e-mail de confirmação e o de recuperação saem pela Resend com a identidade do site e apontam direto para `/auth/confirm` com `token_hash`.
  - Loja é criada pelo próprio seller em `/seller/minha-loja`, nasce `EmAnalise` e só aparece na vitrine e no checkout depois que um admin muda para `Ativa` em `/admin/lojas`.
  - Admin nunca é self-service (linha manual em `admins`).
- **Problema**: o fluxo cresceu ad-hoc e quebrou em cadeia para seller novo. Relato de QA de 15/09: cadastro concluído e e-mail confirmado, mas login "E-mail ou senha incorretos" e "Esqueci a senha" sem efeito. A investigação em produção achou cinco defeitos encadeados (ver §9, 15/09) e dois ainda abertos: a tela de cadastro manda usar "Esqueci a senha" sem oferecer o caminho, e o e-mail repetido gera alerta de erro no Sentry.

> **Contexto técnico** (Supabase Auth, SSR com cookies, RLS, Turnstile, Resend) vive no TRD (`docs/trd.md`).

## 2. Solução Proposta

### Visão de produto

- Um ponto de entrada de login para todos os perfis; sessão inválida nunca vira tela de erro genérica.
- Seller novo percorre sem atrito: criar conta → confirmar e-mail → aceitar termos → criar loja → aguardar aprovação.
- Toda mensagem de erro de acesso diz o que fazer a seguir e oferece o caminho (link ou botão), nunca só o texto.
- Recuperação de senha é o mesmo fluxo para todos os perfis e funciona a partir do login e do cadastro.
- Aprovação da loja é decisão humana do admin; a curadoria automática só orienta o seller.

### Decisões de produto

1. Google é método adicional ao e-mail/senha, nunca substituto. *(confirmado)*
2. Uma mesma conta acumula papéis (comprador que vira seller usa a mesma conta). *(confirmado: não existe tipo de conta fixo)*
3. Admin nunca é self-service. *(confirmado)*
4. Conta Google e conta e-mail/senha com o mesmo endereço são a mesma conta. *(validado em 31/07)*
5. Login de conta não confirmada informa que falta confirmar o e-mail, em vez da mensagem genérica de credencial. Motivo: o seller achava que tinha errado a senha. *(implementado em #643)*
6. A tela `/seller/minha-loja` abre para conta logada sem loja; as demais telas do painel continuam exigindo loja. Motivo: é onde a primeira loja nasce. *(implementado em #647)*
7. Loja nova sempre nasce `EmAnalise`; só admin muda para `Ativa` ou `Inativa`. Curadoria automática não aprova nem reprova. *(confirmado no código e no banco)*

### Fora do escopo

- Parceiro logístico (`/parceiro/cadastro`): mecanismo parecido, não revisado nesta rodada.
- MFA/2FA. *(premissa — confirme ou corrija)*
- Outros provedores sociais além do Google.
- Remoção das contas de demonstração (`ContasTeste.tsx`): decisão de lançamento.
- Níveis de permissão dentro do admin.
- Motivo de recusa estruturado para loja `Inativa` e fluxo de recurso do seller. *(premissa — confirme ou corrija: hoje não existe; fica para PRD próprio se for pedido)*

## 3. Funcionalidades

### US01: Login com e-mail e senha

Como usuário de qualquer perfil, quero entrar com e-mail e senha, para acessar a área do meu perfil.

**Rules:**
- O mesmo formulário serve todos os perfis, em `/login` e no modal do header.
- Sem `next`, o servidor decide o destino pelos papéis da conta (admin > loja > afiliação > parceiro > home).
- Credencial errada mostra "E-mail ou senha incorretos", sem revelar se o e-mail existe.
- Conta existente com e-mail não confirmado mostra "Falta confirmar seu e-mail" e orienta a abrir o link recebido.
- Após login recusado, o e-mail digitado permanece no campo.
- Limite de 5 tentativas por e-mail e 20 por IP por minuto, com mensagem própria; verificação Turnstile obrigatória.

**Edge cases:**
- `next` externo ou `//host` → ignorado, cai no destino padrão.
- Clique em "Entrar" antes da verificação de segurança carregar → botão desabilitado com "Carregando verificação...".
- Usuário já logado acessa `/login` → permanece na tela. *(premissa — confirme se deveria redirecionar ao destino)*
- Conta não confirmada tenta entrar → recebe instrução de confirmar e um botão "Reenviar link de confirmação". *(decidido em 15/09; pendente de implementação)*

### US02: Login social com Google

Como comprador, quero entrar com minha conta Google, para não precisar de senha deste site.

**Rules:**
- O botão aparece só quando o destino não é painel interno; seller, admin, afiliado e parceiro entram por e-mail/senha.
- O retorno cai em `/auth/callback` e segue o mesmo `next` do login por senha.

**Edge cases:**
- Provider desabilitado ou erro ao iniciar → mensagem no formulário, sem quebrar a página.
- Código OAuth expirado ou reusado → `/login?erro=link_invalido`.
- E-mail Google já cadastrado com senha → autentica a mesma conta.

### US03: Recuperação de senha ("Esqueci a senha")

Como usuário que esqueceu a senha, quero receber um link de redefinição, para recuperar o acesso sem suporte.

**Rules:**
- Disponível no formulário de login, usando o e-mail já digitado no campo.
- Mensagem de envio é sempre a mesma, exista ou não a conta (não revela e-mails cadastrados).
- O link leva a `/auth/confirm` e depois a `/definir-senha`; a nova senha exige no mínimo 8 caracteres, igual ao cadastro.
- Após salvar a senha, o usuário entra direto e segue para o painel.

**Edge cases:**
- Campo e-mail vazio → erro pedindo para preencher, nada é enviado.
- Clique em "Esqueci a senha" logo após login recusado → usa o e-mail que continua no campo e envia.
- Link expirado ou já usado → `/login?erro=link_invalido` com instrução para pedir novo link.
- Conta criada só via Google → definir senha cria a primeira senha. *(premissa — não testado; validar antes de fechar o Milestone 2)*

### US04: Criação de conta

Como pessoa nova no marketplace, quero criar uma conta, para comprar ou vender.

**Rules:**
- `/seller/cadastro` ("Vender no 24h") leva à criação da loja após a confirmação; `/cadastro` é a conta de comprador. A conta resultante é a mesma nos dois casos.
- Senha mínima de 8 caracteres com confirmação; senha presente em vazamentos conhecidos é recusada com mensagem própria.
- A conta só entra depois de confirmar o e-mail; o link chega pela Resend em até ~2 minutos e leva direto ao destino (`/seller/minha-loja` no fluxo seller).
- E-mail já cadastrado → mensagem específica com caminho clicável para entrar e para "Esqueci a senha". *(pendente: hoje a mensagem só cita "Esqueci a senha", sem link, e os campos são apagados)*
- E-mail já cadastrado é resultado esperado de negócio e não conta como erro da aplicação no monitoramento. *(pendente: hoje gera alerta de erro no Sentry a cada tentativa)*
- Excesso de cadastros no mesmo período → mensagem pedindo para aguardar alguns minutos.

**Edge cases:**
- Senha e confirmação diferentes → erro local, sem envio.
- Tentativa com e-mail já existente → mensagem específica, e-mail preservado no campo e link para recuperar a senha.
- Pessoa se cadastra de novo com e-mail ainda não confirmado → recebe um novo link de confirmação. *(premissa: não verificado se a senha nova substitui a do primeiro cadastro; caso real `ianmdagostini@gmail.com`)*
- Comprador usa "Vender no 24h" só para comprar e nunca cria loja → permitido; a conta funciona como comprador.

### US05: Controle de acesso por perfil

Como o sistema, quero impedir acesso à área de um perfil que o usuário não tem, para proteger dados e ações de cada perfil.

**Rules:**
- `/admin/**`: exige sessão e linha em `admins`.
- `/seller/**`: exige sessão e loja própria; sem loja, redireciona para `/login?erro=sem_loja` com a mensagem "Essa conta não tem loja vinculada...". Exceção: `/seller/minha-loja` abre para conta logada sem loja.
- `/seller/**` e `/afiliado/**`: aceite dos termos do perfil é obrigatório antes de liberar o conteúdo (seller: "Termos do Mercado Futuro").
- `/afiliado/solicitar`, `/seller/cadastro` e `/parceiro/cadastro` abrem sem o papel (onboarding).
- Pedido de outra conta responde 404, nunca "acesso negado".
- Falha ao ler a sessão é tratada como deslogado, nunca como erro genérico.

**Edge cases:**
- Conta sem loja abre `/seller/produtos` → `sem_loja`.
- Conta sem loja abre `/seller/minha-loja` → vê o formulário "Você ainda não tem loja".
- Sessão com refresh token inválido em área logada → estado "faça login", sem crash.

### US06: Criação e aprovação da loja

Como seller recém-cadastrado, quero criar minha loja e saber quando ela foi aprovada, para começar a vender.

**Rules:**
- A loja é criada em `/seller/minha-loja`; só o nome é obrigatório. CNPJ, contato, endereço, logo, banner, pedido mínimo e retirada são opcionais na criação.
- Chave PIX pode ser informada na criação; depois só muda pelo fluxo dedicado, que audita e reinicia a carência de repasse.
- Loja nasce `EmAnalise`, fora da vitrine e do checkout.
- Ao salvar, a curadoria automática gera avisos para o seller (dados faltando ou inconsistentes) exibidos na própria tela; não altera a situação da loja.
- Quem aprova é o admin, em `/admin/lojas`, com os botões Ativar e Inativar; o menu do admin mostra a contagem de lojas em análise.
- Ao criar a loja, o admin recebe e-mail em `industria24hs@gmail.com` com assunto `Quero vender - solicitação de cadastro` e WhatsApp via BubbleWhats "Nova solicitação de cadastro de loja", com link para a loja. Falha no aviso não impede a criação. *(decidido em 15/09; Issue #651, change `aviso-admin-nova-loja`)*
- Prazo de análise da loja: 2 dias a partir da criação. *(decidido em 15/09; forma de lembrete ao admin a definir)*
- Uma conta tem no máximo uma loja. *(decidido em 15/09)*
- Só loja `Ativa` aparece na vitrine e aceita pedido.
- Ao criar ou salvar a loja, o seller vê confirmação na tela. *(pendente: hoje a tela só troca o subtítulo, sem mensagem)*
- Seller é avisado por e-mail quando a loja muda para `Ativa` ou `Inativa`. *(premissa — confirme: hoje não existe nenhum aviso; o seller só descobre abrindo o painel)*

**Edge cases:**
- Seller tenta criar uma segunda loja → recusado; a conta edita a loja que já tem. Contas legadas com duas lojas (`hidroburiti@gmail.com`) precisam de tratamento de dados à parte. *(decidido em 15/09)*
- Admin inativa loja já ativa → sai da vitrine; seller mantém acesso ao painel. *(premissa — confirme ou corrija)*
- Loja passa de 2 dias em análise → fora do prazo; o admin deve ser lembrado. *(decidido o prazo em 15/09; lembrete em change própria)*
- BubbleWhats indisponível ao criar a loja → loja criada, e-mail enviado, falha registrada no Sentry.

## 4. Fluxo de Negócio

```
Seller novo
   │
   ▼
/seller/cadastro ── e-mail já existe? ── sim ──▶ mensagem + links Entrar / Esqueci a senha
   │ não
   ▼
Conta criada (não confirmada) ──▶ e-mail de confirmação (Resend)
   │
   ├── tenta login antes de confirmar ──▶ "Falta confirmar seu e-mail"
   ▼
Clica no link ──▶ /auth/confirm ── link válido? ── não ──▶ /login?erro=link_invalido
   │ sim (sessão criada)
   ▼
/seller/minha-loja ──▶ termos aceitos? ── não ──▶ portão de termos
   │ sim
   ▼
Cria loja (EmAnalise) ──▶ curadoria gera avisos ao seller
   │
   ▼
Admin em /admin/lojas ── Ativar ──▶ loja na vitrine e no checkout
                      └─ Inativar ──▶ fora da vitrine

Esqueceu a senha (login)
   │
   ▼
E-mail no campo? ── não ──▶ "Preencha o e-mail"
   │ sim
   ▼
Mensagem neutra de envio ──▶ link ──▶ /auth/confirm ──▶ /definir-senha (≥ 8) ──▶ painel
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Seller novo completa cadastro → confirmação → termos → loja criada sem nenhuma tela de erro | Relato de QA de 15/09: seller confirmado não conseguia entrar nem criar loja | Em produção, alias novo em `/seller/cadastro` até loja `EmAnalise` no banco |
| Link de confirmação termina em `/seller/minha-loja`, nunca em `link_invalido` | Seller via "link inválido" logo após confirmar | Abrir o link do e-mail e conferir a URL final |
| Login de conta não confirmada mostra "Falta confirmar seu e-mail" | Seller achava que tinha errado a senha | Login antes de clicar no link |
| "Esqueci a senha" funciona logo após um login recusado, sem redigitar o e-mail | O formulário apagava o e-mail e nada era enviado | Errar a senha, clicar "Esqueci a senha", receber o e-mail |
| Recuperação leva a `/definir-senha`, aceita senha ≥ 8 e entra com ela | Recuperar acesso sem suporte | Fluxo completo com conta de QA |
| Cadastro com e-mail existente mostra links para Entrar e Esqueci a senha e mantém o e-mail no campo | Print de 15/09: mensagem cita "Esqueci a senha" sem oferecer o caminho | Cadastrar com e-mail já usado |
| Cadastro com e-mail existente não gera evento de nível erro no Sentry | Alerta falso a cada tentativa (Sentry 2513cb15, 15/09) | Repetir o cadastro e conferir ausência de novo evento `error` |
| Conta sem loja abre `/seller/minha-loja` e é barrada nas demais telas do painel | Criar loja sem abrir o painel inteiro | Acessar as duas rotas com conta sem loja |
| Loja nova só aparece na vitrine depois de `Ativa` pelo admin | Moderação antes de vender | Buscar a loja na vitrine antes e depois de ativar |
| Nenhuma área logada mostra "Algo deu errado" com sessão corrompida | Incidente de 31/07 | Cookie de sessão inválido em cada área |
| Pedido de outro cliente responde 404 | Não vazar pedidos de terceiros | URL direta logado como outra conta |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Contas seller confirmadas que criam loja | A levantar (`auth.users` × `lojas`, a partir de 15/09) | ≥ 70% em 7 dias | 30 dias após #647 | ≥ 50% | Dono do produto |
| Lojas em análise há mais de 48 h | A levantar (`lojas.situacao = 'EmAnalise'`) | 0 | 30 dias | ≤ 2 | Admin |
| Relatos de "não consigo entrar" após confirmar | 1 relato de QA (15/09) | 0 | 30 dias | 0 repetidos da mesma causa | Dono do produto |
| Eventos de nível erro no Sentry por e-mail já cadastrado | ≥ 1 por tentativa (Sentry 2513cb15) | 0 | Após correção | 0 | Dono do produto |

**Regras:**
- Baselines "A levantar" devem ser medidos com `supabase db query --linked` na data do marco.

## 6. Milestones

### Milestone 1: Login unificado e resiliente

**Por que é um marco:** qualquer perfil entra e sessão corrompida nunca quebra a experiência.

**Funcionalidades:** US01, US02, US05

**Checklist de aceite:**
- [x] Login por e-mail/senha respeita `next` e destino por papel
- [x] `getUser()` trata falha de sessão (seller, admin, afiliado)
- [x] Conta não confirmada vê "Falta confirmar seu e-mail" (#643, validado em prod 15/09)
- [x] E-mail permanece no campo após login recusado (#643, validado em prod 15/09)
- [x] Conta sem loja abre `/seller/minha-loja` e é barrada no resto (#647, validado em prod 15/09)
- [ ] Pedido de outro cliente responde 404 (reverificar)

**Aprovador:** Dono do produto

### Milestone 2: Recuperação de senha confiável

**Por que é um marco:** usuário recupera o acesso sem suporte.

**Funcionalidades:** US03

**Checklist de aceite:**
- [x] Link de recuperação leva a `/definir-senha` e a senha nova funciona (validado em prod 15/09)
- [x] "Esqueci a senha" funciona após login recusado (#643)
- [x] Mínimo de 8 caracteres em `/definir-senha` (#643)
- [ ] Definir senha funciona para conta criada só via Google

**Aprovador:** Dono do produto

### Milestone 3: Criação de conta sem becos sem saída

**Por que é um marco:** quem cria conta sempre sabe o próximo passo e tem o link para dá-lo.

**Funcionalidades:** US04

**Checklist de aceite:**
- [x] Existe `/cadastro` de comprador separado de "Vender no 24h"
- [x] Link de confirmação vai direto ao destino, sem `link_invalido` (#643, validado em prod 15/09)
- [ ] E-mail existente mostra links Entrar e Esqueci a senha e mantém o e-mail no campo
- [ ] E-mail existente não gera evento de erro no Sentry
- [ ] Recadastro de e-mail não confirmado: regra de qual senha vale definida e verificada

**Aprovador:** Dono do produto

### Milestone 4: Loja criada e aprovada com visibilidade para o seller

**Por que é um marco:** seller novo sai do cadastro com loja enviada para análise e sabe quando pode vender.

**Funcionalidades:** US06

**Checklist de aceite:**
- [x] Seller sem loja cria a loja em `/seller/minha-loja` e ela nasce `EmAnalise` (validado em prod 15/09)
- [x] Admin ativa ou inativa em `/admin/lojas`; só `Ativa` aparece na vitrine
- [ ] Confirmação visível ao criar ou salvar a loja
- [ ] Seller avisado quando a loja é ativada ou inativada *(depende da decisão da premissa em US06)*
- [ ] Regra de mais de uma loja por conta definida

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Seller não sabe que a loja foi aprovada e abandona | Alto: loja aprovada sem produtos | Aviso por e-mail na mudança de situação (US06) | Pendente de decisão |
| Loja parada em análise sem dono | Médio | Contagem no menu do admin já existe; avaliar SLA e lembrete | Monitorando |
| Alerta falso de Sentry mascara erro real de cadastro | Médio | Não reportar e-mail já cadastrado como erro | Pendente |
| Limite de envio de e-mail do Supabase em picos de cadastro | Médio | E-mails já saem pela Resend; configurar SMTP próprio no Supabase | Pendente |
| Contas de teste criadas na validação de 15/09 (`andreiaschneider+sellerqa0915`, `revgrow7+qa0915`, `revgrow7+qa0915b`) e loja `00ed9432…` | Baixo | Remover antes do lançamento junto com as contas de demonstração | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Resend com domínio `industria24.com.br` verificado | Externa | Concluído (chave em Production desde 11/07) | Milestones 2 e 3 |
| Provider Google no Supabase + redirect URI | Externa | Concluído em 31/07 | Milestone 1 (Google) |

## 8. Referências

- [PR #180](https://github.com/Schneider-Gr/industria24hIA/pull/180): login com Google
- [PR #186](https://github.com/Schneider-Gr/industria24hIA/pull/186): sessão corrompida na página de pedido
- [PR #446](https://github.com/Schneider-Gr/industria24hIA/pull/446): recuperação de senha com `hashed_token`
- [Issue #642](https://github.com/Schneider-Gr/industria24hIA/issues/642) / [PR #643](https://github.com/Schneider-Gr/industria24hIA/pull/643): confirmação, login não confirmado, esqueci a senha
- [Issue #646](https://github.com/Schneider-Gr/industria24hIA/issues/646) / [PR #647](https://github.com/Schneider-Gr/industria24hIA/pull/647): seller sem loja em `/seller/minha-loja`
- Sentry `2513cb1513264d54a9246788b5cf60dc`: e-mail já cadastrado reportado como erro

## 9. Registro de Decisões

- **2026-09-15 (dona do produto):** (a) aviso ao admin por e-mail e WhatsApp dispara na criação da loja; (b) uma conta tem no máximo uma loja; (c) prazo de análise de 2 dias; (d) conta não confirmada ganha botão de reenviar confirmação no login; (e) links de login e cadastro por perfil (`/entrar/seller`, `/cadastro/seller`, afiliado, parceiro) definem o papel pretendido da conta, guardado nos metadados da conta, acumulando com papéis anteriores; slug `seller`. O papel pretendido orienta destino e onboarding, mas não substitui as aprovações (loja ativa, afiliação aprovada, parceiro não suspenso). Pendente: aviso ao seller na ativação/inativação da loja.

- **2026-09-15:** Revisão do estado real após relato de QA de seller que não entrava. Cinco defeitos reproduzidos em produção e corrigidos: (1) link de confirmação passava pelo servidor do Supabase e caía em `link_invalido`; (2) conta não confirmada via "senha incorreta"; (3) formulário de login apagava o e-mail após erro e "Esqueci a senha" não enviava; (4) `/definir-senha` aceitava 6 caracteres; (5) painel barrava `/seller/minha-loja` para conta sem loja. Motivo da revisão: as regras de US01, US03, US04 e US05 descreviam comportamento que não existia mais ou nunca existiu.
- **2026-09-15:** Adicionada US06 (criação e aprovação da loja) e Milestone 4. Motivo: é a continuação natural do cadastro de seller e o ponto onde o fluxo travava; a aprovação é humana (admin) e a curadoria só orienta. Critério de `depends_on`: nenhum PRD existente especifica comportamento que este pressupõe; mantido vazio.
- **2026-09-15:** US05 corrigida: `/seller/**` exige loja (antes dizia "sempre libera"). Motivo: comportamento real desde #473.
- **2026-08-27:** PRD virou a OpenSpec change `refazer-login-cadastro-loja-admin`, com escopo ampliado para onboarding de loja e gestão Admin. Milestones 1 e 2 parcialmente no master; estado `EmAnalise` criado na migration 0152.
- **2026-07-31:** Google como método adicional, não substituto. Motivo: um único mecanismo de sessão.
- **2026-07-31:** Admin fora do self-service. Motivo: área mais sensível do marketplace.
- **2026-07-31:** Ambiguidade do cadastro único registrada como gap do Milestone 3. Motivo: rótulo "Vender no 24h" misturava comprador e vendedor.

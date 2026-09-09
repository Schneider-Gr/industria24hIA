---
prd_number: "032"
status: rascunho
priority: média
created: 2026-09-09
issue: "#561"
depends_on: ["027"]
references:
  - https://industria24.com.br/venda-no-industria
  - https://github.com/Schneider-Gr/industria24hIA/pull/556
  - https://github.com/Schneider-Gr/industria24hIA/pull/560
  - docs/prds/027-csp-nonce-e-pendencias-hardening.md
---

# PRD 032: Slot de vídeo na LP de captação de seller

## 1. Contexto

- **Produto/área**: captação de indústrias (seller acquisition), landing page `/venda-no-industria`.
- **Estado atual**: a LP está em produção e foi redesenhada (PR #556, #560). Ela tem hero, simulador de margem interativo, etapas, motores de venda, seção de alcance ilustrada, fluxo do dinheiro, preço e objeções — tudo em texto, imagem estática e um simulador. **Não existe player, `<iframe>` nem `<video>` em nenhum ponto da página.** O mockup original previa um slot de vídeo que nunca foi implementado porque não havia vídeo gravado.
- **Problema**: o argumento de captação depende de explicar um modelo que o fabricante nunca viu (venda direta com pagamento retido, split e repasse na confirmação de entrega). Hoje isso é feito por parede de texto, e o Key Account precisa repetir a mesma explicação em cada ligação. Os roteiros já existem — um explainer de 88s e 6 shorts — mas não há onde publicá-los no site, então o material de vídeo, quando for gravado, não tem destino.

> **Restrição herdada que molda esta feature:** a CSP do projeto (ver PRD 027) declara `frame-src 'self' https://challenges.cloudflare.com` e **não declara `media-src`** (portanto herda `default-src 'self'`). Consequência prática: vídeo self-hosted na própria origem funciona sem tocar na política; **embed de terceiro — YouTube incluído — é bloqueado silenciosamente pelo browser** até que a origem seja adicionada ao `frame-src`. Detalhe de implementação da CSP vive no TRD/ADR, não aqui.

## 2. Solução Proposta

### Visão de produto

- Dar à LP um slot de vídeo que **explica o modelo em menos de dois minutos**, no ponto da página onde o visitante já entendeu a promessa mas ainda não confia nela.
- O vídeo é **complemento, não pré-requisito**: quem não dá play precisa continuar entendendo a página inteira pelo texto, como hoje.
- O slot **não pode custar o desempenho da página**: nada de player carregado antes de o visitante demonstrar intenção de assistir.
- A página deve **se comportar corretamente quando não há vídeo publicado** — que é o estado atual e vai continuar sendo até a gravação existir.
- O mesmo slot deve servir os shorts depois, sem novo redesenho da seção.

### Decisões de produto

1. **O vídeo é hospedado na própria origem (arquivo de vídeo servido pelo site), não por embed de plataforma.** Motivo: a CSP atual bloqueia embed de terceiro, e afrouxá-la para captação é abrir superfície de risco numa página pública por uma razão de marketing. Self-hosted também evita expor o visitante a rastreamento de terceiro antes do consentimento e tira da tela os elementos da plataforma (vídeos sugeridos, canal, botão de compartilhar) que competem com o CTA. *(premissa — confirme ou corrija)*
2. **O slot fica logo após o simulador de margem.** Motivo: o simulador é o momento de maior engajamento da página, e o vídeo responde exatamente a pergunta que ele levanta ("isso funciona mesmo?"). *(premissa — confirme ou corrija)*
3. **O play é sempre manual.** Sem autoplay, sem som automático. Motivo: autoplay com som em LP institucional gera abandono e é hostil em mobile e em ambiente de trabalho — que é onde o fabricante navega. *(premissa — confirme ou corrija)*
4. **A ausência de vídeo publicado não é erro:** sem vídeo, a seção simplesmente não é renderizada e a página segue íntegra. Motivo: o conteúdo depende de uma gravação que ainda não existe, e a LP não pode ficar com buraco visual esperando por ela.
5. **O CTA continua sendo o do restante da página** ("Falar com um consultor", que registra o lead no CRM). O vídeo não ganha CTA próprio concorrente. *(premissa — confirme ou corrija)*

### Fora do escopo

- **Produção do vídeo** (gravação, narração, edição, legendagem). É trabalho de conteúdo, não de software; os roteiros já existem em documento próprio.
- **Painel para o time trocar o vídeo pela interface.** A troca é feita por publicação de código nesta primeira entrega. *(premissa — confirme ou corrija)*
- **Métricas de audiência do vídeo** (quartis assistidos, mapa de calor de retenção). Fora desta entrega; ver §5b para o que será medido. *(premissa — confirme ou corrija)*
- **Vídeo nas demais páginas** (home, produto, loja). O escopo é a LP de captação. *(premissa — confirme ou corrija)*
- **Legendas traduzidas para outros idiomas.** O público-alvo é fabricante brasileiro. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Assistir ao explainer na própria LP

Como fabricante avaliando a plataforma, quero assistir a um vídeo curto que explica como a venda direta funciona, para decidir se vale falar com um consultor sem precisar ler a página inteira.

**Rules:**
- O slot exibe um único vídeo principal, com uma imagem de capa e um controle de play visível antes de qualquer carregamento do vídeo.
- O vídeo só começa a carregar depois que o visitante aciona o play — nunca no carregamento da página.
- O play é manual e o vídeo inicia com som, como o visitante espera de um play deliberado.
- Os controles nativos (pausar, barra de progresso, volume, tela cheia) ficam disponíveis durante a reprodução.
- O vídeo tem legendas embutidas ou faixa de legendas, para quem assiste sem som. *(premissa — confirme ou corrija)*
- A seção tem um título e uma linha de apoio que fazem sentido mesmo para quem não vai dar play.

**Edge cases:**
- Vídeo não publicado (estado atual) → a seção inteira não é renderizada; a página segue sem espaço vazio nem placeholder.
- Falha ao carregar o vídeo após o play → mensagem honesta de que o vídeo não pôde ser carregado, com a página e os CTAs continuando utilizáveis. *(premissa — confirme ou corrija)*
- Visitante com conexão lenta → a capa aparece imediatamente junto com o resto da página; só o vídeo depende da rede.
- Visitante que assiste até o fim → o vídeo para no último quadro, sem sugerir outros conteúdos nem reiniciar sozinho. *(premissa — confirme ou corrija)*

### US02: Navegar a LP sem ser penalizado pelo vídeo

Como visitante em conexão móvel ou plano de dados limitado, quero que a página carregue tão rápido quanto antes do vídeo existir, para não desistir antes de ler a proposta.

**Rules:**
- O peso adicional que o slot impõe a quem **não** dá play se limita à imagem de capa.
- A rota `/venda-no-industria` continua sendo entregue como página estática, como é hoje.
- O bloco do vídeo reserva seu espaço antes de carregar, para o conteúdo abaixo não pular quando a capa aparecer.

**Edge cases:**
- Visitante com JavaScript indisponível → a página inteira continua legível e os CTAs de contato continuam alcançáveis; o vídeo pode não reproduzir. *(premissa — confirme ou corrija)*
- Visitante que sinaliza preferência por menos movimento no sistema → nenhuma animação de destaque no slot. *(premissa — confirme ou corrija)*

### US03: Assistir em qualquer tela e com acessibilidade

Como fabricante que abre o link no celular durante o expediente, quero assistir ao vídeo confortavelmente na tela pequena, para não precisar voltar depois no computador.

**Rules:**
- O slot é responsivo e mantém a proporção do vídeo sem cortar imagem em telas estreitas.
- O controle de play é alcançável por teclado e anuncia o que faz para leitores de tela.
- O contraste do slot atende ao mesmo padrão do restante da página.

**Edge cases:**
- Tela muito estreita → o vídeo ocupa a largura disponível e a seção empilha, sem rolagem horizontal na página.
- Visitante navegando só por teclado → consegue chegar ao play, acionar e sair do player sem ficar preso nos controles. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Visitante abre /venda-no-industria
   │
   ▼
Existe vídeo publicado?
   ├── não ──▶ Página renderiza sem a seção de vídeo (estado atual)
   └── sim ──▶ Seção aparece com capa + play (vídeo NÃO carregado)
                  │
                  ▼
               Visitante aciona o play?
                  ├── não ──▶ Segue a página; nenhum custo de rede pelo vídeo
                  └── sim ──▶ Carrega e reproduz
                                 ├── sucesso ──▶ Assiste ──▶ CTA "Falar com um consultor"
                                 └── falha ────▶ Mensagem honesta; página e CTAs seguem
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| Sem vídeo publicado, a LP renderiza exatamente como hoje, sem seção vazia | É o estado atual e vai durar até a gravação existir; buraco visual desqualifica a página na frente do prospect | Abrir a LP sem vídeo configurado e conferir que não há seção nem espaço reservado |
| Nenhuma requisição de vídeo acontece antes do play | Fabricante navega em conexão móvel; baixar vídeo sem pedir queima plano de dados e atrasa a página | Abrir a página e inspecionar as requisições de rede: nenhuma de arquivo de vídeo até o clique no play |
| O que o slot acrescenta ao carregamento inicial não passa de 150KB | Acima disso o ganho de conversão do vídeo é anulado pela perda de quem desiste de esperar | Medir o peso transferido da página antes e depois da feature |
| O vídeo inicia a reprodução em até 3s após o play em conexão de banda larga | Além disso o visitante interpreta como quebrado e abandona | Cronometrar do clique ao primeiro quadro |
| `/venda-no-industria` continua prerenderizada como estática | A LP é a porta de entrada de campanha; passar a dinâmica encarece e atrasa cada visita | Conferir a rota como estática na saída do build |
| A seção não desloca o conteúdo abaixo ao carregar a capa | Salto de layout faz o visitante clicar no lugar errado e perder o CTA | Medir deslocamento de layout da página com a seção presente |
| Play alcançável e acionável por teclado, com rótulo anunciado por leitor de tela | Acessibilidade é requisito, não melhoria opcional | Navegar só por teclado até o play e inspecionar o nome acessível do controle |
| Em tela de 360px de largura, a página não rola horizontalmente | Boa parte do público abre o link pelo WhatsApp no celular | Abrir em viewport de 360px e conferir ausência de rolagem horizontal |
| Nenhuma origem nova é liberada na política de segurança da página | Afrouxar a política de uma página pública por marketing amplia superfície de ataque | Comparar as diretivas da política antes e depois da feature |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Leads de seller vindos da LP (`public.leads`, `persona='seller'`, `fonte='bot_site'`) | **A levantar** — o handoff bot → lead nunca foi validado ao vivo em produção; sem isso não há baseline confiável | +30% sobre o baseline | 30 dias após o vídeo publicado | Nenhuma queda em relação ao baseline | Dono do produto |
| Visitantes que acionam o play | Não existe (não há vídeo) | 25% dos visitantes da LP | 30 dias após publicação | 10% — abaixo disso o slot não paga o esforço de produção | Dono do produto |
| Peso da página no carregamento inicial | A medir na versão em produção antes da feature | Acréscimo ≤ 150KB | Na entrega | Acréscimo ≤ 150KB | Quem implementa |

**Observação:** o baseline de leads depende de validar o handoff bot → lead em produção, hoje pendente. Sem esse número, a primeira métrica é aspiracional — levantar antes de publicar o vídeo.

## 6. Milestones

### Milestone 1: Publicar o slot de vídeo na LP

**Por que é um marco:** a LP passa a ter onde receber o explainer, e o material de vídeo deixa de ser um ativo sem destino. É o que destrava a gravação: hoje ninguém grava porque não há onde publicar.

**Funcionalidades:** US01, US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Sem vídeo publicado, a LP renderiza exatamente como hoje, sem seção vazia
- [ ] Nenhuma requisição de vídeo acontece antes do play
- [ ] O que o slot acrescenta ao carregamento inicial não passa de 150KB
- [ ] O vídeo inicia a reprodução em até 3s após o play em banda larga
- [ ] `/venda-no-industria` continua prerenderizada como estática
- [ ] A seção não desloca o conteúdo abaixo ao carregar a capa
- [ ] Play alcançável e acionável por teclado, com rótulo anunciado por leitor de tela
- [ ] Em tela de 360px, a página não rola horizontalmente
- [ ] Nenhuma origem nova é liberada na política de segurança da página

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|---|---|---|---|
| O vídeo nunca é gravado e o slot fica permanentemente vazio | Médio | A ausência de vídeo é estado suportado por design: a seção não renderiza e nada quebra; o custo de ter entregue o slot antes é baixo | Monitorando |
| Vídeo self-hosted encarece a entrega de banda conforme a campanha escala | Médio | Vídeo curto e comprimido; se o volume justificar, reavaliar hospedagem em PRD próprio | Pendente |
| Sem baseline de leads, não se consegue provar que o vídeo converteu | Alto | Validar o handoff bot → lead em produção **antes** de publicar o vídeo | Pendente |
| O vídeo desvia a atenção do simulador, que hoje é o melhor gancho da página | Baixo | Slot posicionado depois do simulador, sem autoplay e sem CTA concorrente | Mitigado por decisão de produto |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|---|---|---|---|
| Gravação do explainer de 88s (roteiro pronto, nada gravado) | Interna | Pendente | Milestone 1 entrega o slot, mas ele não aparece ao público até existir vídeo |
| Validação do handoff bot → lead em produção | Interna | Pendente | Sem baseline, a métrica de leads de §5b não é aferível |
| Política de segurança de conteúdo da página (PRD 027) | Interna | Vigente | Determina a decisão 1; mudar de hospedagem exige revisitar a política |

## 8. Referências

- [LP em produção](https://industria24.com.br/venda-no-industria) — a página que recebe o slot
- [PR #556](https://github.com/Schneider-Gr/industria24hIA/pull/556) — redesign da LP e simulador de margem; define o ponto onde o slot entra
- [PR #560](https://github.com/Schneider-Gr/industria24hIA/pull/560) — seção de alcance ilustrada; padrão visual de mídia na página
- `docs/prds/027-csp-nonce-e-pendencias-hardening.md` — política de segurança que restringe a hospedagem do vídeo
- Roteiros do explainer de 88s e dos 6 shorts — conteúdo que ocupará o slot (documento de trabalho, fora do repositório)

## 9. Registro de Decisões

- **2026-09-09:** Vídeo hospedado na própria origem em vez de embed de plataforma. Motivo: a política de segurança da página bloqueia embed de terceiro, e afrouxá-la numa página pública por razão de marketing amplia superfície de ataque; self-hosted ainda evita rastreamento de terceiro e elementos da plataforma competindo com o CTA.
- **2026-09-09:** Ausência de vídeo é estado suportado, não erro. Motivo: o conteúdo depende de gravação inexistente; entregar o slot antes destrava a produção sem deixar buraco na página.
- **2026-09-09:** `depends_on: ["027"]` porque esta feature pressupõe diretamente as diretivas de segurança definidas naquele PRD — é o que decide a forma de hospedagem. Os demais PRDs do repositório tratam de domínios sem relação (pagamento, vitrine, logística) e não foram listados apesar de coexistirem no mesmo produto.
- **2026-09-09:** Produção do vídeo declarada fora de escopo. Motivo: é trabalho de conteúdo; misturá-lo aqui tornaria o PRD indeployável por depender de gravação.

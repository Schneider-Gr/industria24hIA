---
prd_number: "027"
status: rascunho
priority: média
created: 2026-08-20
issue: ""
depends_on: []
references:
  - "src/app/(parceiro)/parceiro/GpsCheckin.tsx"
  - "src/lib/maps.ts"
  - "src/app/api/asaas/webhook/route.ts"
  - "supabase/migrations/0039_parceiro_logistico_schema.sql"
  - "supabase/migrations/0040_parceiro_logistico_rpcs.sql"
  - "supabase/migrations/0074_consolidacao_carga_rota.sql"
  - "supabase/migrations/0079_logistica_afiliado_produto.sql"
  - "docs/prds/022-painel-corridas-parceiro-campo.md"
  - "docs/prds/025-repasse-automatico-afiliado-parceiro-logistico.md"
  - ".claude/skills/afiliado-logistica/SKILL.md"
---

# PRD 027: Correspondência por proximidade e frete por distância real na logística

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Módulo de
  logística — despacho automático de corridas (afiliado/pool) e corridas
  avulsas (`/corridas`).
- **Estado atual**:
  - **Correspondência (matching)**: hoje não existe nenhum sinal de "onde o
    parceiro/afiliado está agora". A exclusividade do afiliado logístico
    (migration 0079) é por vínculo à loja, não por proximidade. O
    `parceiros_logisticos.cep_base` é auto-declarado no cadastro e nunca
    usado em nenhuma query. O único dado de posição que existe
    (`corrida_posicoes`) só é gravado **durante** uma corrida já aceita
    (`Coletada`/`EmTransito`), inútil para decidir *para quem* oferecer
    uma corrida nova.
  - **Preço por distância**: a distância real do trajeto **já é calculada**
    no despacho automático — o webhook do Asaas chama `calcularTrajeto()`
    (Google Distance Matrix, `src/lib/maps.ts`) antes de gravar a corrida
    (migration 0079), mas só para exibição (`X,X km` na tela do afiliado).
    O `preco_final` da corrida continua vindo exclusivamente do ad valorem
    calculado em `checkout_criar_pedido` (`% sobre valor dos itens` por
    faixa de CEP), sem nenhum ajuste pela distância real já calculada. Na
    corrida avulsa, `calcular_frete` (RPC Postgres) usa peso × preço/kg,
    também sem distância real — e, sendo uma função `plpgsql`, não pode
    chamar a API do Google diretamente.
- **Problema**: (1) sem sinal de proximidade, o afiliado/parceiro mais
  perto não tem nenhuma vantagem sobre um mais distante na hora de decidir
  quem recebe/vê uma corrida primeiro; (2) o frete cobrado não reflete o
  custo real de deslocamento quando o endereço de entrega está no limite
  ou fora da faixa de CEP calibrada, mesmo já tendo o dado de distância
  disponível no momento do despacho.

> **Contexto técnico**: este PRD assume a decisão já tomada na sessão de
> levantamento de que a plataforma **não é um app nativo nem um PWA com
> permissão de background** — qualquer leitura de geolocalização é pontual
> (`navigator.geolocation.getCurrentPosition`), disparada por uma ação do
> usuário ou abertura de tela, nunca rastreamento contínuo
> (`watchPosition`). O padrão já existe em produção: `GpsCheckin.tsx` já
> faz exatamente esse tipo de leitura pontual, hoje restrita ao contexto
> de corrida ativa.

## 2. Solução Proposta

### Visão de produto

- Capturar a posição do afiliado/parceiro logístico em **momentos
  discretos** (abrir a tela de corridas, tocar em "atualizar minha
  localização"), não continuamente — reaproveitando o mesmo componente já
  usado no check-in de corrida ativa.
- Usar essa posição, quando recente, para **ordenar** a lista de corridas
  disponíveis e para dar contexto no momento de oferecer/exibir uma corrida
  nova — nunca para escolher automaticamente e sem intervenção humana quem
  recebe a corrida (o modelo `primeiro_aceita`/exclusividade continua sendo
  quem decide, só a ordenação melhora).
- Aproveitar a distância real já calculada no despacho automático (custo de
  API já pago) para ajustar o `preco_final` da corrida quando o trajeto
  ultrapassar uma distância "incluída" na faixa de CEP.
- Estender o mesmo princípio à corrida avulsa, mas via mudança de
  arquitetura: como a RPC `calcular_frete` não pode chamar API externa, o
  app calcula a distância antes de publicar a corrida e passa o valor como
  parâmetro.

### Decisões de produto

1. **Leitura de posição é pontual, nunca contínua.** Consequência direta
   da decisão já registrada nesta sessão de não depender de PWA/app
   nativo. Qualquer necessidade futura de rastreamento contínuo real fica
   fora deste PRD.
2. **Posição pontual vira sinal de ordenação, não de atribuição
   automática.** Evita o risco de mandar uma corrida pra alguém que já
   fechou a aba e não está mais ali — o parceiro/afiliado ainda escolhe
   aceitar.
3. **Janela de "posição recente" de 2 horas.** Depois disso, o sistema
   trata a posição como stale e cai no fallback (`cep_base`). *(premissa —
   confirme ou corrija: 2h é um chute inicial, calibrar depois de
   observar o padrão real de uso)*
4. **Reaproveitar a chamada ao Google Distance Matrix já paga no
   despacho automático** — não adicionar chamada nova só para o preço; o
   ajuste de preço usa o mesmo resultado que já é gravado em
   `corridas.distancia_m`.
5. **Km incluído e valor por km excedente ficam em parâmetro configurável
   por admin, não hardcoded.** Mesma filosofia de `frete_tabela` (editável
   por admin) — o valor exato de calibração é decisão de negócio separada
   deste PRD, que só entrega o mecanismo.
6. **Corrida avulsa precisa de uma segunda RPC/parâmetro**, porque
   `calcular_frete` é `plpgsql` e não acessa a internet — o app calcula a
   distância antes de `publicar_corrida` e passa como argumento, com a RPC
   validando que o valor é plausível (não confiar cegamente em número vindo
   do client). *(premissa — confirme ou corrija: precisa de uma faixa de
   tolerância ou recálculo server-side via Edge Function, para não abrir
   brecha de manipulação do frete pelo próprio solicitante)*

### Fora do escopo

- **Rastreamento contínuo / app nativo / PWA com background location** —
  decisão já descartada nesta sessão.
- **Notificação via WhatsApp para candidatos próximos** — discutido na
  mesma sessão, mas com riscos próprios (custo por mensagem, risco à
  qualidade do número compartilhado com o bot de atendimento); fica como
  PRD separado se for adiante.
- **Repasse automático do valor ajustado ao parceiro** — já coberto pelo
  PRD 025 (o `valor_parceiro` gerado a partir de `preco_final` já se
  beneficia automaticamente de qualquer ajuste feito aqui, sem mudança
  adicional).
- **Alterar a faixa de exclusividade do afiliado logístico (5 min)** — a
  ordenação por proximidade não muda quem tem exclusividade, só a ordem
  de exibição dentro do pool geral.

## 3. Funcionalidades

### US01: Capturar posição pontual do afiliado/parceiro em mais pontos de contato

Como afiliado logístico ou parceiro de plataforma, quero que o app registre
minha localização quando abro a tela de corridas ou toco em "atualizar
localização", para que corridas próximas fiquem mais fáceis de encontrar
sem precisar de rastreamento em segundo plano.

**Rules:**
- Nova tabela (ou colunas em `parceiros_logisticos` + equivalente para
  afiliado logístico) guardando `lat`, `lng`, `atualizado_em` por usuário.
  *(premissa — confirme ou corrija: tabela nova `logistica_localizacao
  (user_id pk, lat, lng, atualizado_em)`, compartilhada entre os dois
  papéis, é mais simples que duplicar colunas em duas tabelas diferentes)*
- Reaproveita o padrão de `GpsCheckin.tsx` (`getCurrentPosition`, sem
  `watchPosition`), exposto em `/parceiro` e `/afiliado/logistica`
  independente de corrida ativa.
- RLS: usuário só escreve a própria linha (`user_id = auth.uid()`), mesmo
  padrão de `corrida_posicoes`.

**Edge cases:**
- Usuário nega permissão de geolocalização → tela funciona normalmente,
  só sem o benefício de ordenação por proximidade (fallback `cep_base`).
- Usuário abre o app em rede/GPS ruim (erro do navegador) → mesmo
  tratamento de erro já existente em `GpsCheckin` (mensagem, sem travar a
  tela).

### US02: Ordenar corridas disponíveis por proximidade quando houver sinal

Como afiliado/parceiro logístico, quero ver as corridas mais perto de mim
primeiro na lista, para decidir mais rápido qual aceitar.

**Rules:**
- Query de listagem calcula distância (Haversine, sem custo de API) entre
  a última posição conhecida (se `atualizado_em` dentro da janela de 2h) e
  o CEP/endereço de origem da corrida.
- Sem posição recente, ordena pela aproximação por faixa de CEP já usada
  hoje (comportamento atual preservado, não regressão).

**Edge cases:**
- Nenhum edge case novo além dos já cobertos pela tela atual — é mudança
  de ordenação, não de dado disponível.

### US03: Ajustar preço da corrida do despacho automático por distância real

Como plataforma, quando a distância real calculada no despacho automático
ultrapassar o limite incluído na faixa de CEP, quero adicionar o valor
correspondente ao `preco_final` da corrida, para o frete refletir melhor o
custo de deslocamento real.

**Rules:**
- No mesmo ponto do webhook onde `calcularTrajeto()` já roda (migration
  0079, antes do early-return de exclusividade), calcular:
  ```
  km_excedente = max(0, distancia_km - km_incluido_admin)
  ajuste = km_excedente * valor_por_km_admin
  preco_final = preco_final_ad_valorem + ajuste
  ```
- `km_incluido_admin` e `valor_por_km_admin` vêm de configuração editável
  por admin (Decisão 5), não hardcoded no código.
- Sem `GOOGLE_MAPS_API_KEY` configurada (`calcularTrajeto` retorna `null`,
  comportamento já existente), o ajuste não é aplicado — preço fica só no
  ad valorem, sem quebrar o despacho.

**Edge cases:**
- Falha da API do Google no meio do despacho → mesmo tratamento de erro
  já existente hoje (grava só `link_mapa`, sem km); ajuste de preço
  simplesmente não roda, corrida segue com preço ad valorem puro.

### US04: Ajustar preço da corrida avulsa por distância real

Como solicitante de uma corrida avulsa, quero que o frete sugerido reflita
a distância real entre origem e destino, não só peso, para o preço fazer
sentido em trajetos longos.

**Rules:**
- Antes de chamar `publicar_corrida`, o app calcula a distância via
  `calcularTrajeto()` (mesmo client já usado no webhook) e passa
  `p_distancia_km` como novo parâmetro da RPC.
- `calcular_frete` passa a considerar `p_distancia_km` na fórmula
  (`preco_base + peso_kg * preco_por_kg + distancia_km *
  preco_por_km`), com `preco_por_km` vindo de `frete_tabela` (nova
  coluna).
- RPC valida que `p_distancia_km` está dentro de uma faixa plausível para
  o par de CEPs informado (ex.: não pode ser negativo nem
  desproporcional ao intervalo de CEP), rejeitando valor absurdo sem
  travar em uma verificação exata contra o Google (que só o client tem).
  *(premissa — confirme ou corrija: nível de validação aceitável dado que
  o client já é confiável — usuário autenticado, não anônimo)*

**Edge cases:**
- Cliente não consegue calcular distância (API fora do ar, sem
  geolocalização) → `p_distancia_km` null, RPC usa só peso (comportamento
  atual), sem bloquear a publicação da corrida.

## 4. Fluxo de Negócio

```
Matching (US01/US02):
  parceiro abre tela de corridas
    → getCurrentPosition() pontual → grava logistica_localizacao
    → lista de corridas ordena por distância (se posição < 2h) ou CEP (fallback)

Preço despacho automático (US03):
  pagamento confirmado → despachar_corrida_automatica
    → calcularTrajeto(origem, destino) [já existe]
    → km > km_incluido? → preco_final += km_excedente * valor_por_km
    → grava corrida com preco_final ajustado

Preço corrida avulsa (US04):
  app calcula distância antes de publicar
    → publicar_corrida(..., p_distancia_km)
    → calcular_frete considera peso + distância
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|-------------------|------------------------------|
| Parceiro/afiliado consegue registrar posição pontual fora de corrida ativa | pré-requisito de US02 | tocar "atualizar localização" em `/parceiro`, conferir linha gravada |
| Lista de corridas disponíveis ordena por proximidade quando há posição recente | objetivo central de US02 | seed com posição conhecida + corridas em CEPs diferentes, conferir ordem |
| Corrida do despacho automático com trajeto acima do limite tem `preco_final` maior que o ad valorem puro | objetivo central de US03 | `begin; ...; select preco_final from corridas ...; rollback;` comparando com/sem ajuste |
| Sem `GOOGLE_MAPS_API_KEY`, despacho automático continua funcionando com preço ad valorem puro | não regressão | mesmo teste com env var ausente |
| Corrida avulsa com distância informada usa fórmula com componente de km | objetivo central de US04 | publicar corrida com CEPs distantes, conferir `preco_sugerido` |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|------------------|-------------|
| % de corridas despachadas com posição recente disponível para ordenação | 0% hoje (sinal não existe) | A definir após piloto — depende de adesão ao botão de atualizar localização | 60 dias após deploy | não é bloqueante — fallback por CEP sempre funciona | dono do módulo logística |
| Corridas com trajeto acima do km incluído recebendo ajuste de preço corretamente | não medido hoje | 100% das corridas elegíveis (com API do Google respondendo) | Contínuo | 0 corridas com km calculado mas sem ajuste aplicado | dono do módulo logística |

## 6. Milestones

### Milestone 1: Sinal de posição pontual + ordenação por proximidade

**Funcionalidades:** US01, US02

**Checklist de aceite:**
- [ ] Tabela/colunas de última posição conhecida + RLS
- [ ] Botão de atualizar localização reaproveitando padrão de `GpsCheckin`
- [ ] Ordenação por proximidade na lista de corridas, com fallback por CEP

**Aprovador:** dono do repositório (industria24hs-creator)

### Milestone 2: Preço por distância real no despacho automático

**Funcionalidades:** US03

**Checklist de aceite:**
- [ ] Configuração admin de km incluído + valor por km excedente
- [ ] Webhook aplica ajuste usando a distância já calculada
- [ ] Teste `begin; ...; rollback;` cobrindo com/sem API configurada

**Aprovador:** dono do repositório (industria24hs-creator)

### Milestone 3: Preço por distância real na corrida avulsa

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] `frete_tabela` ganha `preco_por_km`
- [ ] `publicar_corrida`/`calcular_frete` aceitam e usam `p_distancia_km`
- [ ] Validação de plausibilidade do valor informado pelo client

**Aprovador:** dono do repositório (industria24hs-creator)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Posição pontual fica desatualizada rápido (parceiro se move logo após abrir o app) | Baixo | é só sinal de ordenação, não atribuição automática — humano ainda decide | Aceito conscientemente |
| Cliente manipula `p_distancia_km` na corrida avulsa para reduzir o frete artificialmente | Médio | validação de plausibilidade na RPC (Decisão 6); se insuficiente, mover cálculo para Edge Function server-side em iteração futura | A validar na implementação |
| Ajuste de preço por km torna frete imprevisível para o comprador que já viu um valor no checkout (ad valorem) | Médio | US03 só se aplica ao despacho automático pós-pagamento, não ao valor cobrado do comprador no checkout — a diferença vira custo/margem da plataforma, não repasse extra ao comprador. *(premissa — confirme ou corrija: se a intenção for cobrar o comprador pelo excedente, é PRD diferente, que mexe em `checkout_criar_pedido`, não só no despacho)* | Precisa validação explícita do dono do produto |
| Custo de Distance Matrix na corrida avulsa se o cliente recalcular várias vezes antes de publicar | Baixo | reaproveitar debounce/cache já natural do formulário (só uma chamada por submissão) | Mitigado por desenho |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|------------------------|
| `GOOGLE_MAPS_API_KEY` em produção | Interna | já registrada na Vercel (confirmado em sessão anterior, skill `afiliado-logistica`) | nenhum |
| PRD 025 (repasse automático logística) | Interna | rascunho, não bloqueante | o ajuste de preço deste PRD já flui automaticamente para `valor_parceiro` quando/se 025 for implementado |
| Decisão de negócio sobre o risco 3 (comprador paga o excedente ou é custo da plataforma) | Externa | Pendente | Milestone 2 não deve avançar sem essa definição, para não gerar ajuste de preço sem dono claro de quem absorve o custo |

## 8. Referências

- `src/app/(parceiro)/parceiro/GpsCheckin.tsx` — padrão de leitura pontual de geolocalização já em produção
- `src/lib/maps.ts` — client Google Distance Matrix já integrado
- `src/app/api/asaas/webhook/route.ts` — ponto de extensão para US03
- `supabase/migrations/0079_logistica_afiliado_produto.sql` — cálculo de percurso já existente
- `supabase/migrations/0040_parceiro_logistico_rpcs.sql` — `calcular_frete`, ponto de extensão para US04
- `docs/prds/022-painel-corridas-parceiro-campo.md` — decisão já tomada de aproximação por CEP sem geocoding
- `docs/prds/025-repasse-automatico-afiliado-parceiro-logistico.md` — repasse do valor que este PRD ajusta

## 9. Registro de Decisões

- **2026-08-20:** Nenhuma leitura de posição é contínua — decisão herdada
  da constatação de que a plataforma é web, não PWA/app nativo, e
  rastreamento em segundo plano não é viável sem essa infraestrutura.
- **2026-08-20:** Ajuste de preço por distância reaproveita a chamada ao
  Google Distance Matrix já paga no despacho automático, em vez de
  adicionar uma chamada nova só para precificação — motivo: custo de API
  e simplicidade, o dado já existe no momento certo do fluxo.
- **2026-08-20:** PRD criado a partir de sessão de brainstorming técnico
  (não validado ainda com o dono do produto) — os dois riscos marcados
  como "precisa validação explícita" (quem absorve o custo do excedente de
  km, e o nível de confiança na distância informada pelo client na corrida
  avulsa) bloqueiam a saída de `rascunho`.

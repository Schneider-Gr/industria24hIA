# PRD — Percursos em Lote para Parceiro Logístico (inspirado no Mercado Envios Extra)

> Rascunho gerado por engenharia reversa de fonte pública (Mercado Envios Extra,
> `envios.mercadolivre.com.br/envios-extra`, extraído em 2026-07-17) cruzado com
> os PRDs internos já existentes: `docs/bpmn/PRD-parceiro-logistico.md`,
> `docs/bpmn/PRD-corridas-despacho.md`, `docs/prd/afiliado-logistica.md`,
> `docs/prd/roteirizacao-automatica.md`. Status: **DRAFT**. Trechos marcados
> **[PENDENTE DECISÃO DO DONO]** não devem virar código/schema sem confirmação
> explícita (ver `CLAUDE.md`, regra "nunca invente schema").

## 0. Proveniência dos dados desta PRD

| Afirmação | Fonte | Confiança |
|---|---|---|
| ML agrupa múltiplos pacotes por "percurso" atribuído a um horário/turno | extração real, página pública `envios-extra`, 2026-07-17 | Alta |
| Motorista vê a tarifa do percurso antes de aceitar | idem | Alta |
| Coleta em ponto único antes de iniciar o percurso | idem | Alta |
| Pagamento semanal (serviços seg-dom, liquidados qua-sex) via Mercado Pago | idem | Alta |
| Requisitos: veículo ≤15 anos, CNH, CNPJ+MEI (CNAEs 4930-2/01, 4930-2/02, 5320-2/01, 5320-2/02, 5229-0/99), mochila/baú ≥80L p/ moto, Android ≥5.0 | idem, seção "requisitos" + FAQ | Alta |
| Habilitação por praça é "por demanda de percursos" — página de ajuda lista **centenas de micro-zonas/hubs** (ex.: "Curitiba - P12", "São Paulo - R14"), não cidades inteiras | extração real, página de ajuda "cidades" | Alta |
| Nomes de campo propostos neste documento (`percurso`, `ponto_coleta_id` etc.) | proposta desta sessão | **Nenhuma** — não existem em `docs/database.md` nem nos PRDs atuais; tratar como hipótese |
| Telas do app do motorista, algoritmo interno de matching/roteirização, precificação exata por percurso | não observado | N/A — fora do alcance de uma página institucional pública, sem conta de motorista |

## 1. Problema

Duas dores já registradas no roadmap/backlog do Industria24, ainda sem solução:

1. `docs/feature-map.md` marca "Logística plena" (transportadoras, rotas, CSV, painel entregador) como 🟡 mínimo/status manual; `docs/roadmap.md` lista o mesmo marco como não iniciado.
2. O modelo atual de corrida (`PRD-corridas-despacho.md`) é **1 corrida = 1 entrega ponto-a-ponto**. Isso não escala: um parceiro logístico só executa uma entrega por vez — economicamente pior que o modelo que o próprio Mercado Livre usa para resolver o mesmo problema (rede de entregadores avulsos, sem frota própria).

O Mercado Envios Extra é a versão do ML desse problema: motoristas avulsos (CNPJ/MEI, veículo próprio) retiram um **lote** de pacotes num ponto de coleta e cumprem um **percurso** (múltiplas entregas numa janela de horário), recebendo semanalmente. Adaptar esse modelo ao Industria24 significa evoluir `parceiro_logistico` + `corrida` de "1 parceiro : 1 entrega" para "1 parceiro : 1 percurso : N entregas".

## 2. Fora de escopo (explícito)

- App mobile nativo para o parceiro — v1 continua web/PWA em `/parceiro`, como já é hoje.
- Roteirização ótima das paradas dentro do percurso — v1 usa ordem simples (sequencial/por proximidade ingênua); otimização real é evolução de `docs/prd/roteirizacao-automatica.md`, não desta PRD.
- Frota própria da Industria24h ou contrato fixo com transportadora (mantém o modelo "sem custo fixo antecipado" já decidido em `afiliado-logistica.md`).
- Score/gamificação de parceiro (já fora de escopo em `PRD-parceiro-logistico.md`).
- Seguro de carga (já fora de escopo em `afiliado-logistica.md`).
- Rastreio GPS contínuo do trajeto — v1 usa check-in por parada (componente `GpsCheckin.tsx` já existe), não trajeto contínuo.
- Replicar o gate de CNPJ/MEI+CNAE específico do ML como **regra bloqueante obrigatória** — pode ser útil para enquadramento fiscal do repasse, mas exige validação jurídica antes de virar bloqueio de cadastro (ver seção 7).

## 3. Jornada do usuário

### 3a. Parceiro logístico (motorista) — hoje vs. proposto

Hoje (`PRD-parceiro-logistico.md`): parceiro abre `/parceiro`, fica online, vê **corridas individuais** disponíveis, aceita uma de cada vez.

Proposto:

1. Parceiro define disponibilidade por **turno/janela de horário**, não só um toggle binário online/offline — espelha "escolha em quais dias e horários fazer entregas" do ML.
2. Sistema agrupa corridas pendentes compatíveis em região/janela num **percurso candidato**, calcula o `valor_frete_total` agregado e exibe a tarifa do percurso inteiro **antes** do parceiro aceitar.
3. Parceiro aceita o percurso inteiro (não corrida a corrida).
4. Parceiro retira todos os pacotes do percurso num **ponto de coleta único** (reaproveita o conceito `Centrodedistribuicao`/"centros" já usado no painel seller) — check-in de retirada.
5. Parceiro executa as paradas em sequência, com check-in/check-out por parada (reaproveita `GpsCheckin.tsx`).
6. Ao concluir a última parada, o percurso muda para `concluido` → cada corrida do lote é liquidada individualmente (mesma máquina de estados de `PRD-corridas-despacho.md`, aplicada por item do percurso — para uma entrega problemática não travar o repasse das demais já feitas).
7. Repasse: ver decisão pendente em 3b antes de escolher entre "por evento" (modelo atual) ou lote semanal (modelo ML).

### 3b. Decisão de produto embutida na jornada — pendente confirmação

**[PENDENTE DECISÃO DO DONO]** Frequência de repasse ao parceiro: manter repasse por evento/entrega (como já está em `PRD-corridas-despacho.md`, item 4) ou migrar para lote semanal via PIX (como o ML faz via Mercado Pago, numa janela fixa qua-sex)? Repasse mais frequente retém melhor o parceiro; lote semanal reduz custo operacional de transferências. Decisão financeira, não deve ser assumida aqui.

### 3c. Comprador / seller

Sem mudança de jornada visível — o comprador continua acompanhando o status da corrida (já previsto em `roteirizacao-automatica.md`: "painel do comprador mostra status da entrega"). A diferença é interna: a corrida passa a pertencer a um percurso.

## 4. Dados

**Já propostos em PRDs existentes — reaproveitar, não recriar:**

- `corrida`: `pedido_id`, `afiliado_logistica_id`, `parceiro_logistico_id`, `valor_frete_base`, `comissao_afiliado_pct`, `valor_repasse_parceiro`, `status`, timestamps (`PRD-corridas-despacho.md`).
- `parceiro_logistico`: dados pessoais/empresa, CPF/CNPJ, CNH, placa/veículo, tipo de veículo, dados PIX, região de atuação, `afiliado_logistica_id` opcional, status (`PRD-parceiro-logistico.md`).
- `Centrodedistribuicao` — Data Type já confirmado no Bubble legado (`docs/database.md`, linha 61); candidato natural a "ponto de coleta" do percurso.

**Novos, propostos nesta sessão — nenhum confirmado em `docs/database.md`; tratar como hipótese até o dono validar:**

- `percurso`: `id`, `parceiro_logistico_id`, `ponto_coleta_id` (→ `Centrodedistribuicao`), `janela_horario`, `status` (`aberto` → `em_execucao` → `concluido` → `cancelado`), `valor_frete_total`, `criado_em`.
- `corrida.percurso_id` — FK nullable adicionada à `corrida` já proposta (corrida sem percurso continua válida — o modelo 1:1 atual vira caso especial de percurso com 1 item, sem regressão).
- `percurso.ordem_paradas` — sequência simples das corridas dentro do percurso (v1 sem otimização).

**Campo do legado sem detalhamento — checar no editor Bubble antes de decidir:**

- `Rota_transportadora` (`docs/database.md`, linha 43) — nome sugere que já é "rota/percurso" no sistema antigo, mas `database.md` só lista nome+categoria, sem campos. **Não presumir** que bate com a proposta acima — confirmar no editor Bubble antes de nomear a tabela nova `percurso` ou de reaproveitar `Rota_transportadora` diretamente.

## 5. Edge cases

- Parceiro aceita o percurso mas não completa a retirada no ponto de coleta dentro do prazo → percurso é desfeito e as corridas voltam para `buscando_parceiro` individualmente (reaproveita o fluxo de recusa/timeout já descrito em `PRD-corridas-despacho.md`).
- Uma corrida do percurso é cancelada pelo comprador depois que o percurso já foi aceito, mas antes da parada correspondente → remove só aquela corrida do lote, sem afetar as demais.
- Percurso com corridas de afiliados de logística diferentes — permitir mistura (mais eficiente) ou manter percurso vinculado a um único `afiliado_logistica_id` (mais simples de comissionar)? **[PENDENTE DECISÃO DO DONO]** — afeta diretamente a fórmula de `PRD-checkout-calculo-frete.md`.
- Parceiro sem vínculo com afiliado (pool geral) — percurso agrega só corridas do pool geral, sem comissão de afiliado (já previsto em `PRD-checkout-calculo-frete.md`).
- Parada do meio do percurso falha (endereço não localizado, comprador ausente) — vai para sub-status de exceção sem travar a liquidação das paradas já entregues.
- Micro-região com pouca demanda — replicar o padrão do ML de "habilitar por demanda" (não abrir cadastro de parceiro numa região sem volume mínimo de corridas/semana); critério objetivo de "volume mínimo" ainda não definido.

## 6. Critério de aceite

- Parceiro vê, antes de aceitar, o valor total do percurso e a lista de paradas (endereço aproximado + janela).
- Aceitar um percurso muda o status de todas as corridas do lote numa única transação.
- Completar a última parada libera individualmente cada corrida entregue para o pipeline de repasse existente, sem travar por corridas pendentes de outro percurso.
- Sistema rastreia `aberto` → `em_execucao` → `concluido` do percurso, agregando a métrica "tempo `criada`→`aceita`" já usada em `PRD-corridas-despacho.md`.
- Corrida avulsa sem percurso continua funcionando sem regressão (checkout que hoje gera 1 corrida isolada não quebra).

## 7. Riscos / dependências

- **Herdado de `PRD-checkout-calculo-frete.md`:** o mapeamento região↔afiliado logístico ainda não está definido pelo dono do produto — bloqueia tanto o cálculo de frete quanto a formação de percursos por região.
- **Frequência de repasse (semanal vs. por evento)** — decisão financeira pendente, ver 3b.
- **Enquadramento fiscal do parceiro (MEI/CNAE específico)** — o ML exige CNPJ+MEI com CNAE de transporte como gate de cadastro; replicar isso tem implicação jurídica/tributária e deve passar por validação jurídica/contábil antes de virar regra de bloqueio.
- **Depende de `docs/prd/roteirizacao-automatica.md`** para a ordenação de paradas evoluir além de "ordem ingênua" — hoje essa PRD também está em DRAFT e exclui otimização multi-parada; as duas PRDs juntas descrevem a mesma lacuna em duas fases (v1: agrupamento simples; v2: roteirização real).
- **Depende de `docs/prd/afiliado-logistica.md`** para a regra de comissão por afiliado, hoje "fixo por afiliado, v1", sem variação por percurso/distância.
- **`Rota_transportadora` (Bubble legado)** — confirmar no editor Bubble se já existe alguma noção de agrupamento de entregas antes de desenhar `percurso` do zero; risco de recriar algo que já existe com outro nome.

## Anexo A — O que foi observado no Mercado Envios Extra (fonte real, 2026-07-17)

Resumo do que a página pública mostra (o app do motorista em si não foi acessado):

- Produto: rede de entregadores avulsos (não empregados, sem frota própria) que ganham dinheiro entregando pacotes de compradores do Mercado Livre.
- Fluxo do motorista: baixar app → configurar disponibilidade (dias/horários) → receber ofertas de percurso com tarifa e duração estimadas visíveis antes de aceitar → coletar todos os pacotes num ponto de coleta → seguir o percurso sugerido no app → receber semanalmente (serviços de segunda a domingo, pagos entre a quarta e a sexta seguinte) na conta Mercado Pago.
- Ganho anunciado: "até R$ 240 por dia" (comunicação de marketing, não é garantia contratual).
- Requisitos de cadastro: veículo (moto ou carro) de até 15 anos; mochila/baú ≥80L se for moto; CNH vigente; CNPJ; MEI com CNAE específico de entrega (4930-2/01, 4930-2/02, 5320-2/01, 5320-2/02 ou 5229-0/99); celular Android 5.0+.
- Cobertura: centenas de micro-regiões/pontos de coleta — habilitação de cadastro depende da demanda de percursos especificamente naquela micro-região, não da cidade como um todo.
- Não observado (fora do alcance de uma página institucional pública): telas do app do motorista, algoritmo interno de matching/roteirização, forma exata de precificação por percurso.

---

**Próximo passo sugerido:** revisar as duas decisões marcadas **[PENDENTE DECISÃO DO DONO]** (frequência de repasse; mistura de afiliados dentro de um percurso) antes de qualquer implementação, e confirmar `Rota_transportadora` no editor Bubble antes de nomear a tabela nova.

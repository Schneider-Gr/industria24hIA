# Escopo — Módulo de roteirização e geolocalização (`src/lib/geo`)

> Escrito em 28/07/2026. Complementa `docs/prd/roteirizacao-automatica.md` (MPDD-22)
> e `docs/prd/consolidacao-carga-rota.md` (MPDD-46, migration 0074).
> Este documento é escopo de execução, não spec de produto: o PRD manda no "o quê".

## Problema

`src/lib/maps.ts` é raso e está na API errada. Três defeitos concretos, todos no
caminho do dinheiro:

1. Usa a **Distance Matrix API**, Legacy desde 01/03/2025.
2. Devolve `null` para "sem `GOOGLE_MAPS_API_KEY`" e para "sem rota" igualmente.
   O caller não consegue distinguir, então não dá para cumprir a regra do
   `CLAUDE.md` de mostrar "integração pendente" em vez de número plausível.
3. **Lança** em erro HTTP. O webhook do Asaas se protege com `.catch(() => null)`;
   qualquer caller novo que esqueça isso derruba o fluxo de pagamento.

Some-se a isso: nem `corridas` nem `rotas` têm lat/lng, então não existe base para
roteirização de verdade; e não há nenhum lugar onde caiba um teto de gasto com a API.

## Entrega

Um módulo `src/lib/geo` com interface única (`Lugar`, `Resultado<T>`, `Geo`), que
aceita os quatro formatos de entrada dos callers reais (endereço completo, só CEP,
CEP + endereço, coordenada GPS) e esconde provedor, cache, geocodificação e teto
de custo. O desenho completo da interface está na thread de design; este documento
lista fases, arquivos e critérios de aceite.

## Fases

### Fase 1 — Módulo e paridade (bloqueia todas as outras)

- `src/lib/geo/index.ts`: tipos `Lugar`, `Modal`, `Trajeto`, `Coordenada`, `Falha`,
  `Resultado<T>`, interface `Geo`, fábrica `geo()`. `import "server-only"` no topo.
- `src/lib/geo/routes.ts`: `RoutesAdapter` (Google Routes API, padrão).
- `src/lib/geo/distance-matrix.ts`: adapter legado, porte do código atual. Existe só
  para a virada ser reversível por variável de ambiente; some na fase 5.
- `src/lib/geo/indisponivel.ts`: sem chave, responde `{erro:"nao_configurado"}` em
  tudo menos `link()`. É o que impede número plausível na UI.
- Migrar os dois callers atuais: `src/app/api/asaas/webhook/route.ts` (remover o
  `.catch(() => null)`) e `src/app/(seller)/seller/rotas/actions.ts`.
- Deletar `src/lib/maps.ts`.
- Env nova: `GEO_PROVEDOR=routes|distance-matrix` (default `routes`).
  `GOOGLE_MAPS_API_KEY` continua a mesma chave, server-only, nunca no cliente.

Aceite: com a chave configurada, a corrida do webhook grava `distancia_m` e
`duracao_s`; sem a chave, grava `null` nos dois e o `link_mapa` mesmo assim, e
nenhuma tela exibe distância.

### Fase 2 — Persistência: cache, geocodificação e teto de custo

- Migration nova (checar colisão de prefixo antes de criar **e antes do push**,
  regra 9 do `CLAUDE.md`): `geo_lugares` (chave canônica, lat, lng, precisão,
  provedor, atualizado_em), `geo_trajetos` (origem_hash, destino_hash, modal,
  distância, duração, expira_em), `geo_consumo` (data, provedor, chamadas,
  custo_estimado). RLS ligada, sem policy: é tabela de serviço, acesso só por
  `service_role`.
- TTL: 30 dias para par CEP a CEP, 1 dia quando há horário de partida.
- Env nova: `GEO_TETO_DIARIO_BRL`. Estourado, devolve `{erro:"teto_de_custo"}`
  antes de chamar a rede; o cache continua servindo.

Aceite: segunda chamada do mesmo par não incrementa o contador de chamadas do
provedor; `geo_lugares` tem lat/lng dos CEPs das corridas depois do primeiro
cálculo; teto zerado bloqueia sem gastar.

### Fase 3 — Multi-parada na consolidação de carga

- `matriz()` e `otimizar()` no módulo (nearest-neighbor com 2-opt sobre a matriz,
  local, sem chamada extra de API).
- Tela do admin que monta o lote (0074) passa a sugerir a ordem das entregas e a
  duração total, que hoje é decidida no olho.

Aceite: lote com 5 pedidos no mesmo corredor devolve permutação válida das 5
paradas e duração total, gastando **uma** chamada de provedor.

### Fase 4 — Modal e feed do parceiro

- `Modal` (`moto`, `van`, `caminhao`) mapeado a partir de `parceiros_logisticos.tipo`
  e capacidade.
- Feed do parceiro ordenado pela distância do GPS dele até as corridas abertas,
  via `matriz()` de 1 origem para N destinos.

Aceite: dois parceiros com `tipo` diferente na mesma corrida recebem duração
diferente; feed ordenado por proximidade real, não por data.

### Fase 5 — Limpeza

Remover `distance-matrix.ts` e a env `GEO_PROVEDOR` depois de 30 dias de Routes API
em produção sem incidente.

## Fora de escopo

Modal fluvial (não há provedor de rota fluvial para o Amazonas; entra quando houver
adapter, o enum não reserva o nome antes disso). Rastreio GPS contínuo do entregador.
Janela de tempo por parada (VRPTW). Provedor alternativo ao Google (Mapbox, HERE):
o seam de adapter torna isso barato depois, mas não se constrói adapter sem
necessidade.

## Riscos

**Custo.** Routes API cobra por elemento; `otimizar()` com N paradas custa N².
Mitigado pelo teto e pelo cache, mas o teto precisa ser configurado antes de a
fase 3 ir a produção, senão um lote grande queima cota.

**Qualidade de endereço.** `corridas.destino_endereco` é montado por `concat_ws`
na 0043 e no lote consolidado vira uma string com todas as entregas separadas por
` | `. Essa string **não geocodifica**. A fase 3 precisa ler as paradas de
`lote_pedidos` e `linha_itens`, não do campo `destino_endereco` da corrida.

**Migration.** O repo já colidiu prefixo três vezes. Rodar a checagem do CI
(`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d`) na criação e de
novo antes do PR.

## Dependências

Chave `GOOGLE_MAPS_API_KEY` com a **Routes API** habilitada no projeto Google (a
chave atual pode estar habilitada só para Distance Matrix; confirmar antes da fase 1).
Nada mais bloqueia.

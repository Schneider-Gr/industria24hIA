# PRD 026 — Vitrine por raio de entrega (geolocalização do produto)

Status: rascunho (brainstorm, 2026-09-04). Não implementado.

## 1. Problema

Hoje a vitrine filtra por **faixa de CEP por loja** (`faixas_cep`, migrations 0043/0044).
O seller precisa cadastrar intervalos numéricos de CEP; a cobertura é binária e não
expressa "entrego em até 50 km". O pedido é: filtrar produtos por **raio**, tendo como
origem o endereço do produto e como destino o CEP informado pelo comprador.

## 2. Estado real do banco (verificado em prod `tiwdqgyeyvceaiqqwitc`, 04/09/2026)

| Fato | Valor | Consequência |
|---|---|---|
| `produtos.cep_produto` | existe; 73 de 206 preenchidos (35%) | origem por produto já modelada, mas 65% ficariam fora do filtro |
| `lojas.cep` | 7 de 19 preenchidos | fallback de origem também incompleto |
| `lojas.cidade` / `estado` | texto livre e sujo (`Manaus/AM` vs `Manaus/Amazonas`, `" RIO BRANCO\n"/Acre`) | **filtro por cidade textual é inviável** |
| `faixas_cep` ativas | 39 | regra atual em produção, não pode ser desligada sem substituto |
| PostGIS / earthdistance / cube | **nenhuma instalada** | distância tem que ser SQL puro (haversine) ou instalar extensão |
| lat/lng em qualquer tabela | não existem | é preciso derivar coordenadas de algum lugar |

Conclusão: o bloqueio não é o cálculo de distância, é **origem de coordenadas e
qualidade de cadastro**. Ligar o filtro hoje esconderia a maior parte do catálogo.

## 3. Benchmark (Leroy Merlin) e o que se aplica

O padrão deles — CEP → resolver município/UF → definir loja/região → cachear no
cliente — já está implementado aqui em `src/lib/cep.ts` (`buscarEndereco` chama ViaCEP,
resultado gravado no cookie `cep_comprador`, lido pelo server component).
O que falta é o passo seguinte: **converter CEP em coordenada** para medir distância.
ViaCEP não retorna lat/lng.

## 4. Decisão (04/09): Google Geocoding, com cache obrigatório

O projeto **já tem** `GOOGLE_MAPS_API_KEY` no Vercel (Production, desde 13/07) e
**já tem** `src/lib/geo.ts` — Routes API server-only, com teto de chamadas diário
(`GEO_MAX_CHAMADAS_DIA`), erro tipado em vez de exceção e a chave nunca saindo do
servidor. Usado hoje pelo webhook do Asaas e pelas rotas do seller. Isso reescreve
a decisão anterior: cai o centróide de município do IBGE, cai `municipios_geo`.

- **Geocoding, não Routes, para o filtro.** `geocodificarCep(cep)` novo em
  `src/lib/geo.ts`, chamando a Geocoding API com `components=postal_code:<cep>|country:BR`.
  Devolve lat/lng do CEP, não do município: resolve raio intramunicipal, que era a
  limitação do desenho anterior.
- **Cache é requisito, não otimização.** A vitrine compara o CEP do comprador com
  o CEP de dezenas de produtos por render. Chamar o Google nesse laço é inviável em
  custo e em latência. Tabela `ceps_geo` guarda a coordenada por CEP; o Google só é
  chamado no cache miss — na prática 1 vez por CEP novo, para sempre.
- **Distância é haversine em TS, sobre coordenadas cacheadas.** Zero chamada externa
  no caminho quente, zero PostGIS. O Google entra só na fronteira CEP → coordenada.
- **Distância rodoviária fica fora do filtro.** `calcularTrajeto` (Routes) já existe e
  é preciso, mas é uma chamada por par origem/destino. Cabe na página do produto
  ("~38 km de você por estrada"), nunca na listagem. O raio filtra por linha reta.
- **Falha do provedor não esconde produto.** Se o Geocoding falhar ou o teto diário
  estourar, o CEP fica sem coordenada e a regra de raio não se aplica àquele produto —
  ele continua visível. Degradação para o lado permissivo, igual ao resto do arquivo.

Pendência de infraestrutura: a chave está **só em Production**. Precisa existir em
Preview e Development, senão o QA da fase 3 testa com o filtro sempre inativo e não
valida nada. Restringir a chave por API (Geocoding + Routes) e por referer/IP no
console do Google antes de aumentar o volume.

Alternativas descartadas: centróide de município do IBGE (erro de 5-15 km, não serve
para raio dentro de Manaus, e a chave do Google já está paga); PostGIS (peso
desproporcional para uma coluna de distância); Routes API no filtro (N chamadas por
render); manter só faixas de CEP (não expressa raio, é o que se quer substituir).

## 5. Modelo de dados

```
alter table produtos add column raio_entrega_km int null;   -- null = sem limite de raio
create table ceps_geo (
  cep text primary key,           -- 8 dígitos, sem máscara
  lat float8 not null,
  lon float8 not null,
  cidade text, uf text,
  fonte text not null default 'google',
  atualizado_em timestamptz not null default now()
);
-- leitura pública (anon select); escrita só service_role, porque gravar aqui custa
-- chamada paga de API.
```

Decidido (04/09): o raio é atributo **do produto**, não da loja. Nada de coluna em
`lojas` nem de herança em runtime — um produto de 800 kg e um de 2 kg da mesma loja
têm alcance de entrega diferente, e é isso que se quer expressar.

Origem geográfica do produto, em ordem: `produtos.cep_produto` → `lojas.cep`
(só a origem é herdada, porque é endereço físico e não regra comercial). Sem nenhum
dos dois, o produto **não é filtrado por raio** (fica visível) e entra em relatório
de pendência de cadastro.

## 6. Regra de exibição

Um produto aparece na vitrine quando **todas** valem:
1. passa nas regras atuais (`status_produto = 'Aprovado'`, `valor > 0`, etc.);
2. a loja cobre o CEP do comprador por `faixas_cep` (regra atual, mantida);
3. `distancia_km(origem_produto, cep_comprador) <= produtos.raio_entrega_km`.

Sem CEP do comprador no cookie: nada é filtrado (comportamento atual).
`raio_entrega_km` nulo, ou origem sem coordenada: regra 3 não se aplica.
Regras 2 e 3 são **cumulativas** — faixa de CEP continua sendo a palavra final sobre
o que o seller aceita entregar; o raio é um segundo funil, mais expressivo de cadastrar.

Página de produto por link direto (`/produto/[id]`): mantém visível e desabilita a
compra, igual ao que já é feito para faixa de CEP fora de cobertura.

## 7. Onde muda no código

- `src/lib/geo.ts` — adicionar `geocodificarCep(cep)` (Geocoding API, mesmo padrão
  server-only + teto + `Resultado` tipado de `calcularTrajeto`) e `distanciaKm(a, b)`
  haversine puro. `distanciaKm` é função pura: teste unitário direto.
- `src/lib/ceps-geo.ts` (novo) — `coordenadaDoCep(cep)`: lê `ceps_geo`, e no miss
  chama `geocodificarCep` e grava. É o único lugar que fala com o Google no fluxo.
- `src/lib/catalogo-compra/vitrine-home.ts:148` — junto do fetch de `faixas_cep`,
  buscar centróides e aplicar o segundo filtro (mesmo ponto onde `lojaCobreCep` roda).
- `src/app/busca|categoria/[id]|loja/[id]|produto/[id]` — mesma composição de filtro.
- `src/components/vitrine/CepBar.tsx` — sem mudança funcional; passa a gravar `ibge` no cookie.
- Cadastro do produto (seller) — campo "raio de entrega (km)", opcional, vazio = sem limite.
  Junto dele, uma ação "aplicar este raio a todos os produtos da loja", que faz um
  `update` em massa. É o que evita 206 edições manuais sem precisar de coluna na loja.
- Checkout (`checkout_criar_pedido`) — **não muda nesta fase**. A validação dura
  continua sendo faixa de CEP. Raio é filtro de vitrine.

## 8. Pré-requisito bloqueante

O filtro fica atrás de flag (`NEXT_PUBLIC_FILTRO_RAIO=1`, desligada) até:
- `lojas.cep` preenchido em 19/19 lojas ativas e validado contra ViaCEP;
- `cep_produto` preenchido, ou herança de loja aceita explicitamente pelo dono;
- `municipios_geo` carregada e `ceps_cache` populado para os CEPs já usados.

Ligar antes disso derruba o catálogo visível. Isto é o item de maior risco do PRD.

## 9. Fases

1. **Dados**: `ceps_geo` + `geocodificarCep` + `coordenadaDoCep` + haversine, com
   teste unitário de distância (Av. Paulista ↔ Praça da Sé ≈ 2,7 km) e teste de que
   cache hit não chama o Google. Backfill das coordenadas dos CEPs já cadastrados.
   Nada visível ao usuário.
2. **Cadastro**: `raio_entrega_km` em `produtos`, campo no formulário do seller +
   ação de aplicar em massa, backfill de `lojas.cep`. Ainda sem filtrar.
3. **Filtro**: aplicar nas 5 superfícies de listagem atrás da flag; QA comparando
   contagem de produtos visíveis com e sem flag antes de ligar em prod.
4. (Opcional, depois) distância rodoviária via `calcularTrajeto` na página do produto.

## 10. Perguntas abertas

- Raio substitui ou soma com `faixas_cep`? A proposta é somar. Substituir significaria
  migrar as 39 faixas ativas e mudar `checkout_criar_pedido` — escopo bem maior.
- Distância deve ser rodoviária ou em linha reta? O filtro é linha reta (cacheável).
  Exibir a rodoviária na página do produto, via `calcularTrajeto`, é opcional — decidir
  na fase 3, considerando que é uma chamada paga por visita.
- Quem paga o backfill inicial? ~200 CEPs distintos de produtos e lojas, chamada única
  por CEP. Custo irrelevante, mas confirmar que a conta do Google tem billing ativo
  para Geocoding (hoje só Routes é usada).

# PRD — Integração de Transportadoras: OAuth, Rastreio Padronizado e CT-e (inspirado no Mercado Envios Developers + Central de Partners)

> Rascunho gerado por engenharia reversa de duas fontes públicas, extraídas em
> 2026-07-17: `developers.mercadoenvios.com` (documentação técnica de
> integração de transportadoras ao Mercado Envios) e
> `centrodepartners.mercadolivre.com.br` (marketplace de soluções/parceiros
> certificados do Mercado Livre). Cruzado com
> `docs/prd/percursos-entrega-lote-mercado-envios-extra.md` (mesma sessão,
> 2026-07-17), `docs/integrations.md`, `docs/api-connector.md`,
> `docs/bpmn/PRD-corridas-despacho.md` e `docs/compliance.md`. Status:
> **DRAFT**. Trechos marcados **[PENDENTE DECISÃO DO DONO]** não devem virar
> código/schema sem confirmação explícita (ver `CLAUDE.md`, regra "nunca
> invente schema").

## 0. Proveniência dos dados desta PRD

| Afirmação | Fonte | Confiança |
|---|---|---|
| Autenticação de transportadora é OAuth2 `client_credentials`, com token por 6h e um `audience` (escopo) por tipo de recurso: `authorizations`, `tracking-pull`, `agencies`, `booking`, `logistic-feed`, `handling-unit`, `rtt`, `fiscal-info`, `revoke`, `coverage` | extração real, `developers.mercadoenvios.com`, páginas "Access control - OAuth" e "Carrier OAuth Token", 2026-07-17 | Alta (doc técnica pública, exemplos de request/response reais) |
| Existe endpoint de **revogação** de token (`/oauth/revoke`), separado da emissão — o token que autentica a revogação nunca pode ser o token revogado | idem | Alta |
| Rastreio usa **códigos de evento internos padronizados** (`code`) desacoplados do **código interno da transportadora** (`carrier_code`), ligados por uma tabela de mapeamento mantida por um time central | idem, página "Tracking Notifications" | Alta |
| Suporta dois modos de notificação: **push** (transportadora envia ao endpoint do marketplace) e **pull** (marketplace consulta a transportadora) — mesmo payload nos dois casos | idem | Alta |
| Payload de evento de rastreio inclui: geolocalização com `geolocation_type` (precisão: `APPROXIMATE`/`GEOMETRIC_CENTER`/`RANGE_INTERPOLATED`/`ROOFTOP`/`UNKNOWN`), comprovante de entrega (tipo/número de documento do recebedor, nome, relação com o comprador, foto/assinatura em Base64), dados de motorista/veículo (id, nome, telefone, placa) | idem | Alta |
| Regra de estado final: uma vez recebida notificação de status final, eventos posteriores são descartados | idem | Alta |
| Retentativa: erro 4XX não deve ser reenviado; erro 5XX deve ser reenviado com backoff, no mínimo 3 tentativas | idem | Alta |
| Existe endpoint somente-leitura de "timeline" (histórico consolidado por remessa), pensado originalmente para atender autoridade aduaneira, mas genérico o suficiente para auditoria interna | idem, página "Tracking Timeline" | Alta |
| Transportadoras no Brasil emitem/consultam **CT-e (Conhecimento de Transporte eletrônico)** por remessa, com schema fiscal completo (CFOP, ICMS — base, alíquota, valor —, peso/valor de carga, chave da NF-e vinculada), retornado como XML no padrão SEFAZ | idem, seção "Brazil Fiscal Data" | Alta (exemplo de XML real de homologação exibido na doc) |
| Central de Partners é um diretório/marketplace de soluções de terceiros (ERP, gestão de e-commerce, meios de pagamento, atendimento) organizado por categoria e por selo de certificação (Silver/Gold/Platinum), com programas formais de certificação (Certified Partner Program, Developer Partner Program) | extração real, `centrodepartners.mercadolivre.com.br`, 2026-07-17 | Alta |
| Nomes de campo/endpoint propostos neste documento para o Industria24 (`transportadora_credencial`, `evento_rastreio`, `cte_id` etc.) | proposta desta sessão | **Nenhuma** — não existem em `docs/database.md`; tratar como hipótese |
| Detalhe interno de como o algoritmo de matching/roteirização do ML funciona, ou como o CT-e é efetivamente emitido internamente (quem é o emissor fiscal) | não observado | N/A — fora do alcance de documentação pública voltada a transportadoras parceiras |

## 1. Problema

Três lacunas reais, nenhuma delas coberta hoje pelos PRDs existentes:

1. **Não existe um contrato de integração formal para transportadoras/parceiros externos.** `docs/integrations.md` confirma que a plataforma já lida com serviços externos (Bling, Asaas, mapas), mas via "API Connector genérico" ad hoc — sem um padrão próprio de autenticação, versionamento de eventos ou contrato de payload para quem quiser integrar como transportadora.
2. **Rastreio de entrega não tem um vocabulário de eventos próprio.** `PRD-corridas-despacho.md` define estados de negócio (`criada`, `em_transporte`, `entregue`...), mas não define como um evento físico (retirada, tentativa de entrega falha, comprovante assinado) chega até essa máquina de estados nem como ele seria auditado depois.
3. **Frete de terceiros no Brasil tem uma obrigação fiscal (CT-e) que não aparece em nenhum documento do projeto.** `docs/compliance.md` já rastreia a lacuna de NF-e (nota fiscal de **produto**), mas nenhum documento cobre CT-e (nota fiscal de **transporte**) — ver Anexo A e a atualização proposta em `docs/compliance.md` (seção 6, adicionada nesta sessão).

## 2. Fora de escopo (explícito)

- Emitir CT-e por conta própria da Industria24h como transportadora — v1 assume que quem emite o CT-e é a transportadora/parceiro logístico contratado (pessoa jurídica de transporte), e a plataforma apenas **armazena a referência/URL do documento**, não gera o XML fiscal.
- Suporte a fluxos internacionais (Cross-Border Trade / CBT) — fora do escopo do marketplace B2B doméstico atual.
- CFDI/Carta Porte (México) — não aplicável, plataforma opera no Brasil.
- Central de Partners como um **marketplace público de apps de terceiros** (com SDK, revisão de apps de terceiros, loja de plugins) — a proposta aqui é um "diretório de integrações recomendadas" bem mais simples (ver Anexo B), não uma plataforma de desenvolvedores externos.
- Trocar o transporte "por evento" já decidido em `docs/prd/percursos-entrega-lote-mercado-envios-extra.md` (repasse semanal vs. por evento) — essa decisão pertence à outra PRD, não a esta.

## 3. Jornada do usuário

### 3a. Cadastro de transportadora/parceiro logístico como integração (não como pessoa física)

Hoje (`PRD-parceiro-logistico.md`) o cadastro é pensado para uma pessoa física/MEI dirigindo. Esta PRD propõe um **segundo tipo de vínculo**, para quando o executor é uma transportadora com sistema próprio (não vai usar o painel `/parceiro` manualmente, vai integrar via API):

1. Transportadora solicita credenciais de integração (`client_id`/`client_secret`) — equivalente ao fluxo "criar aplicação" do ML, mas simplificado (não precisamos de um portal de apps público na v1, pode ser um processo manual/admin gerando as credenciais).
2. Transportadora troca `client_id`+`client_secret` por um `access_token` de curta duração (proposta: token com escopo/`audience` — ex.: `tracking`, `label`, `fiscal-info` — replicando o modelo de audiências do ML) via `POST /oauth/token`.
3. Transportadora reporta eventos de rastreio de uma corrida via **push** (`POST /corridas/{id}/eventos`) usando um **código de evento padronizado da Industria24h**, nunca o código interno dela — a tradução `carrier_code` → `code` fica numa tabela de mapeamento mantida pela plataforma, não pela transportadora.
4. Alternativamente, a plataforma faz **pull**: consulta periodicamente um endpoint que a própria transportadora expõe, no mesmo payload do push (paridade de contrato nas duas direções).
5. Ao registrar o evento de "entregue", o payload carrega comprovante de entrega (documento do recebedor + assinatura/foto) e, quando aplicável, a referência ao CT-e emitido para aquele frete.
6. Endpoint somente-leitura `GET /corridas/{id}/timeline` expõe o histórico consolidado de eventos daquela corrida — usado tanto para auditoria interna quanto, futuramente, para o comprador acompanhar o status (reaproveita a necessidade já registrada em `roteirizacao-automatica.md`: "painel do comprador mostra status da entrega").

### 3b. Decisão de produto embutida na jornada — pendente confirmação

**[PENDENTE DECISÃO DO DONO]** Este segundo tipo de vínculo (transportadora-empresa integrando via API) é necessário agora, ou o volume atual do Industria24h só justifica o parceiro-pessoa-física do painel `/parceiro`? Construir OAuth2 completo com múltiplos escopos é esforço real de engenharia — vale a pena verificar se há alguma transportadora parceira concreta esperando essa integração antes de construir o contrato genérico.

### 3c. Central de Parceiros (Anexo B) — jornada do seller

Seller acessa uma nova aba "Integrações" no painel seller (`(seller)/seller/...`), vê uma lista de ferramentas parceiras (ex.: ERP Bling, já usado hoje via componente "Lançar pedidos bling") organizada por categoria, com indicação de nível de suporte/certificação, e configura credenciais próprias para cada uma — mesmo padrão do Central de Partners do ML, sem novo desenvolvimento de "app store".

## 4. Dados

**Já propostos em PRDs existentes — reaproveitar, não recriar:**

- `corrida`: `status`, timestamps (`PRD-corridas-despacho.md`) — os eventos de rastreio desta PRD alimentam as transições desse status, não o substituem.
- `parceiro_logistico`: já cobre o vínculo pessoa física (`PRD-parceiro-logistico.md`).

**Novos, propostos nesta sessão — nenhum confirmado em `docs/database.md`; tratar como hipótese até o dono validar:**

- `transportadora_credencial`: `id`, `parceiro_logistico_id` ou novo `transportadora_id` (**decisão pendente**: transportadora-empresa é um tipo novo de entidade ou uma variação de `parceiro_logistico`?), `client_id`, `client_secret_hash` (nunca em texto puro — CLAUDE.md regra 3), `escopos` (array: `tracking`, `label`, `fiscal-info`...), `criado_em`, `revogado_em` (nullable).
- `evento_rastreio_codigo`: tabela de mapeamento `codigo_interno` (padrão Industria24h) ↔ `codigo_transportadora` (por transportadora) — evita que o código de cada transportadora vaze para a máquina de estados de `corrida`.
- `evento_rastreio`: `id`, `corrida_id`, `codigo_interno`, `data_evento`, `geolocalizacao` (lat/long + `precisao` enum), `comprovante_entrega` (tipo/número documento, nome recebedor, imagem base64 ou URL), `motorista` (nome, telefone, placa — pode ser nulo se o parceiro já é pessoa física com esses dados em `parceiro_logistico`), `cte_referencia` (nullable — URL/chave do CT-e, quando a transportadora emite um).
- `cte_referencia` (campo, não tabela nova na v1): apenas armazena a chave de acesso e/ou URL do XML/PDF do CT-e emitido pela transportadora parceira — a Industria24h não gera o documento, só guarda a referência para fins de auditoria/compliance.

**Ponto de atenção herdado de `docs/integrations.md`:** já existe ambiguidade não resolvida sobre Bling/Asaas serem "coleções genéricas do API Connector" do Bubble sem endpoint documentado. Esta PRD **não** deve ser implementada assumindo que o padrão de integração atual (API Connector ad hoc) será simplesmente descartado — é uma decisão de arquitetura maior, fora do escopo de uma única PRD.

## 5. Edge cases

- Transportadora envia evento com `codigo_transportadora` sem mapeamento cadastrado → evento deve ser **rejeitado com erro claro (4XX)**, nunca silenciosamente ignorado — divergente do comportamento do ML (que descarta silenciosamente e conta com aviso manual por e-mail); para uma plataforma menor, um erro explícito no momento do envio é mais seguro do que uma fila de suporte para achar mapeamentos quebrados depois.
- Evento chega fora de ordem (ex.: "entregue" antes de "em trânsito") → replicar a regra de estado final do ML: uma vez recebido o evento de status final da corrida, eventos posteriores são ignorados (não revertem o status).
- Erro 5xx no envio do evento (push) → transportadora deve reenviar com backoff, mínimo de 3 tentativas — documentar isso no contrato de integração, não deixar implícito.
- Token comprometido → precisa existir endpoint de revogação (`/oauth/revoke`) desde o dia 1, não como "fase 2" — token vazado sem revogação é uma superfície de ataque real (já existe precedente de preocupação equivalente em `docs/compliance.md`, seção sobre token Bubble exposto).
- Transportadora não emite CT-e (ex.: parceiro logístico pessoa física/MEI, não uma transportadora formal) → `cte_referencia` fica nulo; **não travar a liquidação da corrida por falta de CT-e** — mas registrar a ausência para fins de auditoria futura (decisão jurídica sobre exigibilidade é separada, ver Anexo A).
- Comprovante de entrega (foto/assinatura) enviado em formato/tamanho inválido → validar antes de persistir; decidir limite de tamanho de imagem Base64 (não especificado na fonte).

## 6. Critério de aceite

- Uma transportadora consegue obter um `access_token` válido via `client_credentials` e ele expira em tempo definido (proposta: replicar as 6h do ML, ajustável).
- Um evento de rastreio enviado com `codigo_transportadora` sem mapeamento retorna erro explícito, não é descartado silenciosamente.
- O histórico de eventos de uma corrida é recuperável via endpoint somente-leitura, em ordem cronológica.
- Campo de referência ao CT-e existe no modelo de dados da corrida (mesmo que opcional/nulo na maioria dos casos hoje).
- Token pode ser revogado sob demanda, sem esperar expiração natural.

## 7. Riscos / dependências

- **Depende de decisão de arquitetura maior:** se a Industria24h vai manter integrações via "API Connector genérico" (padrão herdado do Bubble, documentado em `docs/integrations.md`) ou padronizar um contrato próprio tipo OAuth2 como este — não é uma decisão que uma PRD de feature deva tomar sozinha.
- **CT-e é ponto de atenção jurídico/fiscal, não só técnico** — a obrigatoriedade de CT-e depende de quem presta o serviço de transporte e do enquadramento tributário; encaminhar para contador/jurídico antes de tratar como bloqueio de produto (mesma cautela já aplicada a NF-e em `docs/compliance.md`, seção 4).
- **Depende de `docs/prd/percursos-entrega-lote-mercado-envios-extra.md`** — se percursos em lote forem implementados, os eventos de rastreio desta PRD devem ser reportados por parada dentro do percurso, não só por corrida isolada.
- **Volume ainda não justifica, possivelmente** — ver 3b, decisão pendente sobre se o escopo "transportadora-empresa via API" é prioritário agora ou especulativo.

## Anexo A — O que foi observado no Mercado Envios Developers (fonte real, 2026-07-17)

- Site de documentação técnica voltado a **transportadoras que querem integrar** com o Mercado Envios (não é documentação para sellers).
- Estrutura em 5 blocos: Setup & Security (OAuth), Shipment Management, Dispatch Operations (rastreio, etiquetas, monitoramento de incidentes), Cross-Border Trade (internacional), Brazil Fiscal Data (CT-e) e Mexico Fiscal Data (CFDI/Carta Porte).
- Autenticação: OAuth2 `client_credentials`, `client_id`/`client_secret` via header `Authorization: Basic`, corpo da requisição leva `audience` (o recurso específico sendo solicitado) — um único aplicativo pode ter múltiplos tokens, um por audiência, todos válidos por 6h. Existe endpoint de revogação dedicado.
- Rastreio: eventos push (transportadora → ML) ou pull (ML → transportadora), sempre no mesmo formato de payload; código de evento **interno e padronizado** (`code`) mapeado a partir do código específico de cada transportadora (`carrier_code`) — essa camada de tradução é mantida por um time central via processo manual (e-mail) de cadastro de novo mapeamento.
- Payload de evento é rico: geolocalização com nível de precisão explícito, comprovante de entrega estruturado (tipo de documento do recebedor, nome, relação com o comprador, imagem em Base64), dados de motorista e veículo, dimensões/peso do pacote, e — em fluxos internacionais — dados aduaneiros (número de declaração, custos, item restrito).
- Existe endpoint somente-leitura de histórico consolidado por remessa (`tracking/timeline`), pensado para atender fiscalização aduaneira em trânsito internacional, mas de uso genérico para auditoria.
- **Brazil Fiscal Data**: conjunto de endpoints para consultar/baixar CT-e (XML no padrão SEFAZ, com CFOP, ICMS — base/alíquota/valor —, peso e valor de carga, chave da NF-e vinculada) e para consultar dados fiscais de rotas/redespacho. Confirma que qualquer transportadora que opera formalmente no Brasil dentro da rede do Mercado Envios está sujeita a emissão de CT-e por remessa.
- Não observado: como o algoritmo de matching entre corrida/transportadora funciona internamente, e quem exatamente é o emissor fiscal em cada modalidade (a doc é do ponto de vista de quem consulta o documento já emitido, não de quem o emite).

## Anexo B — O que foi observado na Central de Partners (fonte real, 2026-07-17)

- É um **diretório/marketplace de soluções de terceiros** para quem vende no Mercado Livre — não é documentação técnica de API, é uma vitrine de produtos parceiros.
- Categorias: gestão de e-commerce, marketing e publicidade, automóveis, finanças e contabilidade, imóveis, pagamentos, "serviços com condições especiais", soluções especializadas (Mercado Livre e Mercado Pago).
- Sistema de certificação por selo (**Silver, Gold, Platinum**) — parceiros pagam/passam por processo de certificação para aparecer com selo mais alto e destaque.
- Exemplos de soluções listadas relevantes ao Industria24h: plataformas de ERP/gestão de estoque multicanal, emissão automatizada de NF-e, conciliação financeira (tarifas/comissões/impostos), atendimento omnichannel integrado.
- Existem **dois programas de certificação formais** separados: "Parceiros Certificados" (consultoria/assessoria a vendedores) e "Developer Partner Program" (integração técnica).
- **Proposta de adaptação (não fora de escopo desta vez, ver seção 3c):** não é necessário construir um "app store" completo — o valor real e replicável a baixo custo é ter uma página de **"Integrações recomendadas"** no painel seller, começando pelo que já existe (Bling, já citado em `docs/integrations.md`), sem processo de certificação formal na v1.

---

**Próximo passo sugerido:** confirmar com o dono se a decisão marcada em 3b (transportadora-empresa via API vs. só parceiro pessoa física) é prioridade agora, e encaminhar a pergunta sobre exigibilidade de CT-e para contador/jurídico — ver atualização correspondente em `docs/compliance.md`, seção 6.

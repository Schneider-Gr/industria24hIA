# API Connector & Configuração de API — Industria24h

> **Fonte: extração real do editor Bubble.** Substitui a versão anterior
> (que era rascunho inferido). Ver `integrations.md` para o detalhamento
> de cada serviço externo.

## Configuração da Data API do Bubble (confirmada)

| Item | Valor |
|---|---|
| Data API — URL dev | `https://industria24h.com.br/version-test/api/1.1/obj` |
| Data API — URL live | `https://industria24h.com.br/api/1.1/obj` |
| Workflow API — URL dev | `https://industria24h.com.br/version-test/api/1.1/wf` |
| Admin API Token | ⚠️ **Não armazenar em texto puro neste repositório.** Ver nota de segurança abaixo. |
| Domínio personalizado | `industria24h.com.br` |
| Plano Bubble | Growth (~US$134/mês) |

### ⚠️ Nota de segurança — Admin API Token

Um token de API admin foi obtido durante a extração e **não deve ser versionado em texto puro** neste repositório nem em nenhum outro arquivo do projeto. Recomendações:

1. Armazenar o token apenas em variável de ambiente (`.env`, não commitado) ou em um secrets manager (ex.: 1Password, Doppler, Supabase Vault)
2. Como o valor já circulou em texto puro num documento, **rotacionar o token no Bubble** (Settings → API) antes de considerá-lo seguro
3. Nunca referenciar o valor literal em código, prompts, ou documentação — usar sempre um placeholder como `<ADMIN_API_TOKEN>`

## Tipos expostos na Data API

Confirmado: **todos os 70+ Data Types estão expostos na Data API** (ver lista completa em `database.md`), incluindo tipos sensíveis como `Cards`, `credenciaisAPIs` e todo o módulo Consignado.

> ⚠️ Isso é um ponto de atenção para a migração: no Supabase, a API REST autogerada + RLS precisa reproduzir esse comportamento **de forma deliberada**, não por padrão — hoje qualquer tipo exposto na Data API do Bubble está sujeito apenas às Privacy Rules configuradas (ver `privacy-rules.md`). Recomenda-se, na migração, **negar por padrão** e liberar tipo a tipo, em vez de replicar "tudo exposto" do Bubble.

## API Connector — Coleções Confirmadas

| Coleção | Status | Finalidade |
|---|---|---|
| PagBank | Confirmada | Pagamentos |

> Apenas esta coleção foi completamente carregada durante a extração (mesma limitação técnica do editor SPA — ver nota em `bubble-export/data-types/extracao-2026-07.md`). Outras coleções (possivelmente Asaas, Bling, GPT) provavelmente existem mas não foram capturadas ainda.

## Como completar este documento

O API Connector do Bubble não expõe suas configurações via Data API/Workflow API (ele é meta-configuração do próprio app, não dado de negócio) — por isso a única forma de capturar os endpoints, headers e payloads reais é:

1. Abrir **Plugins → API Connector** no editor
2. Clicar em cada coleção (PagBank, e quaisquer outras que existam) para expandir
3. Para cada "API Call" dentro da coleção, capturar:
   - URL completa
   - Método (GET/POST/PUT/DELETE)
   - Headers (incluindo autenticação — mascarar valores de chave ao documentar)
   - Parâmetros/body
   - Se é usado como Action (chamada) ou Data (busca) no Bubble

## Webhooks — status

Não foi possível confirmar, na extração atual, quais Workflow API endpoints do tipo "This workflow can be run on a Public/Private API" existem e funcionam como webhooks recebidos (ex.: confirmação de pagamento). Isso precisa ser levantado na aba **Backend Workflows** do editor — ver `backend-workflows.md`.

## Integrações confirmadas fora do API Connector (via plugins dedicados)

Estas não passam pelo API Connector — têm plugin próprio (ver `integrations.md` para a lista completa):

- BubbleWhats (WhatsApp)
- PagSeguro
- ViaCEP / ViaCep JS
- Google Maps (Geocoding + Extended) / Mapbox
- Importar Excel

## Pendências

- [ ] Capturar todas as coleções do API Connector além de PagBank
- [ ] Para cada coleção, documentar URL, headers, payloads e autenticação
- [ ] Confirmar existência e configuração de webhooks recebidos (Backend Workflows expostos como API)
- [ ] Decidir estratégia de exposição de API no Supabase: negar por padrão + RLS explícita por tipo (recomendado), em vez de replicar a exposição ampla atual do Bubble

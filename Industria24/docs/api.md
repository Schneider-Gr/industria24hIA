# Bubble Data API (nativa) — Industria24h

> Este documento cobre só a **Data API nativa do Bubble** (endpoints
> autogerados para os Data Types). Para integrações externas (Asaas,
> Bling, PagBank etc.) ver `integrations.md`. Para o API Connector
> (chamadas configuradas manualmente) ver `api-connector.md`. Para
> Elasticsearch ver abaixo — ainda não confirmado como integração ativa
> nesta extração (não apareceu na lista de plugins nem de coleções do
> API Connector; mantido aqui como pendência herdada do PDF inicial).

## URLs confirmadas

| Ambiente | URL |
|---|---|
| Data API — dev | `https://industria24h.com.br/version-test/api/1.1/obj` |
| Data API — live | `https://industria24h.com.br/api/1.1/obj` |
| Workflow API — dev | `https://industria24h.com.br/version-test/api/1.1/wf` |

**Padrão de endpoint por tipo:**
```
GET    /api/1.1/obj/<data_type>
POST   /api/1.1/obj/<data_type>
PUT    /api/1.1/obj/<data_type>/<id>
DELETE /api/1.1/obj/<data_type>/<id>
```

Confirmado: **todos os 70+ Data Types** (ver `database.md`) estão expostos por padrão nesta API — inclusive tipos sensíveis (`Cards`, `credenciaisAPIs`) e todo o módulo Consignado.

## Autenticação

Via Admin API Token (ver nota de segurança em `api-connector.md` — **não versionar o valor real**).

## Elasticsearch (pendência não confirmada nesta extração)

```
POST /elasticsearch/msearch
POST /elasticsearch/mget
POST /elasticsearch/search
```

Constava no PDF de engenharia reversa inicial como usado para busca de produtos/lojas, mas **não apareceu** na lista de plugins instalados nem nas coleções do API Connector confirmadas nesta extração. Precisa validação: é possível que a busca seja feita via `Search` nativo do Bubble (sem Elasticsearch de fato), ou que a integração exista mas não tenha sido capturada.

## Migração

Cada Data Type deve virar um conjunto de rotas equivalentes via Supabase (REST autogerado + Edge Functions para regras customizadas), ou via API Agent gerando contratos OpenAPI (Prioridade 3 em `migration.md`).

> **Recomendação de segurança para a migração:** ao contrário do Bubble (que expõe todos os tipos por padrão, controlando acesso só via Privacy Rules), o Supabase deve ser configurado para **negar por padrão** e liberar explicitamente via RLS Policy tipo a tipo — especialmente crítico para `Cards`, `credenciaisAPIs` e o módulo Consignado inteiro.

## Pendências

- [ ] Confirmar se Elasticsearch está realmente em uso ou é legado do PDF inicial
- [ ] Ver `integrations.md` e `api-connector.md` para o restante das integrações (agora com dados reais confirmados)

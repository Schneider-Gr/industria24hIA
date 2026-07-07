# Integrações Externas — Industria24h

> **Fonte: extração real do editor Bubble** (lista de plugins instalados +
> referências de erro no canvas + coleções do API Connector). Substitui a
> versão anterior, que era só inferência a partir do PDF inicial.

## Plugins Instalados (lista completa e real)

| Plugin | Categoria |
|---|---|
| Air Copy to clipboard | Utilitário |
| Alert Toast Message Notify · BEP | UI/Notificação |
| **API Connector** | Integrações genéricas |
| Bootstrap Layout HTML | UI |
| Bootstrap Star Rating Input | UI |
| Bubble App Connector | Integração Bubble-Bubble |
| **BubbleWhats - WhatsApp API** | WhatsApp |
| Chart Element | UI/Dados |
| Color Picker - Simple & Beautiful | UI |
| Draggable Elements | UI |
| EasyLoop | Utilitário de workflow |
| Essential Kit - Sample Data | Dev/teste |
| Export Pdf File | Documentos |
| File Downloader | Utilitário |
| Geolocation (GPS) tracker element | Localização |
| Gerar PDF / Imprimir | Documentos |
| **Google Maps - Geocoding** | Mapas |
| **Google Maps Extended** | Mapas |
| Google Material Icons | UI |
| HeroIcons | UI |
| Horizontal text collapser | UI |
| Html2Pdf | Documentos |
| RocketImagemBase64 | Imagem |
| Importar Excel - IA Code Labs (+ versão testing) | Importação de dados |
| Input Mask | Formulário |
| Instant Calculator | Utilitário |
| Ionic Elements | UI |
| IP GeoIP Geolocation | Localização |
| ipiphy - IP Geolocation | Localização |
| JSON to CSV by Ovexlabs | Exportação de dados |
| Local Storage & Cookies | Utilitário |
| **Mapbox** | Mapas |
| Math Expression Formula Calculator | Utilitário |
| Multi-File Uploader - Dropzone | Upload |
| Multifile Uploader | Upload |
| Multiselect Dropdown | Formulário |
| **PagSeguro** | Pagamentos |
| PDF Generator | Documentos |
| Progress Bar | UI |
| RG Drag to scroll | UI |
| Rich Text Editor | Formulário |
| Slick Slideshow | UI |
| Slidebar Menu | UI |
| Toolbox | Utilitário de workflow |
| **ViaCEP** | Endereço |
| **ViaCep JS** | Endereço |
| Wonderful Image Slider | UI |

> **Confirmado, correção importante:** **Asaas e Bling não são plugins dedicados** — eles não aparecem na lista de plugins instalados. A integração com eles provavelmente acontece via **API Connector genérico** (chamadas HTTP configuradas manualmente) ou não está mais ativa. Isso contradiz a suposição do doc anterior de que seriam plugins nativos — ajustar expectativa em `api-connector.md`.

## Coleções configuradas no API Connector

Confirmado até agora:

| Coleção | Finalidade |
|---|---|
| **PagBank** | Pagamentos |

> Outras coleções podem existir no API Connector mas não foram completamente carregadas durante a extração (mesma limitação técnica do editor SPA descrita em `bubble-export/data-types/extracao-2026-07.md`). Se Asaas e Bling estão de fato em uso (havia referência a "Asaas" e "Bling" em erros do canvas — ver abaixo), a integração deles provavelmente está configurada como coleções adicionais dentro do próprio API Connector, ainda não visitadas/capturadas.

## Integrações identificadas por referência no canvas (erros/logs)

| Serviço | Evidência | Status |
|---|---|---|
| Asaas | Referência encontrada em mensagens de erro no canvas ("transferências PIX") | Uso real provável, mas não confirmado como coleção do API Connector ainda |
| Bling | Componente reutilizável "Lançar pedidos bling" existe | Uso real confirmado pela existência do componente; endpoints ainda não capturados |

## Resumo por serviço

### PagBank
**Status:** confirmado — plugin PagSeguro instalado + coleção PagBank no API Connector.
**Função:** pagamentos.

### PagSeguro
**Status:** confirmado — plugin instalado.
**Função:** pagamentos (possivelmente a mesma integração que "PagBank", já que PagBank é a nova marca do PagSeguro — **confirmar se são a mesma conta/integração ou duas distintas**).

### Asaas
**Status:** uso provável (referência em erro), não confirmado como plugin nem como coleção do API Connector.
**Função:** transferências PIX (repasse a lojistas, conforme já documentado em `business-rules.md`).
**Pendência:** localizar a coleção correspondente no API Connector.

### Bling
**Status:** uso confirmado pela existência do componente "Lançar pedidos bling".
**Função:** ERP — sincronização/lançamento de pedidos.
**Pendência:** endpoints e payloads ainda não capturados.

### WhatsApp (BubbleWhats)
**Status:** confirmado — plugin instalado, mais os Data Types `novo_aparelho_BubbleWhats` e `mensagens_enviadas_whats`.
**Função:** comunicação com clientes/lojistas.

### Google Maps / Geocoding / Mapbox
**Status:** confirmado — três plugins de mapas instalados (Google Maps Geocoding, Google Maps Extended, Mapbox). Uso duplicado (dois provedores de mapa) — **confirmar se ambos estão realmente ativos ou se um é legado**.

### ViaCEP
**Status:** confirmado — dois plugins (ViaCEP e ViaCep JS), possível redundância a resolver na migração.

### GPT Assistant
**Status:** confirmado indiretamente pelo Data Type `mensagens_gpt`. Não há plugin de IA na lista — provavelmente integrado via API Connector (chamada HTTP direta à API da OpenAI ou similar).
**Pendência:** mesma de antes — endpoint e uso ainda não mapeados.

## Pendências gerais

- [ ] Localizar e documentar todas as coleções do API Connector (só PagBank foi confirmada até agora)
- [ ] Confirmar se Asaas está de fato configurado no API Connector ou se é legado/descontinuado
- [ ] Esclarecer relação PagBank × PagSeguro (mesma conta?)
- [ ] Resolver duplicidade Google Maps × Mapbox e ViaCEP × ViaCep JS — qual está realmente em uso em produção
- [ ] Mapear onde `mensagens_gpt` é consumido (qual página/workflow)

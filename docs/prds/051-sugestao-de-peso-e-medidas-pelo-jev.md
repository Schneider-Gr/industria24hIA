---
prd_number: "051"
status: pronto
priority: média
created: 2026-09-24
issue: ""
depends_on: []
references:
  - "docs/prds/049-frete-por-tabela-da-transportadora-do-seller.md" – frete por tabela exige peso e medidas
  - "docs/prds/050-entrega-a-combinar-com-o-vendedor.md" – produto sem peso ou medidas vai para Entrega a combinar
  - "https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md" – padrão de extração com o Jev
  - "https://docs.typesafe.ai/confidence.md" – uso da confiança nas decisões
---

# PRD 051: Sugestão de peso e medidas pelo Jev

## 1. Contexto

- **Produto/área**: cadastro de produto e painel do seller.
- **Estado atual** (verificado em produção em 24/09/2026): só 58 de 127 produtos aprovados têm peso e as três medidas (altura, largura, comprimento). Por loja: Cerâmica Iguatú 2 de 41, Hidropônicos Buriti 0 de 17, Viva Ecologica 21 de 23, Revgrow7 17 de 17. Muitos nomes e descrições já trazem a informação ("Cimento CP-II 50 kg", "Porcelanato 60x60").
- A curadoria de produto pelo Jev já está em produção, e a chave TypeSafe está configurada.
- **Problema**: sem peso e medidas, o frete por tabela não funciona (PRD 049), e o produto cai em "Entrega a combinar" (PRD 050), que depende de o seller responder cada cotação. Preencher à mão dezenas de produtos é o trabalho que o seller adia.

## 2. Solução Proposta

### Visão de produto

- A plataforma lê o nome e a descrição de cada produto sem peso ou medidas e sugere peso (kg) e medidas da embalagem (cm).
- O código encontra os candidatos no texto (números com unidade: kg, g, L, ml, cm, mm, m, "60x60"); o Jev escolhe qual candidato é o peso e quais são as medidas. Nenhum número é inventado.
- O seller vê as sugestões numa lista, confirma, corrige ou descarta; só o valor confirmado vai para o cadastro.

### Decisões de produto

1. O Jev só sugere; nada vale sem confirmação do seller. Motivo: peso e medidas definem o frete cobrado, que é caminho do dinheiro (decisão da dona, 24/09).
2. É a primeira frente do Jev no frete, antes da resposta de cotação pelo WhatsApp (PRD 050) (decisão da dona, 24/09).
3. Roda em lote nos produtos sem peso ou medidas, e de novo quando um produto é criado ou editado sem esses dados *(premissa aceita pela dona em 24/09)*.
4. Unidades são convertidas pelo código (g → kg, mm e m → cm); litro não vira quilo automaticamente *(premissa aceita pela dona em 24/09; água sim, outros líquidos não)*.
5. Sugestão com confiança baixa aparece marcada "conferir com atenção", sem ser escondida *(premissa aceita pela dona em 24/09)*.

### Fora do escopo

- Estimar peso ou medidas sem o número no texto (ex.: "saco grande").
- Ler foto do produto ou da embalagem.
- Preencher sem confirmação.
- Sugerir categoria ou outros campos (já coberto pela curadoria).

## 3. Funcionalidades

### US01: Gerar sugestões de peso e medidas

Como plataforma, quero extrair peso e medidas do texto dos produtos incompletos, para que o seller só precise confirmar.

**Rules:**
- Considera produtos aprovados sem peso ou sem alguma das três medidas.
- O código lista todos os candidatos com unidade no nome e na descrição; o Jev responde, por campo, qual candidato é o peso da embalagem e quais são altura, largura e comprimento, ou "nenhum".
- Grava a sugestão com o trecho de origem e a confiança; não altera o produto.

**Edge cases:**
- Nenhum candidato no texto → sem sugestão; o produto segue na lista de pendências do PRD 049.
- Mais candidatos que o limite de uma pergunta do Jev (255) → divide por trecho do texto.
- Falha do serviço do Jev → tenta de novo no próximo lote, sem erro para o seller.

### US02: Confirmar as sugestões

Como seller, quero revisar as sugestões numa lista, para completar vários produtos em poucos minutos.

**Rules:**
- A lista mostra, por produto: nome, trecho de onde veio cada número, valor sugerido e botões Confirmar, Corrigir e Descartar; também "Confirmar todos os de alta confiança".
- Confirmar grava no cadastro do produto; o produto sai da lista e passa a entrar no frete por tabela.
- Fica na tela de pendências de transportadoras (PRD 049, US03) e no cadastro do produto.

**Edge cases:**
- Seller corrige o valor → grava o corrigido; a correção fica registrada para medir o acerto do Jev.
- Seller descarta → a sugestão não volta para aquele produto até o texto mudar.

## 4. Fluxo de Negócio

```
Produto sem peso ou medidas
   │
   ▼
Código acha números com unidade no nome e na descrição ── nenhum ──▶ pendência manual
   │
   ▼
Jev escolhe peso e medidas entre os candidatos (ou "nenhum")
   │
   ▼
Sugestão na lista do seller ──▶ Confirmar / Corrigir / Descartar
                                   │
                                   ▼
                        Cadastro atualizado ──▶ produto entra no frete por tabela
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| "Cimento CP-II 50 kg" → sugestão de peso 50 kg, com o trecho "50 kg" | Caso típico de material de construção | Rodar o lote e ver a lista |
| "Porcelanato 60x60 cm, caixa 2,5 m²" → medidas 60 × 60, sem confundir com 2,5 | Texto com vários números | Lista de sugestões |
| Texto sem número com unidade → nenhuma sugestão | Não inventar | Lista |
| Produto só muda depois de Confirmar | Controle humano | Conferir o cadastro antes e depois |
| Confirmar tira o produto da "Entrega a combinar" quando há transportadora que atende | Objetivo da feature | Página do produto |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Produtos aprovados com peso e três medidas | 58 de 127 (produção, 24/09/2026) | 90% | 30 dias após o deploy | 80% | Dona do produto |
| Sugestões confirmadas sem correção | Não existe | 85% | 30 dias após o deploy | 70% | Engenharia |
| Produtos incompletos com ao menos uma sugestão | Não existe | 60% | Primeiro lote | 40% | Engenharia |

## 6. Milestones

### Milestone 1: Seller completa peso e medidas com um clique

**Por que é um marco:** o seller completa dezenas de produtos em minutos, e eles passam a ter frete calculado.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] "Cimento CP-II 50 kg" → 50 kg, com o trecho de origem
- [ ] "Porcelanato 60x60 cm, caixa 2,5 m²" → 60 × 60, sem confundir
- [ ] Texto sem número com unidade → sem sugestão
- [ ] Produto só muda após Confirmar
- [ ] Produto confirmado sai da "Entrega a combinar" quando há transportadora

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Jev com acurácia menor em português | Médio | Confirmação obrigatória; medir correções | Monitorando |
| Peso do conteúdo diferente do peso da embalagem (ex.: 50 kg líquido, 50,5 kg bruto) | Baixo | Sugestão é ponto de partida; o seller corrige | Aceito |
| Medida do produto diferente da embalagem (ex.: porcelanato 60x60, caixa maior) | Médio | Rótulo claro "medidas da embalagem para frete"; o seller confirma | Pendente |
| Confirmação em massa sem leitura | Médio | "Confirmar todos" só para alta confiança | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Chave TypeSafe/Jev | Externa | Em produção | Toda a feature |
| PRD 049 (lista de pendências) | Interna | Rascunho | A lista pode existir só no cadastro do produto |

## 8. Referências

- [PRD 049: Frete por tabela de transportadora](./049-frete-por-tabela-da-transportadora-do-seller.md)
- [PRD 050: Entrega a combinar com o vendedor](./050-entrega-a-combinar-com-o-vendedor.md)
- [TypeSafe: extração de valores pré-parseados](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md)
- [TypeSafe: confiança](https://docs.typesafe.ai/confidence.md)

## 9. Registro de Decisões

- **2026-09-24:** Jev sugere, o seller confirma; primeira frente do Jev no frete. Motivo: destrava o frete por tabela sem arriscar valor errado.
- **2026-09-24:** Candidatos encontrados pelo código, escolha pelo Jev. Motivo: o Jev não gera números, só escolhe; assim nada é inventado.
- **2026-09-24:** Premissas pendentes: rodar em lote e em cada criação ou edição; litro não vira quilo (exceto água); baixa confiança aparece marcada.
- **2026-09-24:** `depends_on: []`. Critério: a feature funciona sozinha sobre o cadastro de produto; os PRDs 049 e 050 usam o resultado, mas esta não pressupõe nada deles.
- **2026-09-24:** Todas as premissas pendentes aceitas pela dona; status passa a pronto.

---
prd_number: "046"
status: rascunho
priority: alta
created: 2026-09-22
issue: ""
depends_on: ["030", "045"]
references:
  - docs/prds/030-vitrine-proximidade-geolocalizacao.md
  - docs/prds/045-navegacao-da-vitrine-por-mecanismos-de-economia.md
  - PRODUCT.md
  - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
---

# PRD 046: Vitrine sortida e personalizada pela última busca

## 1. Contexto

- **Produto/área**: vitrine do comprador (home) do marketplace Indústria 24h.
- **Estado atual**: os trilhos da home vêm do banco na ordem em que os produtos foram cadastrados. Quando um vendedor sobe um lote, ele ocupa o trilho inteiro: em 18/09 a galeria de venda futura era quase toda de uma única loja, e "Produtos recentes" repetia a mesma loja em seis dos doze cards. A home também não guarda nada sobre o interesse do comprador: quem busca "alface" e volta no dia seguinte vê a mesma vitrine genérica.
- **Problema**: o comprador vê menos sortimento do que existe, e as lojas menores não aparecem. Sem sinal de interesse, a home trata comprador recorrente e visitante de primeira viagem do mesmo jeito, o que desperdiça a visita de quem já demonstrou o que procura.

> Contexto técnico (cache, chaves, armazenamento) vive no TRD e nos ADRs. Aqui só comportamento e regra.

## 2. Solução Proposta

### Visão de produto

- Todo trilho de produto intercala as lojas: cada rodada mostra um produto de cada loja, e a loja com mais produtos vai para o fim, sem que nenhum produto seja descartado.
- A home guarda as últimas buscas do comprador, com o consentimento dele, e usa a mais recente para montar um trilho "Porque você buscou X".
- O comprador controla esse histórico: pode não autorizar, pode revogar e pode apagar, com efeito imediato.
- A ordem é estável entre recarregamentos: sortear a cada visita impediria o uso de cache e deixaria a vitrine mais lenta.

### Decisões de produto

1. **Intercalar, não sortear.** Ordem determinística preserva o cache da home e evita que o comprador veja a página "dançar" a cada recarregamento.
2. **Nada é descartado na intercalação.** Uma regra de "no máximo 2 por loja" encolheria o trilho onde só uma ou duas lojas têm produto, como na venda futura.
3. **Histórico no navegador, não no cadastro.** Funciona para visitante anônimo, que é a maioria, e não cria base de dados de comportamento vinculada à pessoa.
4. **Cinco termos, noventa dias.** Suficiente para reconhecer interesse recorrente sem virar arquivo de longo prazo.
5. **Só busca com resultado entra no histórico.** Busca sem resultado não é sinal de interesse aproveitável.

### Fora do escopo

- Recomendação por similaridade, histórico de compra ou produtos vistos: exige modelo e base de dados que não existem hoje.
- Personalização por categoria navegada, apenas por termo buscado *(premissa — confirme ou corrija)*.
- Personalização das páginas de categoria, loja e produto: este PRD trata da home.
- Sincronização do histórico entre aparelhos, que exigiria vincular o dado à conta.

## 3. Funcionalidades

### US01: Trilhos com as lojas intercaladas

Como comprador, quero ver produtos de lojas diferentes em cada trilho, para conhecer o sortimento real da plataforma.

**Rules:**
- Em cada trilho, a ordem alterna as lojas: a primeira rodada traz o primeiro produto de cada loja, a segunda rodada o segundo, e assim por diante.
- Nenhum produto é removido pela intercalação; a loja com mais produtos ocupa o fim do trilho.
- A ordem é a mesma entre recarregamentos, enquanto o catálogo não mudar.
- Vale para produtos recentes, desconto por volume, supermercado e a galeria de venda futura. As datas da venda futura seguem por data, não por loja.

**Edge cases:**
- Todos os produtos do trilho são da mesma loja → o trilho mantém a ordem original, sem alteração visível.
- Produto entra no catálogo entre uma visita e outra → aparece ao fim da ordem vigente até o próximo recálculo, nunca desaparece.

### US02: Histórico das últimas buscas

Como comprador, quero que o site lembre o que procurei, para não recomeçar do zero na próxima visita.

**Rules:**
- O termo buscado entra no histórico apenas quando a busca retorna ao menos um resultado.
- O histórico guarda no máximo cinco termos, do mais recente para o mais antigo, sem repetir o mesmo termo.
- O histórico só é gravado com consentimento explícito do comprador para cookies de personalização.
- O histórico expira em noventa dias.

**Edge cases:**
- Comprador recusa os cookies de personalização → nada é gravado, e a home segue sem o trilho personalizado.
- Comprador revoga o consentimento depois → o histórico é apagado no ato.
- Termo com menos de dois caracteres → não entra no histórico.

### US03: Trilho "Porque você buscou"

Como comprador, quero ver produtos ligados à minha última busca, para retomar de onde parei.

**Rules:**
- Com histórico disponível, a home mostra um trilho com o termo mais recente no título, exibindo produtos cujo nome contém o termo.
- O trilho respeita a cobertura por CEP e a intercalação de lojas, como qualquer outro trilho.
- Sem histórico, ou sem produto correspondente ao termo, o trilho não aparece; a home não mostra um trilho vazio.

**Edge cases:**
- Termo que só encontra produto fora da faixa de CEP → o trilho não aparece.
- Termo que o comprador buscou por engano → ele apaga o histórico e o trilho some na próxima visita.

### US04: Controle do histórico pelo comprador

Como comprador, quero decidir sobre o meu histórico, para manter o controle dos meus dados.

**Rules:**
- Existe uma página pública que explica o que é guardado, para quê e por quanto tempo.
- Nessa página o comprador pode autorizar, recusar e apagar o histórico, com efeito imediato.
- Recusar a personalização apaga o histórico existente.

**Edge cases:**
- Comprador apaga o histórico com a home aberta em outra aba → a outra aba volta ao estado sem personalização no próximo carregamento *(premissa — confirme ou corrija)*.
- Navegador bloqueia cookies → o site funciona normalmente, apenas sem o trilho personalizado.

## 4. Fluxo de Negócio

```
Comprador busca um termo
   │
   ▼
Busca teve resultado?
   ├── não ─▶ nada é guardado
   └── sim ─▶ Consentimento de personalização dado?
                 ├── não ─▶ nada é guardado
                 └── sim ─▶ Termo entra no histórico (máx. 5, 90 dias)
                                │
                                ▼
                      Próxima visita à home
                                │
                                ▼
                 Existe produto para o termo no CEP?
                    ├── não ─▶ home sem trilho personalizado
                    └── sim ─▶ trilho "Porque você buscou X"
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| Nenhum trilho exibe mais de dois produtos seguidos da mesma loja, havendo outras lojas com produto | Uma loja ocupava o trilho inteiro e escondia as demais | Abrir a home e conferir a sequência de lojas em cada trilho |
| A ordem dos trilhos é a mesma em dois carregamentos seguidos | Ordem instável impede cache e confunde quem volta | Recarregar a home e comparar a ordem |
| Sem consentimento, nenhum termo é gravado | Exigência legal (LGPD, art. 7º, I) | Buscar sem aceitar cookies e inspecionar o armazenamento do navegador |
| Com consentimento, a home exibe o trilho do termo mais recente | É a entrega visível da personalização | Buscar um termo com resultado e voltar à home |
| Apagar o histórico remove o trilho na visita seguinte | Direito de eliminação (LGPD, art. 18) | Apagar pela página de privacidade e recarregar a home |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Lojas distintas nos doze primeiros cards de "Produtos recentes" | 4 lojas (medição 18/09) | ≥ 8 lojas | Na entrega | ≥ 6 lojas | Dona do produto |
| Compradores que aceitam os cookies de personalização | A levantar (sem instrumentação; responsável: dona; prazo: 15 dias) | ≥ 50% | 30 dias após o baseline | ≥ 30% | Dona do produto |
| Cliques em produto vindos do trilho "Porque você buscou" | A levantar (sem instrumentação; responsável: dona; prazo: 15 dias) | Acima da média dos demais trilhos | 30 dias após o baseline | Qualquer volume acima de zero | Dona do produto |

## 6. Milestones

### Milestone 1: Mostrar o sortimento real em todo trilho

**Por que é um marco:** o comprador passa a ver produtos de várias indústrias em cada trilho, e as lojas menores deixam de ficar invisíveis atrás de quem subiu lote grande.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] Nenhum trilho mostra mais de dois produtos seguidos da mesma loja havendo alternativa
- [ ] A ordem se mantém entre dois carregamentos seguidos
- [ ] O número de lojas distintas nos doze primeiros cards atinge a meta de 5b

**Aprovador:** dona do produto

### Milestone 2: Reconhecer o interesse de quem volta

**Por que é um marco:** a home deixa de ser igual para todos e passa a retomar o que o comprador procurou, com o consentimento dele e com controle na mão dele.

**Funcionalidades:** US02, US03, US04

**Checklist de aceite:**
- [ ] Sem consentimento, nenhum termo é gravado
- [ ] Com consentimento, o trilho do termo mais recente aparece na home
- [ ] Apagar o histórico remove o trilho na visita seguinte

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|---|---|---|---|
| Baixa taxa de aceite dos cookies deixa a personalização sem alcance | Médio | O aviso explica o benefício em uma frase; medir a taxa antes de investir mais na feature | Monitorando |
| Busca por nome traz produto pouco relacionado ao termo | Médio | O trilho é secundário na página; se a relevância decepcionar, restringir a categoria do termo | Monitorando |
| Ordem estável envelhece: mesmo comprador vê o mesmo topo por dias | Baixo | A ordem acompanha a janela de atualização do catálogo | Monitorando |
| Interpretação jurídica do histórico de busca como dado pessoal | Médio | Página pública com finalidade, prazo e direito de eliminação; revisão jurídica pendente | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|---|---|---|---|
| Cobertura por faixa de CEP (PRD 030) | Interna | Em produção | Sem ela o trilho personalizado pode exibir produto que não chega ao comprador |
| Navegação da vitrine (PRD 045) | Interna | Rascunho | O trilho personalizado ocupa um lugar na ordem de seções definida lá |
| Revisão jurídica do texto de privacidade | Externa | Pendente | Bloqueia US04 se a redação precisar mudar |

## 8. Referências

- [PRD 030](030-vitrine-proximidade-geolocalizacao.md) — cobertura e proximidade por CEP, respeitadas por todo trilho
- [PRD 045](045-navegacao-da-vitrine-por-mecanismos-de-economia.md) — ordem das seções da home onde o trilho personalizado entra
- [PRODUCT.md](../../PRODUCT.md) — princípio "produto antes de loja" e público da vitrine
- [Lei 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — consentimento (art. 7º, I) e eliminação (art. 18)

## 9. Registro de Decisões

- **2026-09-18:** Trilhos passam a intercalar lojas em vez de seguir a ordem do banco. Motivo: uma loja com lote grande ocupava o trilho inteiro e escondia as demais.
- **2026-09-18:** Ordem determinística em vez de sorteio. Motivo: sorteio a cada visita inviabiliza o cache da home e deixa a vitrine mais lenta.
- **2026-09-18:** Histórico guardado no navegador, limitado a cinco termos e noventa dias, e só com consentimento. Motivo: atende o visitante anônimo, que é a maioria, sem criar base de comportamento vinculada à pessoa.
- **2026-09-19:** Regra de "máximo dois por loja" descartada em favor da intercalação sem descarte. Motivo: encolhia trilhos em que poucas lojas têm produto, como a venda futura.
- **2026-09-22:** `depends_on` fixado em 030 e 045. Critério: o trilho personalizado aplica a regra de cobertura do 030 e ocupa posição na ordem de seções definida no 045.

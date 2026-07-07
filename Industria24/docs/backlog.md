# Backlog priorizado por valor — Industria24h

> Contexto de decisão (2026-07-06): app em **piloto de baixo volume** (transaciona
> pouco) e objetivo do rebuild é **desligar o Bubble** com migração fiel dos fluxos.
> Fonte de verdade técnica: `database.md`, `business-rules.md`, `migration.md`.
> Confiança marcada como (a) fato dos docs, (b) prática consolidada, (c) inferência
> minha, (d) incerteza que precisa de você.

## 1. Modelo de valor (por que a ordem é essa)

Com o objetivo "matar o Bubble", **valor é uma função-degrau, não incremental.**
Você continua pagando o Bubble (~$134/mês) e mantendo dois sistemas até o último
fluxo que gera/opera receita rodar no Next/Supabase. Migrar 60% dos fluxos não
economiza 60% do custo: economiza zero, porque o Bubble segue ligado.

Três consequências que orientam todo o backlog:

1. **O alvo é o cutover, não a feature bonita.** Priorizar o caminho crítico que
   permite desligar o Bubble o quanto antes, cortando escopo agressivamente.
   Qualquer coisa que possa ficar manual no piloto, ou ser migrada *depois* do
   cutover sem parar receita, sai da fase 1.
2. **Baixo volume é uma alavanca.** (c) A migração de dados é barata (poucos
   registros) e dá pra fazer *cutover duro* por não haver histórico gigante nem
   necessidade de sincronização dual-run complexa. Não gastar esforço em ETL
   incremental sofisticado.
3. **Ordenar por Custo de Atraso ÷ Esforço.** O Custo de Atraso aqui é dominado
   por duas perguntas: *isto bloqueia o desligamento do Bubble?* e *isto toca o
   caminho do dinheiro (GMV + os 5% da plataforma + o repasse ao seller)?*

## 2. Caminho do dinheiro (a espinha dorsal)

De `business-rules.md`, o fluxo que precisa existir ponta a ponta:

```
Autenticar → Catálogo (achar produto) → Carrinho → Checkout+Frete →
Pagamento → Pedido → Repasse (seller 95% / Ind24 5%) → Entrega
```

Tudo que não está nessa linha é suporte e desce na prioridade.

## 3. Mapa de épicos (com os Data Types reais)

| # | Épico | Data Types / integrações reais | Por que tem valor |
|---|---|---|---|
| **E0** | **Schema real + ETL** (enabler) | Extrair campos reais via Data API: `Produto_ecommerce`, `Loja_ecommerce`, `CategoriaProdutos`, `SubCategoria`, `User`, `endereco_user`, `Carrinho 0.1`, `LinhaItem`, `PedidosVendedor`, `item_para_compra`, `FaixaDeCEP`, `Transportadora`, `Promocaoprogressiva`, `venda.futura`, `marketplace`, `imgBanner` | **Bloqueia 100% do resto.** Regra do projeto proíbe inventar schema; hoje só `acessos` está confirmado. Sem isto, valor = 0. |
| **E1** | Autenticação + papéis | `User`, 6 fluxos de login → Supabase Auth + roles (comprador, seller, admin, afiliado, transportadora, fulfillment) | Precondição de qualquer fluxo com usuário. |
| **E2** | Catálogo + aprovação | `Loja_ecommerce`, `CategoriaProdutos`, `SubCategoria`, `Produto_ecommerce`, `imgBanner`, `Promocaoprogressiva`, oferta do dia; admin aprova (`StatusProduto=Aprovado`) | Sem catálogo não há o que comprar. Maior habilitador de GMV. |
| **E3** | Carrinho + Checkout + Frete | `Carrinho 0.1`, `item_para_compra`, `FaixaDeCEP` (CEP/peso/categoria), `endereco_user`, ViaCEP, `ValorPedidoMinimo`, retirada na loja | Funil de conversão. GMV direto. |
| **E4** | Pagamento | PagBank (única coleção confirmada), status `PAGO` parcial/total em `LinhaItem`, tokenização | O dinheiro entra. Caminho crítico. **Risco PCI** (ver §6). |
| **E5** | Pedido + Repasse | `PedidosVendedor`, `LinhaItem` (`RepasseInd24` 5%, `RepasseAfiliado`), estados do pedido, repasse via Asaas PIX ou manual, Bling (lançar pedido no ERP) | Fecha o ciclo: seller recebe e a plataforma realiza os 5%. Sem isto, seller abandona. |
| **E6** | Logística / entrega | `Transportadora`, `Rota_transportadora`, `Centrodedistribuicao`, `relacao_produto_CD`, `CSVTransportadora`, painéis entregador/transportadora | Cumpre a entrega. (c) No piloto pode nascer parcialmente manual. |
| **E7** | Afiliados | `Relacao_Afiliado_Loja`, `ecom.relacao_promotor_loja`, `PercentualAfiliado` | Afeta o repasse, mas não bloqueia a compra. Adiável. |
| **E8** | Comunicação | `notificacao`, `mensagem`, WhatsApp (BubbleWhats), `mensagens_gpt` | Retenção, não aquisição. Adiável / pode seguir no Bubble temporariamente. |
| **E9** | Consignado + Crédito | 20+ tipos `Consig.*`, `solicitacao_de_credito` e afins | (a) Marcados Fase 2 nos docs. (d) **Só sobem se transacionarem no piloto** (ver §6). |

## 4. Priorização

Score: **Bloqueia cutover** (o Bubble não desliga sem isto?), **Caminho do dinheiro**,
**Esforço** (grosseiro, sobe porque o schema é incerto), **Risco**. Prioridade =
alto valor/bloqueio ÷ esforço.

| Épico | Bloqueia cutover | Caminho $ | Esforço | Risco | Prioridade |
|---|---|---|---|---|---|
| E0 Schema+ETL | **Sim (tudo)** | indireto | M | Baixo | **P0** |
| E1 Auth | Sim | precond. | M | Médio | **P0** |
| E2 Catálogo | Sim | Sim | G | Baixo | **P1** |
| E3 Carrinho/Checkout/Frete | Sim | Sim | G | Médio (frete) | **P1** |
| E4 Pagamento | Sim | Sim | M | **Alto (PCI + descoberta)** | **P1** |
| E5 Pedido/Repasse | Sim | Sim | G | Médio (Asaas/Bling) | **P1** |
| E6 Logística | (c) Parcial | Sim | G | Médio | **P2** |
| E7 Afiliados | (d) Depende | apoio | M | Baixo | **P2** |
| E8 Comunicação | Não | Não | M | Baixo | **P3** |
| E9 Consignado/Crédito | (d) Depende | (d) | GG | Alto | **P3** (ou P1 se transaciona) |

## 5. Linha de corte do cutover

**Para desligar o Bubble, precisa estar no Next (mínimo):** E0 + E1 + E2 + E3 +
E4 + E5, dados migrados, e E6 no nível mínimo que garante entrega (mesmo que a
operação de logística fique semimanual no piloto). Esse é o **MVP de cutover**.

**Pode migrar depois do cutover, sem parar receita:** E7 (afiliados), E8
(comunicação). Só é seguro deixar para depois se esses fluxos *não* forem
condição para pagar seller ou entregar pedido no piloto.

**Fica fora até decisão:** E9. Se consignado/crédito não transacionam no piloto,
não entram no cutover (migra depois ou descontinua). Se transacionam, viram P1 e
o cutover não acontece sem eles.

## 6. Riscos e decisões abertas que mudam a ordem

1. **(d) Consignado e Crédito transacionam no piloto?** Esta é a decisão que mais
   mexe no backlog. Se sim, E9 sai de P3 e vira bloqueador de cutover (é 20+
   tipos, esforço GG). Se não, o cutover fica muito mais rápido.
2. **(a) Risco PCI em `Cards`/`CardTime`.** Se guardam PAN/CVV, é exposição de
   compliance que não se migra como está: E4 obriga tokenização via gateway
   (PagBank/Asaas), nunca armazenar cartão. Confirmar a natureza desses tipos
   antes de tocar em pagamento.
3. **(a) Só PagBank está confirmado no API Connector.** Asaas (PIX/repasse) e
   Bling (ERP) aparecem em erros/labels do canvas mas a configuração não foi
   capturada. E4 e E5 têm risco de descoberta: a primeira tarefa de cada um é
   capturar a config real da integração, não codar direto.
4. **(a) Privacy Rules ainda não capturadas.** O RLS de cada tabela depende
   delas. E0 não termina só com os campos: precisa da regra de acesso real, senão
   as tabelas nascem deny-by-default e travam queries legítimas (como já acontece
   em `/acessos` hoje).
5. **(c) Afiliados no repasse.** `LinhaItem` tem `RepasseAfiliado`. Se algum
   pedido do piloto usa link de afiliado, E7 acopla em E5 (o cálculo de repasse
   precisa do percentual do afiliado) e não é tão adiável quanto parece.

## 7. Sequência recomendada (ondas)

- **Onda 1 (destrava tudo):** E0. Extrair schema real da Data API dos ~16 tipos do
  caminho do dinheiro + Privacy Rules, gerar Prisma/Supabase confirmado, montar o
  ETL. Nada de UI de marketplace antes disto.
- **Onda 2 (esqueleto transacionável):** E1 + E2. Login e catálogo com aprovação.
  Primeiro estado em que dá pra "ver um produto logado".
- **Onda 3 (o dinheiro):** E3 → E4 → E5, nessa ordem, cada um começando pela
  captura da integração real. Ao fim da onda 3 existe um pedido pago com repasse.
- **Onda 4 (cutover):** E6 mínimo + migração final de dados + virada dos usuários
  do piloto. Desligar o Bubble.
- **Onda 5 (pós-cutover):** E7, E8 e o que sobrou de E6. E9 conforme decisão §6.1.
